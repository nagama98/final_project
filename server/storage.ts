import { users, loanApplications, documents, chatMessages, type User, type InsertUser, type LoanApplication, type InsertLoanApplication, type Document, type InsertDocument, type ChatMessage, type InsertChatMessage } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Loan Applications
  getLoanApplication(id: number): Promise<LoanApplication | undefined>;
  getLoanApplicationsByCustomer(customerId: number): Promise<LoanApplication[]>;
  createLoanApplication(application: InsertLoanApplication): Promise<LoanApplication>;
  updateLoanApplication(id: number, updates: Partial<LoanApplication>): Promise<LoanApplication>;
  getAllLoanApplications(): Promise<LoanApplication[]>;
  
  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByApplication(applicationId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Chat Messages
  getChatMessage(id: number): Promise<ChatMessage | undefined>;
  getChatMessagesByUser(userId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Customer methods
  getAllCustomers?(): Promise<any[]>;
  getCustomerWithStats?(customerId: string): Promise<any>;
  updateCustomerStats?(customerId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private loanApplications: Map<number, LoanApplication>;
  private documents: Map<number, Document>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentApplicationId: number;
  private currentDocumentId: number;
  private currentChatMessageId: number;

  constructor() {
    this.users = new Map();
    this.loanApplications = new Map();
    this.documents = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentApplicationId = 1;
    this.currentDocumentId = 1;
    this.currentChatMessageId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample users
    const sampleUsers = [
      { username: "alice.smith", password: "password123", email: "alice.smith@email.com", role: "customer", firstName: "Alice", lastName: "Smith", phone: "555-0101" },
      { username: "bob.johnson", password: "password123", email: "bob.johnson@email.com", role: "customer", firstName: "Bob", lastName: "Johnson", phone: "555-0102" },
      { username: "carol.davis", password: "password123", email: "carol.davis@email.com", role: "customer", firstName: "Carol", lastName: "Davis", phone: "555-0103" },
      { username: "john.doe", password: "password123", email: "john.doe@bank.com", role: "loan_officer", firstName: "John", lastName: "Doe", phone: "555-0201" },
    ];

    sampleUsers.forEach(user => {
      const id = this.currentUserId++;
      this.users.set(id, { 
        ...user, 
        id, 
        role: user.role || 'customer',
        phone: user.phone || null,
        createdAt: new Date() 
      });
    });

    // Sample loan applications
    const sampleApplications = [
      { applicationId: "LA-2024-001", customerId: 1, loanType: "personal", amount: "25000", term: 36, status: "under_review", riskScore: 750, documents: [], notes: "Initial application received" },
      { applicationId: "LA-2024-002", customerId: 2, loanType: "home", amount: "350000", term: 360, status: "approved", riskScore: 820, documents: [], notes: "Approved for home loan" },
      { applicationId: "LA-2024-003", customerId: 3, loanType: "auto", amount: "45000", term: 60, status: "rejected", riskScore: 580, documents: [], notes: "Credit score too low" },
    ];

    sampleApplications.forEach(app => {
      const id = this.currentApplicationId++;
      this.loanApplications.set(id, { 
        ...app, 
        id, 
        status: app.status || 'pending',
        documents: app.documents || [],
        interestRate: app.loanType === 'home' ? '3.5' : app.loanType === 'auto' ? '4.2' : '8.5',
        riskScore: app.riskScore || null,
        notes: app.notes || null,
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
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
    this.users.set(id, user);
    return user;
  }

  // Loan Application methods
  async getLoanApplication(id: number): Promise<LoanApplication | undefined> {
    return this.loanApplications.get(id);
  }

  async getLoanApplicationsByCustomer(customerId: number): Promise<LoanApplication[]> {
    return Array.from(this.loanApplications.values()).filter(app => app.customerId === customerId);
  }

  async createLoanApplication(insertApplication: InsertLoanApplication): Promise<LoanApplication> {
    const id = this.currentApplicationId++;
    const application: LoanApplication = { 
      ...insertApplication, 
      id, 
      status: insertApplication.status || 'pending',
      documents: insertApplication.documents ? Array.from(insertApplication.documents as string[]) : [],
      interestRate: insertApplication.interestRate || null,
      riskScore: insertApplication.riskScore || null,
      notes: insertApplication.notes || null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.loanApplications.set(id, application);
    return application;
  }

  async updateLoanApplication(id: number, updates: Partial<LoanApplication>): Promise<LoanApplication> {
    const existing = this.loanApplications.get(id);
    if (!existing) {
      throw new Error(`Loan application with id ${id} not found`);
    }
    
    const updated: LoanApplication = { ...existing, ...updates, updatedAt: new Date() };
    this.loanApplications.set(id, updated);
    return updated;
  }

  async getAllLoanApplications(): Promise<LoanApplication[]> {
    return Array.from(this.loanApplications.values());
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByApplication(applicationId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.applicationId === applicationId);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      fileSize: insertDocument.fileSize || null,
      mimeType: insertDocument.mimeType || null,
      extractedText: insertDocument.extractedText || null,
      embedding: insertDocument.embedding ? Array.from(insertDocument.embedding as number[]) : null,
      uploadedAt: new Date() 
    };
    this.documents.set(id, document);
    return document;
  }

  // Chat Message methods
  async getChatMessage(id: number): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  async getChatMessagesByUser(userId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(msg => msg.userId === userId);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      response: insertMessage.response || null,
      context: insertMessage.context || null,
      timestamp: new Date() 
    };
    this.chatMessages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
