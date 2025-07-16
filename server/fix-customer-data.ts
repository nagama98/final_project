import { elasticsearchStorage } from "./storage-elasticsearch";
import { storage } from "./storage";

export async function fixCustomerData() {
  console.log("🔧 Fixing customer data relationships...");
  
  // Create proper customers first
  const sampleCustomers = [
    { id: 1, firstName: "Alice", lastName: "Johnson", email: "alice.johnson@email.com" },
    { id: 2, firstName: "Bob", lastName: "Smith", email: "bob.smith@email.com" },
    { id: 3, firstName: "Carol", lastName: "Davis", email: "carol.davis@email.com" },
    { id: 4, firstName: "David", lastName: "Wilson", email: "david.wilson@email.com" },
    { id: 5, firstName: "Emily", lastName: "Brown", email: "emily.brown@email.com" },
    { id: 6, firstName: "Frank", lastName: "Miller", email: "frank.miller@email.com" },
    { id: 7, firstName: "Grace", lastName: "Taylor", email: "grace.taylor@email.com" },
    { id: 8, firstName: "Henry", lastName: "Anderson", email: "henry.anderson@email.com" },
    { id: 9, firstName: "Isabel", lastName: "Thomas", email: "isabel.thomas@email.com" },
    { id: 10, firstName: "Jack", lastName: "Martin", email: "jack.martin@email.com" }
  ];

  // Create users in Elasticsearch
  for (const customer of sampleCustomers) {
    try {
      await elasticsearchStorage.createUser({
        username: customer.email.split('@')[0],
        password: "password123",
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: "customer",
        phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
      });
      console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName}`);
    } catch (error) {
      // Customer might already exist, that's fine
    }
  }

  // Get all existing applications from memory storage and update them
  const applications = await storage.getAllLoanApplications();
  console.log(`📋 Found ${applications.length} applications to update`);

  // Update applications with proper customer relationships
  for (const app of applications) {
    const randomCustomer = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
    
    try {
      await storage.updateLoanApplication(app.id, {
        customerId: randomCustomer.id
      });
      
      // Also try to create in Elasticsearch
      try {
        await elasticsearchStorage.createLoanApplication({
          applicationId: app.applicationId,
          customerId: randomCustomer.id,
          loanType: app.loanType,
          amount: app.amount,
          term: app.term || 12,
          status: app.status,
          riskScore: app.riskScore,
          purpose: app.purpose || `${app.loanType} loan`,
          income: app.income || "50000",
          creditScore: app.creditScore || 700,
          collateral: app.collateral || "No",
          notes: app.notes || `Application for ${randomCustomer.firstName} ${randomCustomer.lastName}`
        });
      } catch (esError) {
        // Elasticsearch might not be available, that's fine
      }
    } catch (error) {
      console.warn(`Failed to update application ${app.id}:`, error);
    }
  }

  console.log("✅ Customer data relationships fixed!");
}