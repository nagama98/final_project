import { elasticsearch } from "./elasticsearch";
import { elasticsearchStorage } from "../storage-elasticsearch";

export class CustomerGeneratorService {
  private firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
    'Paul', 'Carol', 'Joshua', 'Ruth', 'Kenneth', 'Sharon', 'Kevin', 'Michelle',
    'Brian', 'Laura', 'George', 'Sarah', 'Timothy', 'Kimberly', 'Ronald', 'Deborah',
    'Jason', 'Dorothy', 'Edward', 'Lisa', 'Jeffrey', 'Nancy', 'Ryan', 'Karen',
    'Jacob', 'Betty', 'Gary', 'Helen', 'Nicholas', 'Sandra', 'Eric', 'Donna'
  ];

  private lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker'
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return customer;
  }

  async generateCustomers(count: number = 5000): Promise<void> {
    console.log(`🏦 Starting generation of ${count} customers...`);
    
    const batchSize = 100;
    const totalBatches = Math.ceil(count / batchSize);
    let processedCount = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const customers = [];
      
      for (let i = 0; i < batchCount; i++) {
        const customer = await this.generateCustomer(batchStart + i + 1);
        customers.push(customer);
      }

      // Bulk index customers in Elasticsearch
      try {
        await elasticsearch.bulkIndex('customers', customers);
        processedCount += batchCount;
        
        if (batch % 10 === 0 || batch === totalBatches - 1) {
          const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
          console.log(`👥 Customer Progress: ${progress}% (${processedCount}/${count})`);
        }
      } catch (error) {
        console.error('Failed to index customer batch:', error);
      }

      // Small delay to prevent overwhelming
      if (batch % 20 === 0 && batch > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Successfully generated ${processedCount} customers!`);
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
        customers = newCustomers;
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

  async updateCustomerStats(): Promise<void> {
    console.log('📊 Updating customer statistics...');
    
    try {
      const customers = await elasticsearch.getAllDocuments('customers', 10000);
      const batchSize = 50;
      const totalBatches = Math.ceil(customers.length / batchSize);
      let processedCount = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, customers.length);
        const batchCustomers = customers.slice(batchStart, batchEnd);

        const updates = [];
        
        for (const customer of batchCustomers) {
          try {
            // Get loan applications for this customer
            const response = await elasticsearch.search('loan_applications', {
              query: {
                term: { custId: customer.custId }
              },
              size: 1000
            });
            
            const loans = response.hits.hits.map((hit: any) => hit._source);
            
            // Calculate stats
            const totalLoans = loans.length;
            const totalAmount = loans.reduce((sum, loan) => sum + parseFloat(loan.amount || 0), 0);
            const activeLoans = loans.filter(loan => 
              loan.status === 'approved' || loan.status === 'disbursed'
            ).length;

            const updatedCustomer = {
              ...customer,
              totalLoans,
              totalAmount,
              activeLoans,
              updatedAt: new Date().toISOString()
            };

            updates.push(updatedCustomer);
          } catch (error) {
            console.error(`Failed to update stats for customer ${customer.custId}:`, error);
          }
        }

        // Bulk update customers
        if (updates.length > 0) {
          try {
            await elasticsearch.bulkIndex('customers', updates);
            processedCount += updates.length;
            
            if (batch % 10 === 0 || batch === totalBatches - 1) {
              const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
              console.log(`📈 Stats Progress: ${progress}% (${processedCount}/${customers.length})`);
            }
          } catch (error) {
            console.error('Failed to update customer stats batch:', error);
          }
        }
      }

      console.log(`✅ Successfully updated stats for ${processedCount} customers!`);
    } catch (error) {
      console.error('Failed to update customer stats:', error);
    }
  }
}

export const customerGenerator = new CustomerGeneratorService();