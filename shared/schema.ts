import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("customer"), // customer, loan_officer, manager
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loanApplications = pgTable("loan_applications", {
  id: serial("id").primaryKey(),
  applicationId: text("application_id").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  loanType: text("loan_type").notNull(), // personal, home, auto, business
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  term: integer("term").notNull(), // in months
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("pending"), // pending, under_review, approved, rejected, disbursed
  riskScore: integer("risk_score"),
  documents: json("documents").$type<string[]>().default([]),
  notes: text("notes"),
  description: text("description"), // Complete loan description for semantic search
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  documentType: text("document_type").notNull(), // income, identity, property, other
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  extractedText: text("extracted_text"),
  embedding: json("embedding").$type<number[]>(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertLoanApplicationSchema = createInsertSchema(loanApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});



// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoanApplication = typeof loanApplications.$inferSelect;
export type InsertLoanApplication = z.infer<typeof insertLoanApplicationSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;


// Elasticsearch document types
export type CustomerESDocument = {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
  totalLoans: number;
  totalAmount: number;
  activeLoans: number;
  creditScore?: number;
  riskLevel?: string;
};

export type LoanApplicationESDocument = {
  id: string;
  applicationId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  loanType: string;
  amount: number;
  term: number;
  status: string;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
};

export type DocumentESDocument = {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  extractedText: string;
  embedding?: number[];
  uploadedAt: string;
};
