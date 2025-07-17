import { users, loanApplications, documents, chatMessages, type User, type InsertUser, type LoanApplication, type InsertLoanApplication, type Document, type InsertDocument, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { elasticsearch } from "./services/elasticsearch";
import type { IStorage } from "./storage";

export class ElasticsearchStorage implements IStorage {
  private currentUserId: number = 1;
  private currentApplicationId: number = 1;
  private currentDocumentId: number = 1;
  private currentChatMessageId: number = 1;

  constructor() {
    // Initialize with some counter values
    this.initializeCounters();
  }

  private async initializeCounters(): Promise<void> {
    try {
      // Get the highest IDs from each index to set counters
      const users = await elasticsearch.getAllDocuments('users', 1);
      const applications = await elasticsearch.getAllDocuments('loan_applications', 1);
      const docs = await elasticsearch.getAllDocuments('documents', 1);
      const messages = await elasticsearch.getAllDocuments('chat_messages', 1);

      if (users.length > 0) {
        this.currentUserId = Math.max(...users.map(u => u.id)) + 1;
      }
      if (applications.length > 0) {
        this.currentApplicationId = Math.max(...applications.map(a => a.id)) + 1;
      }
      if (docs.length > 0) {
        this.currentDocumentId = Math.max(...docs.map(d => d.id)) + 1;
      }
      if (messages.length > 0) {
        this.currentChatMessageId = Math.max(...messages.map(m => m.id)) + 1;
      }
    } catch (error) {
      console.warn('Failed to initialize counters from Elasticsearch:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      if (!id || isNaN(id)) {
        console.warn(`Invalid user ID: ${id}`);
        return undefined;
      }
      const result = await elasticsearch.getDocument('users', id.toString());
      return result || undefined;
    } catch (error) {
      console.error('Failed to get user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const response = await elasticsearch.search('users', {
        query: {
          term: { username: username }
        },
        size: 1
      });
      
      if (response.hits.hits.length > 0) {
        const hit = response.hits.hits[0];
        return { id: hit._id, ...hit._source };
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || 'customer',
      phone: insertUser.phone || null,
      createdAt: new Date() 
    };

    try {
      await elasticsearch.indexDocument('users', id.toString(), user);
      
      // Also index in customers index if it's a customer
      if (user.role === 'customer') {
        const customerDoc = {
          id: id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          createdAt: user.createdAt.toISOString(),
          totalLoans: 0,
          totalAmount: 0,
          activeLoans: 0,
          creditScore: 750, // Default credit score
          riskLevel: 'medium'
        };
        await elasticsearch.indexDocument('customers', id.toString(), customerDoc);
      }
      
      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  // Loan Application methods
  async getLoanApplication(id: number): Promise<LoanApplication | undefined> {
    try {
      const result = await elasticsearch.getDocument('loan_applications', id.toString());
      return result || undefined;
    } catch (error) {
      console.error('Failed to get loan application:', error);
      return undefined;
    }
  }

  async getLoanApplicationsByCustomer(customerId: number): Promise<LoanApplication[]> {
    try {
      const response = await elasticsearch.search('loan_applications', {
        query: {
          term: { customerId: customerId }
        },
        size: 100
      });
      
      return response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));
    } catch (error) {
      console.error('Failed to get loan applications by customer:', error);
      return [];
    }
  }

  async createLoanApplication(insertApplication: InsertLoanApplication): Promise<LoanApplication> {
    const id = this.currentApplicationId++;
    const application: LoanApplication = { 
      ...insertApplication, 
      id, 
      status: insertApplication.status || 'pending',
      documents: insertApplication.documents || [],
      interestRate: insertApplication.interestRate || '0.0',
      riskScore: insertApplication.riskScore || null,
      notes: insertApplication.notes || null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };

    try {
      await elasticsearch.indexDocument('loan_applications', id.toString(), application);
      
      // Update customer stats after creating loan application
      await this.updateCustomerStats(insertApplication.customerId.toString());
      
      console.log(`Created loan application ${id} in Elasticsearch`);
      return application;
    } catch (error) {
      console.error('Failed to create loan application:', error);
      throw error;
    }
  }

  async updateLoanApplication(id: number, updates: Partial<LoanApplication>): Promise<LoanApplication> {
    try {
      const existing = await this.getLoanApplication(id);
      if (!existing) {
        throw new Error(`Loan application ${id} not found`);
      }

      const updated: LoanApplication = { 
        ...existing, 
        ...updates, 
        updatedAt: new Date() 
      };

      await elasticsearch.updateDocument('loan_applications', id.toString(), updated);
      return updated;
    } catch (error) {
      console.error('Failed to update loan application:', error);
      throw error;
    }
  }

  async getAllLoanApplications(): Promise<LoanApplication[]> {
    try {
      return await elasticsearch.getAllDocuments('loan_applications', 10000);
    } catch (error) {
      console.error('Failed to get all loan applications:', error);
      return [];
    }
  }

  // Customer methods
  async getAllCustomers(): Promise<any[]> {
    try {
      return await elasticsearch.getAllDocuments('customers', 10000);
    } catch (error) {
      console.error('Failed to get all customers:', error);
      return [];
    }
  }

  async getCustomerWithStats(customerId: string): Promise<any> {
    try {
      // Try to find customer by custId first
      const customerResponse = await elasticsearch.search('customers', {
        query: {
          term: { custId: customerId }
        },
        size: 1
      });
      
      let customer;
      if (customerResponse.hits.hits.length > 0) {
        customer = customerResponse.hits.hits[0]._source;
      } else {
        // Fallback to direct document lookup
        customer = await elasticsearch.getDocument('customers', customerId);
      }
      
      if (!customer) return null;

      // Get loan applications for this customer using custId
      const response = await elasticsearch.search('loan_applications', {
        query: {
          term: { custId: customer.custId }
        },
        size: 100
      });
      
      const loans = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      // Calculate stats
      const totalLoans = loans.length;
      const totalAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.amount || 0), 0);
      const activeLoans = loans.filter(loan => 
        loan.status === 'approved' || loan.status === 'disbursed'
      ).length;

      return {
        ...customer,
        totalLoans,
        totalAmount,
        activeLoans,
        recentLoans: loans.slice(0, 5)
      };
    } catch (error) {
      console.error('Failed to get customer with stats:', error);
      return null;
    }
  }

  async updateCustomerStats(customerId: string): Promise<void> {
    try {
      // Find customer by custId
      const customerResponse = await elasticsearch.search('customers', {
        query: {
          term: { custId: customerId }
        },
        size: 1
      });
      
      if (customerResponse.hits.hits.length === 0) return;
      
      const customer = customerResponse.hits.hits[0]._source;
      const documentId = customerResponse.hits.hits[0]._id;

      const stats = await this.getCustomerWithStats(customerId);
      if (!stats) return;

      const updatedCustomer = {
        ...customer,
        totalLoans: stats.totalLoans,
        totalAmount: stats.totalAmount,
        activeLoans: stats.activeLoans,
        updatedAt: new Date().toISOString()
      };

      await elasticsearch.updateDocument('customers', documentId, updatedCustomer);
    } catch (error) {
      console.error('Failed to update customer stats:', error);
    }
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const result = await elasticsearch.getDocument('documents', id.toString());
      return result || undefined;
    } catch (error) {
      console.error('Failed to get document:', error);
      return undefined;
    }
  }

  async getDocumentsByApplication(applicationId: number): Promise<Document[]> {
    try {
      const response = await elasticsearch.search('documents', {
        query: {
          term: { applicationId: applicationId }
        },
        size: 100
      });
      
      return response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));
    } catch (error) {
      console.error('Failed to get documents by application:', error);
      return [];
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      extractedText: insertDocument.extractedText || null,
      uploadedAt: new Date() 
    };

    try {
      await elasticsearch.indexDocument('documents', id.toString(), document);
      return document;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  }

  // Chat Message methods
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    try {
      const result = await elasticsearch.getDocument('chat_messages', id.toString());
      return result || undefined;
    } catch (error) {
      console.error('Failed to get chat message:', error);
      return undefined;
    }
  }

  async getChatMessagesByUser(userId: number): Promise<ChatMessage[]> {
    try {
      const response = await elasticsearch.search('chat_messages', {
        query: {
          term: { userId: userId }
        },
        size: 100,
        sort: [{ createdAt: { order: 'asc' } }]
      });
      
      return response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));
    } catch (error) {
      console.error('Failed to get chat messages by user:', error);
      return [];
    }
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      createdAt: new Date() 
    };

    try {
      await elasticsearch.indexDocument('chat_messages', id.toString(), message);
      return message;
    } catch (error) {
      console.error('Failed to create chat message:', error);
      throw error;
    }
  }
}

export const elasticsearchStorage = new ElasticsearchStorage();