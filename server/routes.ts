import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { elasticsearchStorage } from "./storage-elasticsearch";
import { elasticsearch } from "./services/elasticsearch";
// RAG service removed - using OpenAI directly
import { openai } from "./services/openai";
import { dataGenerator } from "./services/data-generator";
import { customerGenerator } from "./services/customer-generator";
import { insertLoanApplicationSchema, insertDocumentSchema, insertChatMessageSchema } from "@shared/schema";
import { fixCustomerData } from "./fix-customer-data";
import multer from "multer";
import { z } from "zod";

const upload = multer({ dest: 'uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Elasticsearch and generate sample data on startup
  setTimeout(async () => {
    try {
      await elasticsearch.initializeIndices();
      console.log('Elasticsearch initialized successfully');
    } catch (error) {
      console.warn('Elasticsearch not available, running in fallback mode:', (error as Error).message);
    }

    // Initialize sample users in Elasticsearch if none exist
    try {
      const existingUsers = await elasticsearchStorage.getAllLoanApplications();
      if (existingUsers.length === 0) {
        console.log('Initializing sample users in Elasticsearch...');
        
        // Create sample users with specific IDs that match customerIds in applications
        const sampleUsers = [
          { username: "alice.smith", password: "password123", email: "alice.smith@email.com", role: "customer", firstName: "Alice", lastName: "Smith", phone: "555-0101" },
          { username: "bob.johnson", password: "password123", email: "bob.johnson@email.com", role: "customer", firstName: "Bob", lastName: "Johnson", phone: "555-0102" },
          { username: "carol.davis", password: "password123", email: "carol.davis@email.com", role: "customer", firstName: "Carol", lastName: "Davis", phone: "555-0103" },
          { username: "david.wilson", password: "password123", email: "david.wilson@email.com", role: "customer", firstName: "David", lastName: "Wilson", phone: "555-0104" },
          { username: "emily.brown", password: "password123", email: "emily.brown@email.com", role: "customer", firstName: "Emily", lastName: "Brown", phone: "555-0105" },
          { username: "frank.miller", password: "password123", email: "frank.miller@email.com", role: "customer", firstName: "Frank", lastName: "Miller", phone: "555-0106" },
          { username: "grace.taylor", password: "password123", email: "grace.taylor@email.com", role: "customer", firstName: "Grace", lastName: "Taylor", phone: "555-0107" },
          { username: "henry.anderson", password: "password123", email: "henry.anderson@email.com", role: "customer", firstName: "Henry", lastName: "Anderson", phone: "555-0108" },
          { username: "john.doe", password: "password123", email: "john.doe@bank.com", role: "loan_officer", firstName: "John", lastName: "Doe", phone: "555-0201" },
        ];

        for (const user of sampleUsers) {
          await elasticsearchStorage.createUser(user);
        }
        console.log('Sample users created in Elasticsearch');
      }
    } catch (error) {
      console.warn('Failed to initialize sample users in Elasticsearch:', error);
    }

    // Check if we need to generate initial data
    try {
      let applications;
      try {
        applications = await elasticsearchStorage.getAllLoanApplications();
      } catch (error) {
        applications = await storage.getAllLoanApplications();
      }

      if (applications.length < 100) {
        console.log('Generating initial customer and loan application data...');
        // Generate 100 customers with 1000 loan applications each
        await customerGenerator.generateCustomersAndLoans(100, 1000);
        console.log('Initial data generation completed');
      } else {
        console.log(`Found ${applications.length} existing applications, skipping data generation`);
      }
    } catch (error) {
      console.error('Failed to generate initial data:', error);
    }
  }, 2000); // Initialize after server starts

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const esHealth = await elasticsearch.ping();
      res.json({ 
        status: "OK", 
        elasticsearch: esHealth ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // Fix customer data endpoint
  app.post("/api/fix-data", async (req, res) => {
    try {
      await fixCustomerData();
      res.json({ message: "Customer data fixed successfully" });
    } catch (error) {
      console.error("Failed to fix customer data:", error);
      res.status(500).json({ error: "Failed to fix customer data" });
    }
  });

  // Generate new data endpoint
  app.post("/api/generate-data", async (req, res) => {
    try {
      const { customers = 100, loansPerCustomer = 1000 } = req.body;
      console.log(`Generating ${customers} customers with ${loansPerCustomer} loans each...`);
      
      await customerGenerator.generateCustomersAndLoans(customers, loansPerCustomer);
      
      res.json({ 
        message: `Successfully generated ${customers} customers and ${customers * loansPerCustomer} loan applications`,
        customers: customers,
        loansPerCustomer: loansPerCustomer,
        totalLoans: customers * loansPerCustomer
      });
    } catch (error) {
      console.error("Failed to generate data:", error);
      res.status(500).json({ error: "Failed to generate data" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      // Try to get from Elasticsearch first, fallback to memory storage
      let applications;
      try {
        applications = await elasticsearchStorage.getAllLoanApplications();
        if (applications.length === 0) {
          applications = await storage.getAllLoanApplications();
        }
      } catch (error) {
        console.warn('Elasticsearch failed for metrics, using memory storage:', error);
        applications = await storage.getAllLoanApplications();
      }
      
      const totalApplications = applications.length;
      const approvedLoans = applications.filter(app => app.status === "approved").length;
      const totalPortfolio = applications
        .filter(app => app.status === "approved" || app.status === "disbursed")
        .reduce((sum, app) => sum + parseFloat(app.amount), 0);
      const pendingReview = applications.filter(app => app.status === "under_review").length;

      res.json({
        totalApplications,
        approvedLoans,
        totalPortfolio,
        pendingReview,
        approvalRate: totalApplications > 0 ? (approvedLoans / totalApplications * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Search loan applications
  app.get("/api/search/applications", async (req, res) => {
    try {
      const { query, type, status, minAmount, maxAmount, page = 1, limit = 10 } = req.query;
      
      const filters: any = {};
      if (type) filters.loanType = type;
      if (status) filters.status = status;
      
      const results = await rag.searchLoanApplications(
        query as string || "",
        filters,
        parseInt(limit as string)
      );

      res.json({
        results,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: results.length
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Get all loan applications with pagination
  app.get("/api/applications", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const maxRecords = 100; // Limit to 100 records as requested
      
      // Try to get from Elasticsearch first, fallback to memory storage
      let applications;
      let useElasticsearch = false;
      
      try {
        applications = await elasticsearchStorage.getAllLoanApplications();
        if (applications.length > 0) {
          useElasticsearch = true;
          console.log(`Retrieved ${applications.length} applications from Elasticsearch`);
        } else {
          applications = await storage.getAllLoanApplications();
          console.log(`Fallback: Retrieved ${applications.length} applications from memory storage`);
        }
      } catch (error) {
        console.warn('Elasticsearch failed, using memory storage:', error);
        applications = await storage.getAllLoanApplications();
      }
      
      // Limit to max records first
      const limitedApplications = applications.slice(0, maxRecords);
      
      // Use customer data already stored in applications or fallback to user lookup
      const enrichedApplications = await Promise.all(
        limitedApplications.map(async (app) => {
          // Check if customer name and email are already in the application
          if (app.customerName && app.customerEmail) {
            return {
              ...app,
              customerName: app.customerName,
              customerEmail: app.customerEmail
            };
          }
          
          // Fallback to user lookup if customer data is not in application
          let customer;
          try {
            customer = useElasticsearch ? 
              await elasticsearchStorage.getUser(app.customerId) : 
              await storage.getUser(app.customerId);
          } catch (error) {
            console.warn(`Invalid user ID: ${app.customerId}`);
            customer = null;
          }
          
          return {
            ...app,
            customerName: customer ? `${customer.firstName} ${customer.lastName}` : "Unknown Customer",
            customerEmail: customer?.email || "no-email@unknown.com"
          };
        })
      );

      // For backward compatibility, return just the array if no pagination params
      if (!req.query.page && !req.query.limit) {
        res.json(enrichedApplications);
      } else {
        // Apply pagination
        const offset = (page - 1) * limit;
        const paginatedApplications = enrichedApplications.slice(offset, offset + limit);
        
        res.json({
          applications: paginatedApplications,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(enrichedApplications.length / limit),
            totalRecords: enrichedApplications.length,
            maxRecords: maxRecords,
            hasMore: applications.length > maxRecords
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Get single loan application
  app.get("/api/applications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getLoanApplication(parseInt(id));
      
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const customer = await storage.getUser(application.customerId);
      const documents = await storage.getDocumentsByApplication(application.id);

      res.json({
        ...application,
        customer,
        documents
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  // Create loan application
  app.post("/api/applications", async (req, res) => {
    try {
      // Create a custom validation schema that handles both string and number customerId
      const apiLoanApplicationSchema = insertLoanApplicationSchema.extend({
        customerId: z.union([z.string(), z.number()]).transform(val => 
          typeof val === 'string' ? val : val.toString()
        ),
        custId: z.string().optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        income: z.string().optional(),
        purpose: z.string().optional(),
        collateral: z.string().optional(),
      });
      
      const validatedData = apiLoanApplicationSchema.parse(req.body);
      
      // Try to create in Elasticsearch first, fallback to memory storage
      let application;
      try {
        application = await elasticsearchStorage.createLoanApplication(validatedData);
        console.log(`Created application ${application.id} in Elasticsearch`);
      } catch (error) {
        console.warn('Failed to create in Elasticsearch, using memory storage:', error);
        application = await storage.createLoanApplication(validatedData);
      }

      res.status(201).json(application);
    } catch (error) {
      console.error('Failed to create loan application:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Update loan application
  app.patch("/api/applications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const application = await storage.updateLoanApplication(parseInt(id), updates);
      
      // RAG re-indexing removed

      res.json(application);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Upload document
  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { applicationId, documentType } = req.body;
      
      // In a real app, you would store the file in cloud storage
      // For now, we'll just simulate the document processing
      const mockExtractedText = `This is extracted text from ${req.file.originalname}`;
      
      const document = await storage.createDocument({
        applicationId: parseInt(applicationId),
        documentType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        extractedText: mockExtractedText
      });

      // Analyze document with OpenAI
      const analysis = await openai.analyzeDocument(mockExtractedText);
      
      // Index in Elasticsearch
      await rag.indexDocument(document);

      res.status(201).json({
        ...document,
        analysis
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Get documents for application
  app.get("/api/applications/:id/documents", async (req, res) => {
    try {
      const { id } = req.params;
      const documents = await storage.getDocumentsByApplication(parseInt(id));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      // Try to get customers from Elasticsearch first, fallback to memory storage
      let customers;
      try {
        customers = await elasticsearchStorage.getAllCustomers();
        console.log(`Retrieved ${customers.length} customers from Elasticsearch`);
        
        // Enrich each customer with recent loans data
        const enrichedCustomers = await Promise.all(
          customers.map(async (customer) => {
            try {
              const customerWithStats = await elasticsearchStorage.getCustomerWithStats(customer.custId);
              return {
                ...customer,
                recentLoans: customerWithStats?.recentLoans || []
              };
            } catch (error) {
              console.error(`Failed to get loans for customer ${customer.custId}:`, error);
              return {
                ...customer,
                recentLoans: []
              };
            }
          })
        );
        
        customers = enrichedCustomers;
      } catch (error) {
        console.warn('Elasticsearch failed for customers, using memory storage:', error);
        // Get users with role 'customer' from memory storage
        const allUsers = await storage.getAllLoanApplications(); // Using applications to get user data
        customers = allUsers.map(app => ({
          id: app.customerId,
          custId: app.custId || app.customerId,
          firstName: app.customerName?.split(' ')[0] || 'Unknown',
          lastName: app.customerName?.split(' ')[1] || 'Customer',
          email: app.customerEmail || 'unknown@email.com',
          totalLoans: 1,
          totalAmount: parseFloat(app.amount || '0'),
          activeLoans: app.status === 'approved' || app.status === 'disbursed' ? 1 : 0,
          creditScore: app.riskScore || 750,
          riskLevel: app.riskScore && app.riskScore > 700 ? 'low' : app.riskScore && app.riskScore > 600 ? 'medium' : 'high',
          recentLoans: [{
            id: app.id,
            applicationId: app.applicationId,
            status: app.status,
            amount: app.amount,
            loanType: app.loanType
          }]
        }));
        // Remove duplicates
        customers = customers.filter((customer, index, self) => 
          index === self.findIndex(c => c.custId === customer.custId)
        );
      }
      
      res.json(customers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Try to get customer with stats from Elasticsearch first
      let customer;
      try {
        customer = await elasticsearchStorage.getCustomerWithStats(id);
      } catch (error) {
        console.warn('Elasticsearch failed for customer details, using memory storage:', error);
        // Fallback to memory storage
        const user = await storage.getUser(parseInt(id));
        const loans = await storage.getLoanApplicationsByCustomer(parseInt(id));
        
        if (user) {
          customer = {
            ...user,
            totalLoans: loans.length,
            totalAmount: loans.reduce((sum, loan) => sum + parseFloat(loan.amount || '0'), 0),
            activeLoans: loans.filter(loan => loan.status === 'approved' || loan.status === 'disbursed').length,
            creditScore: 750,
            riskLevel: 'medium',
            recentLoans: loans.slice(0, 5)
          };
        }
      }
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // Chat with OpenAI for natural language processing
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Enhanced natural language processing for loan queries
      const result = await openai.processLoanQuery(message, userId || 1);
      
      // Store chat message in Elasticsearch if available, fallback to memory
      try {
        await elasticsearchStorage.createChatMessage({
          userId: userId || 1,
          message,
          response: result.response
        });
      } catch (error) {
        console.warn('Failed to store chat in Elasticsearch, using memory storage:', error);
        await storage.createChatMessage({
          userId: userId || 1,
          message,
          response: result.response
        });
      }

      res.json({
        response: result.response,
        loans: result.loans || [],
        metadata: result.metadata || {}
      });
    } catch (error) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/chat/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const messages = await storage.getChatMessagesByUser(parseInt(userId));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Advanced search endpoint
  app.post("/api/search", async (req, res) => {
    try {
      const { query, filters, searchType = "hybrid" } = req.body;
      
      let results;
      if (searchType === "semantic") {
        const embedding = await openai.generateEmbedding(query);
        results = await elasticsearch.vectorSearch("loan_applications", embedding);
      } else {
        results = await elasticsearch.hybridSearch("loan_applications", query, filters);
      }

      res.json({
        results: results.hits.hits,
        total: results.hits.total.value,
        searchType,
        query
      });
    } catch (error) {
      res.status(500).json({ error: "Advanced search failed" });
    }
  });

  // Generate sample data endpoint
  app.post("/api/generate-sample-data", async (req, res) => {
    try {
      const { count = 100000 } = req.body;
      
      // Start data generation in background
      dataGenerator.generateLoanApplications(count).catch(console.error);
      
      res.json({ 
        message: `Started generating ${count} loan applications in background`,
        status: "in_progress"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to start data generation" });
    }
  });

  // Check data generation status
  app.get("/api/data-status", async (req, res) => {
    try {
      const applications = await storage.getAllLoanApplications();
      res.json({
        totalApplications: applications.length,
        lastGenerated: applications.length > 0 ? applications[applications.length - 1].createdAt : null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get data status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
