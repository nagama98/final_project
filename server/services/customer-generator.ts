import { elasticsearch } from "./elasticsearch";
import { elasticsearchStorage } from "../storage-elasticsearch";

export class CustomerGeneratorService {
  private firstNames = [
    'Alexander', 'Sophia', 'Benjamin', 'Isabella', 'Christopher', 'Emma', 'Daniel', 'Olivia',
    'Ethan', 'Ava', 'Gabriel', 'Mia', 'Henry', 'Charlotte', 'Isaac', 'Amelia',
    'Jackson', 'Harper', 'Liam', 'Evelyn', 'Mason', 'Abigail', 'Nathan', 'Emily',
    'Owen', 'Elizabeth', 'Sebastian', 'Mila', 'Theodore', 'Ella', 'William', 'Avery',
    'Aiden', 'Sofia', 'Caleb', 'Camila', 'David', 'Aria', 'Eli', 'Scarlett',
    'Felix', 'Victoria', 'Gavin', 'Madison', 'Hunter', 'Luna', 'Ian', 'Grace',
    'Jasper', 'Chloe', 'Knox', 'Penelope', 'Leo', 'Layla', 'Miles', 'Riley',
    'Nolan', 'Zoey', 'Oliver', 'Nora', 'Parker', 'Lily', 'Quinn', 'Eleanor',
    'Ryan', 'Hannah', 'Samuel', 'Lillian', 'Tyler', 'Addison', 'Vincent', 'Aubrey',
    'Wyatt', 'Ellie', 'Xavier', 'Stella', 'Zoe', 'Natalie', 'Adrian', 'Zara'
  ];

  private lastNames = [
    'Anderson', 'Bennett', 'Carter', 'Davidson', 'Edwards', 'Foster', 'Griffin', 'Harrison',
    'Ibrahim', 'Johnson', 'Kumar', 'Lancaster', 'Morrison', 'Nielsen', 'O\'Connor', 'Peterson',
    'Quinn', 'Richardson', 'Sullivan', 'Thompson', 'Underwood', 'Valencia', 'Washington', 'Xavier',
    'Young', 'Zhang', 'Abbott', 'Brooks', 'Collins', 'Douglas', 'Elliott', 'Ferguson',
    'Gardner', 'Hughes', 'Jenkins', 'Kelly', 'Lopez', 'Murphy', 'Nelson', 'Oliver',
    'Palmer', 'Roberts', 'Stewart', 'Turner', 'Vaughn', 'Watson', 'Adams', 'Baker',
    'Campbell', 'Davis', 'Evans', 'Fisher', 'Green', 'Hall', 'Jackson', 'King',
    'Lewis', 'Martin', 'Parker', 'Reed', 'Scott', 'Taylor', 'Walker', 'White',
    'Bell', 'Cooper', 'Gray', 'Hill', 'Lee', 'Moore', 'Price', 'Ross',
    'Stone', 'Wood', 'Barnes', 'Clark', 'Cook', 'Cox', 'Diaz', 'Long'
  ];

  private addresses = [
    '123 Main St, New York, NY 10001',
    '456 Oak Ave, Los Angeles, CA 90210',
    '789 Pine Rd, Chicago, IL 60601',
    '321 Elm St, Houston, TX 77001',
    '654 Maple Dr, Phoenix, AZ 85001',
    '987 Cedar Ln, Philadelphia, PA 19101',
    '147 Birch Blvd, San Antonio, TX 78201',
    '258 Walnut Way, San Diego, CA 92101',
    '369 Spruce St, Dallas, TX 75201',
    '741 Willow Ave, San Jose, CA 95101'
  ];

  private employmentStatuses = ['employed', 'self-employed', 'unemployed', 'retired', 'student'];

  private generateRandomSSN(): string {
    const area = Math.floor(Math.random() * 899) + 100;
    const group = Math.floor(Math.random() * 99) + 1;
    const serial = Math.floor(Math.random() * 9999) + 1;
    return `${area.toString().padStart(3, '0')}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`;
  }

  private generateRandomDate(minAge: number = 18, maxAge: number = 80): Date {
    const now = new Date();
    const minBirthYear = now.getFullYear() - maxAge;
    const maxBirthYear = now.getFullYear() - minAge;
    const birthYear = Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1)) + minBirthYear;
    
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    
    return new Date(birthYear, month, day);
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateRandomDateInRange(startDate: string, endDate: string): Date {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeRange = end.getTime() - start.getTime();
    const randomTime = Math.random() * timeRange;
    return new Date(start.getTime() + randomTime);
  }

  private generateUniqueCustomerId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CUST-${timestamp}-${random}`.toUpperCase();
  }

  async generateCustomer(sequenceId: number): Promise<any> {
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    const custId = this.generateUniqueCustomerId();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
    const phone = `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    const dateOfBirth = this.generateRandomDate();
    const employmentStatus = this.getRandomElement(this.employmentStatuses);
    const annualIncome = Math.floor(Math.random() * 200000) + 30000; // $30k - $230k
    const creditScore = Math.floor(Math.random() * 350) + 500; // 500-850
    const riskLevel = creditScore > 750 ? 'low' : creditScore > 650 ? 'medium' : 'high';

    const customer = {
      id: sequenceId.toString(),
      custId,
      username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
      email,
      role: 'customer',
      firstName,
      lastName,
      phone,
      address: this.getRandomElement(this.addresses),
      dateOfBirth: dateOfBirth.toISOString(),
      ssn: this.generateRandomSSN(),
      employmentStatus,
      annualIncome,
      creditScore,
      riskLevel,
      totalLoans: 0,
      totalAmount: 0,
      activeLoans: 0,
      createdAt: this.generateRandomDateInRange('2023-01-01', '2025-07-30').toISOString(),
      updatedAt: new Date().toISOString()
    };

    return customer;
  }

  async generateCustomers(count: number = 100): Promise<any[]> {
    console.log(`🏦 Starting generation of ${count} customers...`);
    
    const customers = [];
    
    for (let i = 0; i < count; i++) {
      const customer = await this.generateCustomer(i + 1);
      customers.push(customer);
    }

    // Bulk index customers in Elasticsearch
    try {
      await elasticsearch.bulkIndex('customers', customers);
      console.log(`✅ Successfully generated and indexed ${customers.length} customers!`);
    } catch (error) {
      console.error('Failed to index customers:', error);
    }

    return customers;
  }

  async updateLoanApplicationsWithCustomers(): Promise<void> {
    console.log('🔄 Updating loan applications with customer correlation...');
    
    try {
      // Get all customers
      const customers = await elasticsearch.getAllDocuments('customers', 10000);
      console.log(`Found ${customers.length} customers`);

      // Get all loan applications
      const applications = await elasticsearch.getAllDocuments('loan_applications', 10000);
      console.log(`Found ${applications.length} loan applications`);

      if (customers.length === 0) {
        console.log('No customers found, generating customers first...');
        await this.generateCustomers(5000);
        // Get customers again after generation
        const newCustomers = await elasticsearch.getAllDocuments('customers', 10000);
        if (newCustomers.length === 0) {
          console.log('Failed to generate customers, skipping loan correlation update');
          return;
        }
        customers.splice(0, customers.length, ...newCustomers);
        console.log(`Now found ${customers.length} customers after generation`);
      }

      // Update loan applications with customer correlation
      const batchSize = 100;
      const totalBatches = Math.ceil(applications.length / batchSize);
      let processedCount = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, applications.length);
        const batchApps = applications.slice(batchStart, batchEnd);

        const updates = batchApps.map(app => {
          // Assign a random customer to this application
          const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
          
          return {
            ...app,
            custId: randomCustomer.custId,
            customerName: `${randomCustomer.firstName} ${randomCustomer.lastName}`,
            customerEmail: randomCustomer.email,
            customerId: randomCustomer.custId // Use custId as customerId for correlation
          };
        });

        // Bulk update in Elasticsearch
        try {
          await elasticsearch.bulkIndex('loan_applications', updates);
          processedCount += updates.length;
          
          if (batch % 10 === 0 || batch === totalBatches - 1) {
            const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
            console.log(`📝 Update Progress: ${progress}% (${processedCount}/${applications.length})`);
          }
        } catch (error) {
          console.error('Failed to update application batch:', error);
        }
      }

      console.log(`✅ Successfully updated ${processedCount} loan applications with customer correlation!`);
    } catch (error) {
      console.error('Failed to update loan applications:', error);
    }
  }

  async generateLoanApplicationsForCustomers(customers: any[], loansPerCustomer: number = 100): Promise<void> {
    console.log(`💰 Starting generation of ${loansPerCustomer} loan applications for each of ${customers.length} customers...`);
    
    const loanTypes = ['personal', 'mortgage', 'auto', 'business', 'student'];
    const statuses = ['pending', 'under_review', 'approved', 'rejected', 'disbursed'];
    
    const batchSize = 200;
    let totalApplications = 0;
    
    for (let customerIndex = 0; customerIndex < customers.length; customerIndex++) {
      const customer = customers[customerIndex];
      const applications = [];
      
      // Generate applications for this customer
      for (let loanIndex = 0; loanIndex < loansPerCustomer; loanIndex++) {
        const loanType = loanTypes[Math.floor(Math.random() * loanTypes.length)];
        const applicationId = `LA-${new Date().getFullYear()}-${String(totalApplications + loanIndex + 1).padStart(6, '0')}`;
        
        // Generate unique customer name for each loan application
        const uniqueFirstName = this.getRandomElement(this.firstNames);
        const uniqueLastName = this.getRandomElement(this.lastNames);
        const uniqueCustomerName = `${uniqueFirstName} ${uniqueLastName}`;
        const uniqueEmail = `${uniqueFirstName.toLowerCase()}.${uniqueLastName.toLowerCase()}@email.com`;
        
        const amount = this.generateRandomAmount(loanType);
        const term = this.generateRandomTerm(loanType);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const riskScore = Math.floor(Math.random() * 100) + 1;
        const purpose = this.generateLoanPurpose(loanType);
        const creditScore = Math.floor(Math.random() * 350) + 500; // Random credit score 500-850
        const interestRate = this.generateInterestRate(loanType, creditScore);
        const collateral = loanType === 'mortgage' || loanType === 'auto' ? 'Yes' : 'No';
        const income = Math.floor(Math.random() * 200000) + 30000; // Random income $30k-$230k
        
        const application = {
          id: (totalApplications + loanIndex + 1).toString(),
          applicationId,
          customerId: customer.custId,
          custId: customer.custId,
          customerName: uniqueCustomerName,
          customerEmail: uniqueEmail,
          loanType,
          amount,
          term,
          status,
          riskScore,
          purpose,
          income: income.toString(),
          creditScore,
          collateral,
          notes: `Application for ${uniqueCustomerName}`,
          documents: [],
          interestRate,
          description: this.generateLoanDescription({
            applicationId,
            customerName: uniqueCustomerName,
            customerId: customer.custId,
            loanType,
            amount,
            term,
            status,
            riskScore,
            purpose,
            income,
            creditScore,
            collateral,
            interestRate
          }),
          createdAt: this.generateRandomDateInRange('2023-01-01', '2025-07-30').toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        applications.push(application);
        
        // Batch insert when we reach batch size
        if (applications.length >= batchSize) {
          await this.insertApplicationBatch(applications);
          applications.length = 0; // Clear array
        }
      }
      
      // Insert remaining applications for this customer
      if (applications.length > 0) {
        await this.insertApplicationBatch(applications);
      }
      
      totalApplications += loansPerCustomer;
      
      // Progress logging
      if ((customerIndex + 1) % 10 === 0 || customerIndex === customers.length - 1) {
        const progress = ((customerIndex + 1) / customers.length * 100).toFixed(1);
        console.log(`📊 Customer Progress: ${progress}% (${customerIndex + 1}/${customers.length} customers, ${totalApplications} total loans)`);
      }
    }
    
    console.log(`✅ Successfully generated ${totalApplications} loan applications for ${customers.length} customers!`);
    
    // Update customer statistics
    await this.updateCustomerStats(customers);
  }

  private generateRandomAmount(loanType: string): string {
    let min, max;
    switch (loanType) {
      case 'personal': min = 1000; max = 50000; break;
      case 'mortgage': min = 50000; max = 800000; break;
      case 'auto': min = 10000; max = 80000; break;
      case 'business': min = 5000; max = 500000; break;
      case 'student': min = 2000; max = 100000; break;
      default: min = 1000; max = 50000;
    }
    return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
  }

  private generateRandomTerm(loanType: string): number {
    switch (loanType) {
      case 'personal': return Math.floor(Math.random() * 5) + 1; // 1-5 years
      case 'mortgage': return Math.floor(Math.random() * 25) + 5; // 5-30 years
      case 'auto': return Math.floor(Math.random() * 6) + 2; // 2-7 years
      case 'business': return Math.floor(Math.random() * 8) + 2; // 2-10 years
      case 'student': return Math.floor(Math.random() * 10) + 1; // 1-10 years
      default: return 5;
    }
  }

  private generateLoanPurpose(loanType: string): string {
    const purposes = {
      personal: ['Debt consolidation', 'Home improvement', 'Medical expenses', 'Vacation', 'Wedding'],
      mortgage: ['Primary residence', 'Investment property', 'Refinancing', 'Second home'],
      auto: ['New car purchase', 'Used car purchase', 'Refinancing existing auto loan'],
      business: ['Equipment purchase', 'Working capital', 'Business expansion', 'Inventory financing'],
      student: ['Tuition fees', 'Books and supplies', 'Room and board', 'Educational expenses']
    };
    
    const purposeList = purposes[loanType as keyof typeof purposes] || purposes.personal;
    return purposeList[Math.floor(Math.random() * purposeList.length)];
  }

  private generateInterestRate(loanType: string, creditScore: number): string {
    let baseRate;
    switch (loanType) {
      case 'personal': baseRate = 12; break;
      case 'mortgage': baseRate = 6; break;
      case 'auto': baseRate = 8; break;
      case 'business': baseRate = 10; break;
      case 'student': baseRate = 5; break;
      default: baseRate = 10;
    }
    
    //Adjust based on credit score
    const adjustment = creditScore > 750 ? -2 : creditScore > 650 ? -1 : creditScore < 600 ? 3 : 0;
    const finalRate = Math.max(baseRate + adjustment + (Math.random() * 2 - 1), 2);
    
    return finalRate.toFixed(2);
  }

  private generateLoanDescription(loanData: any): string {
    const {
      applicationId, customerName, customerId, loanType, amount, term, status, 
      riskScore, purpose, creditScore, collateral, interestRate
    } = loanData;

    // Generate risk level based on score
    const riskLevel = riskScore > 70 ? 'High' : riskScore > 30 ? 'Medium' : 'Low';
    
    // Format amount with commas
    const formattedAmount = parseInt(amount).toLocaleString();
    
    // Create comprehensive description for semantic search
    const description = `
Loan Application ${applicationId}: ${loanType.charAt(0).toUpperCase() + loanType.slice(1)} loan application for customer ${customerName} (ID: ${customerId}). 
Amount requested: $${formattedAmount} over ${term} ${term === 1 ? 'month' : term > 12 ? Math.floor(term/12) + ' years' : 'months'}. 
Current status: ${status.replace('_', ' ')}. 
Purpose: ${purpose}. 
Customer profile: credit score ${creditScore}, ${collateral === 'Yes' ? 'secured with collateral' : 'unsecured loan'}. 
Risk assessment: ${riskLevel} risk (score: ${riskScore}/100). 
Interest rate: ${interestRate}% APR. 
Application details: ${status === 'approved' ? 'Approved for disbursement' : status === 'rejected' ? 'Rejected due to risk factors' : status === 'disbursed' ? 'Funds successfully disbursed' : status === 'under_review' ? 'Currently under review by loan officers' : 'Pending initial review'}. 
Loan type specifics: ${this.getLoanTypeDetails(loanType, amount, term, purpose)}.
    `.trim().replace(/\s+/g, ' ');

    return description;
  }
  

  private getLoanTypeDetails(loanType: string, amount: string, term: number, purpose: string): string {
    const amountNum = parseInt(amount);
    
    switch (loanType) {
      case 'personal':
        return `Personal loan for ${purpose.toLowerCase()}, unsecured financing for individual needs`;
      case 'mortgage':
        return `Home mortgage loan for ${purpose.toLowerCase()}, secured by real estate property, ${term/12} year term`;
      case 'auto':
        return `Vehicle financing for ${purpose.toLowerCase()}, secured by automobile, ${term} month payment plan`;
      case 'business':
        return `Business loan for ${purpose.toLowerCase()}, commercial financing for business operations`;
      case 'student':
        return `Educational loan for ${purpose.toLowerCase()}, financing for academic expenses and tuition`;
      default:
        return `Standard loan for ${purpose.toLowerCase()}, general purpose financing`;
    }
  }

  private async insertApplicationBatch(applications: any[]): Promise<void> {
    try {
      await elasticsearch.bulkIndex('loan_applications', applications);
    } catch (error) {
      console.error('Failed to insert application batch:', error);
    }
  }

  private async updateCustomerStats(customers: any[]): Promise<void> {
    console.log('📊 Updating customer statistics...');
    
    const updatedCustomers = [];
    
    for (const customer of customers) {
      try {
        // Get loan applications for this customer
        const response = await elasticsearch.search('loan_applications', {
          query: {
            term: { custId: customer.custId }
          },
          size: 10000
        });
        
        const loans = response.hits.hits.map((hit: any) => hit._source);
        
        // Calculate stats
        const totalLoans = loans.length;
        const totalAmount = loans.reduce((sum: number, loan: any) => sum + parseFloat(loan.amount || 0), 0);
        const activeLoans = loans.filter((loan: any) => 
          loan.status === 'approved' || loan.status === 'disbursed'
        ).length;

        const updatedCustomer = {
          ...customer,
          totalLoans,
          totalAmount,
          activeLoans,
          updatedAt: new Date().toISOString()
        };

        updatedCustomers.push(updatedCustomer);
      } catch (error) {
        console.error(`Failed to update stats for customer ${customer.custId}:`, error);
      }
    }

    // Bulk update customers
    if (updatedCustomers.length > 0) {
      try {
        await elasticsearch.bulkIndex('customers', updatedCustomers);
        console.log(`✅ Successfully updated stats for ${updatedCustomers.length} customers!`);
      } catch (error) {
        console.error('Failed to update customer stats:', error);
      }
    }
  }

  async checkIndexExists(indexName: string): Promise<boolean> {
    try {
      const response = await elasticsearch.search(indexName, {
        query: { match_all: {} },
        size: 1
      });
      return true;
    } catch (error) {
      return false;
    }
  }



  async generateCustomersAndLoans(customerCount: number = 100, loansPerCustomer: number = 100): Promise<void> {
    const totalLoanCount = customerCount * loansPerCustomer;
    console.log(`🚀 Starting generation of ${customerCount} customers with ${loansPerCustomer} loans each (${totalLoanCount} total applications)...`);
    
    // Check if indices exist and have expected data
    const customersExist = await this.checkIndexExists('customers');
    const applicationsExist = await this.checkIndexExists('loan_applications');
    
    if (customersExist && applicationsExist) {
      // Get existing counts
      try {
        const existingCustomers = await elasticsearch.getAllDocuments('customers', 1000);
        const existingApplications = await elasticsearch.getAllDocuments('loan_applications', 20000);
        
        if (existingCustomers.length >= customerCount && existingApplications.length >= totalLoanCount) {
          console.log(`✅ Data already exists: ${existingCustomers.length} customers, ${existingApplications.length} applications. Skipping generation.`);
          return;
        }
        
        console.log(`📊 Current data: ${existingCustomers.length}/${customerCount} customers, ${existingApplications.length}/${totalLoanCount} applications`);
        console.log('🔄 Insufficient data found, proceeding with generation...');
      } catch (error) {
        console.log('Error checking existing data, proceeding with generation...');
      }
    }
    
    // Initialize indices if they don't exist (without clearing)
    await elasticsearch.initializeIndices();
    
    // Generate customers only if we don't have enough
    let customers: any[] = [];
    
    if (customersExist) {
      customers = await elasticsearch.getAllDocuments('customers', 1000);
    }
    
    if (customers.length < customerCount) {
      const newCustomers = await this.generateCustomers(customerCount - customers.length);
      customers = [...customers, ...newCustomers];
      console.log(`✅ Generated ${newCustomers.length} new customers (total: ${customers.length})`);
    } else {
      console.log(`✅ Using existing ${customers.length} customers`);
    }
    
    // Generate loan applications only if we don't have enough
    let existingApplicationsCount = 0;
    if (applicationsExist) {
      const existingApps = await elasticsearch.getAllDocuments('loan_applications', 20000);
      existingApplicationsCount = existingApps.length;
    }
    
    if (existingApplicationsCount < totalLoanCount) {
      const neededApplications = totalLoanCount - existingApplicationsCount;
      const applicationsPerCustomer = Math.ceil(neededApplications / customers.length);
      await this.generateLoanApplicationsForCustomers(customers, applicationsPerCustomer);
      console.log(`✅ Generated ${neededApplications} new loan applications`);
    } else {
      console.log(`✅ Using existing ${existingApplicationsCount} loan applications`);
    }
    
    console.log(`🎉 Successfully generated ${customerCount} customers and ${totalLoanCount} loan applications with proper correlation!`);
  }
}

export const customerGenerator = new CustomerGeneratorService();