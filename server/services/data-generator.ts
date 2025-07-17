import { storage } from "../storage";
import { elasticsearchStorage } from "../storage-elasticsearch";
import { elasticsearch } from "./elasticsearch";
import { openai } from "./openai";
import type { InsertLoanApplication } from "@shared/schema";

export class DataGeneratorService {
  private loanTypes = ['personal', 'mortgage', 'auto', 'business', 'student'];
  private statuses = ['pending', 'under_review', 'approved', 'rejected', 'disbursed'];
  private firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna'
  ];
  private lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young'
  ];

  private generateRandomName(): string {
    const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
    const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateRandomEmail(name: string): string {
    const cleanName = name.toLowerCase().replace(/\s+/g, '.');
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'email.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${cleanName}@${domain}`;
  }

  private generateRandomAmount(loanType: string): string {
    let min, max;
    switch (loanType) {
      case 'personal':
        min = 1000; max = 50000;
        break;
      case 'mortgage':
        min = 50000; max = 800000;
        break;
      case 'auto':
        min = 10000; max = 80000;
        break;
      case 'business':
        min = 5000; max = 500000;
        break;
      case 'student':
        min = 2000; max = 100000;
        break;
      default:
        min = 1000; max = 50000;
    }
    return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
  }

  private generateRandomDate(daysBack: number = 365): Date {
    const now = new Date();
    const pastDate = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
    return pastDate;
  }

  async generateLoanApplications(count: number = 100000): Promise<void> {
    console.log(`🚀 Starting generation of ${count} loan applications...`);
    const batchSize = 500; // Smaller batches for better performance
    const totalBatches = Math.ceil(count / batchSize);
    let processedCount = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const applications: InsertLoanApplication[] = [];
      
      // Generate batch data
      for (let i = 0; i < batchCount; i++) {
        const customerName = this.generateRandomName();
        const loanType = this.loanTypes[Math.floor(Math.random() * this.loanTypes.length)];
        const amount = this.generateRandomAmount(loanType);
        const createdAt = this.generateRandomDate();
        
        const application: InsertLoanApplication = {
          applicationId: `LA-${new Date().getFullYear()}-${String(batchStart + i + 1).padStart(6, '0')}`,
          customerId: Math.floor(Math.random() * 10000) + 1,
          customerName,
          customerEmail: this.generateRandomEmail(customerName),
          loanType,
          amount,
          term: Math.floor(Math.random() * 30) + 1, // 1-30 years
          status: this.statuses[Math.floor(Math.random() * this.statuses.length)],
          riskScore: Math.floor(Math.random() * 100) + 1, // 1-100
          purpose: `${loanType} loan for customer needs`,
          income: (parseFloat(amount) * (Math.random() * 5 + 1)).toString(), // Income 1-6x loan amount
          creditScore: Math.floor(Math.random() * 350) + 300, // 300-850
          collateral: loanType === 'mortgage' || loanType === 'auto' ? 'Yes' : 'No',
          notes: `Generated application for ${customerName} on ${createdAt.toLocaleDateString()}`,
          createdAt,
          updatedAt: createdAt
        };

        applications.push(application);
      }

      // Batch save to Elasticsearch first, fallback to memory storage
      const savedApps = await Promise.all(
        applications.map(async (app) => {
          try {
            return await elasticsearchStorage.createLoanApplication(app);
          } catch (esError) {
            console.warn('Failed to create in Elasticsearch, using memory storage:', esError.message);
            try {
              return await storage.createLoanApplication(app);
            } catch (memError) {
              console.error('Failed to create application in both storages:', memError);
              return null;
            }
          }
        })
      );

      // Batch index to Elasticsearch (with embeddings)
      const validApps = savedApps.filter(app => app !== null);
      await this.batchIndexApplications(validApps);

      processedCount += validApps.length;
      
      // Progress logging every 10 batches
      if (batch % 10 === 0 || batch === totalBatches - 1) {
        const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% (${processedCount}/${count} applications)`);
      }

      // Small delay to prevent overwhelming the system
      if (batch % 20 === 0 && batch > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Successfully generated ${processedCount} loan applications!`);
  }

  private async batchIndexApplications(applications: any[]): Promise<void> {
    const esPromises = applications.map(async (savedApp) => {
      try {
        const esDoc = {
          id: savedApp.id.toString(),
          applicationId: savedApp.applicationId,
          customerName: savedApp.customerName,
          customerEmail: savedApp.customerEmail,
          loanType: savedApp.loanType,
          amount: parseFloat(savedApp.amount),
          term: savedApp.term,
          status: savedApp.status,
          riskScore: savedApp.riskScore,
          createdAt: savedApp.createdAt.toISOString(),
          updatedAt: savedApp.updatedAt.toISOString()
        };

        // Skip embedding generation to improve performance and remove dependencies

        await elasticsearch.indexDocument('loan_applications', savedApp.id.toString(), esDoc);
      } catch (esError) {
        // Elasticsearch indexing is optional - silently continue
      }
    });

    await Promise.allSettled(esPromises);
  }

  async generateSampleData(): Promise<void> {
    console.log('Generating sample loan applications...');
    await this.generateLoanApplications(100000);
  }
}

export const dataGenerator = new DataGeneratorService();