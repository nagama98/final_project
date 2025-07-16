import OpenAI from "openai";
import { storage } from '../storage.js';
import { elasticsearchStorage } from '../storage-elasticsearch.js';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    // Check if Azure OpenAI configuration is available
    if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
      console.log('🔷 Initializing Azure OpenAI client');
      console.log(`   Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
      console.log(`   Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`);
      
      this.client = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY || "1IMfC4yz9JrWlrMSoJ8ROK8gsY24zjTpoZe0irVMAQTzkarSuEBFJQQJ99BGACYeBjFXJ3w3AAABACOGnL14",
        baseURL: "https://openaikeyelastic.openai.azure.com/openai/deployments/gpt-4o",
        defaultQuery: { 'api-version': '2025-01-01-preview' },
        defaultHeaders: {
          'api-key': process.env.AZURE_OPENAI_API_KEY || "1IMfC4yz9JrWlrMSoJ8ROK8gsY24zjTpoZe0irVMAQTzkarSuEBFJQQJ99BGACYeBjFXJ3w3AAABACOGnL14",
        },
      });
    } else {
      console.log('🟡 Azure OpenAI not configured, using standard OpenAI');
      // Fallback to standard OpenAI
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "sk-fake-key"
      });
    }
  }

  private getChatModel(): string {
    // Use Azure deployment name if available, otherwise use standard OpenAI model
    if (this.isUsingAzure()) {
      return process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";
    }
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    return "gpt-4o";
  }

  isUsingAzure(): boolean {
    return !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
  }

  async processLoanQuery(message: string, userId: number): Promise<{
    response: string;
    loans?: any[];
    metadata?: any;
  }> {
    // Always use fallback first since API key might not be available
    try {
      if (!this.isUsingAzure() && !process.env.OPENAI_API_KEY) {
        return await this.handleQueryWithoutAPI(message);
      }

      // Step 1: Try OpenAI for intent analysis with retry logic
      console.log('🔵 Attempting Azure OpenAI call...');
      
      let intentResponse;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          intentResponse = await Promise.race([
            this.client.chat.completions.create({
              model: this.getChatModel(),
              messages: [
                {
                  role: "system",
                  content: `You are a loan management assistant. Analyze the user's query and extract search parameters for a loan database. 
                  Respond with JSON containing these fields:
                  - "searchType": "specific_search" | "general_question" | "help"
                  - "parameters": object with loan search filters like status, loanType, minAmount, maxAmount, customerName, etc.
                  - "query": the processed search query for text search
                  - "intent": brief description of what the user wants
                  
                  Valid statuses: pending, under_review, approved, rejected, disbursed
                  Valid loan types: personal, mortgage, auto, business, student`
                },
                {
                  role: "user",
                  content: message
                }
              ],
              response_format: { type: "json_object" },
              temperature: 0.3
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 15000)
            )
          ]);
          
          console.log('🟢 Azure OpenAI call successful');
          break;
          
        } catch (retryError: any) {
          retryCount++;
          console.log(`🔴 Azure OpenAI attempt ${retryCount} failed:`, retryError.message);
          
          if (retryCount >= maxRetries) {
            throw retryError;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      const intent = JSON.parse(intentResponse.choices[0].message.content || "{}");

      if (intent.searchType === "specific_search") {
        // Step 2: Search for loans based on extracted parameters
        const loans = await this.searchLoansFromStorage(intent.parameters);

        // Step 3: Generate contextual response based on results
        const responsePrompt = `Based on the loan search results, provide a helpful response to the user. 
        
        User Query: "${message}"
        Search Results: ${loans.length} loans found
        Intent: ${intent.intent}
        
        Loan Data:
        ${loans.slice(0, 10).map(loan => 
          `- ${loan.customerName}: ${loan.loanType} loan for $${loan.amount} (Status: ${loan.status})`
        ).join('\n')}

        Provide a conversational response that summarizes the findings in a helpful way.`;

        const summaryResponse = await Promise.race([
          this.client.chat.completions.create({
            model: this.getChatModel(),
            messages: [
              {
                role: "system",
                content: "You are a helpful loan management assistant. Provide clear, professional responses about loan data."
              },
              {
                role: "user",
                content: responsePrompt
              }
            ]
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Summary response timeout')), 10000)
          )
        ]);

        return {
          response: summaryResponse.choices[0].message.content || "I found some loans matching your criteria.",
          loans: loans.slice(0, 5),
          metadata: {
            total: loans.length,
            intent: intent.intent
          }
        };

      } else if (intent.searchType === "general_question") {
        // Handle general questions about loan management
        const generalResponse = await Promise.race([
          this.client.chat.completions.create({
            model: this.getChatModel(),
            messages: [
              {
                role: "system",
                content: `You are a loan management expert assistant. Answer questions about loan management, banking processes, and provide helpful guidance. 
                
                Available loan types: personal, mortgage, auto, business, student
                Available statuses: pending, under_review, approved, rejected, disbursed
                
                If the user asks about specific data, suggest they ask for specific searches like "show me all pending mortgages" or "find loans over $100,000".`
              },
              {
                role: "user",
                content: message
              }
            ]
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('General response timeout')), 10000)
          )
        ]);

        return {
          response: generalResponse.choices[0].message.content || "I'm here to help with loan management questions."
        };

      } else {
        // Help response
        return {
          response: `I can help you search and analyze loan data. Here are some things you can ask me:

• "Show me all pending mortgage loans"
• "Find loans over $100,000"
• "What approved loans are there?"
• "How many personal loans do we have?"
• "Show me rejected business loans"
• "Find loans for John Smith"

I can also answer general questions about loan management processes.`
        };
      }

    } catch (error: any) {
      console.error('Error processing chat query:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
        type: error.type,
        isTimeout: error.message?.includes('timeout'),
        isNetworkError: error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT'
      });
      
      // Check if it's an authentication error or OpenAI related error
      if ((error.status === 401) || 
          (error.code === 'invalid_api_key') || 
          (error.name === 'AuthenticationError') ||
          (error instanceof Error && error.message.includes('API key'))) {
        console.log('🔴 Azure OpenAI authentication failed, using fallback mode');
        return {
          response: "I'm experiencing authentication issues with Azure OpenAI services. I can still help you with basic loan queries using my local processing capabilities. Please try asking about pending loans, approved applications, or loan counts.",
          loans: [],
          metadata: { error: 'authentication_failed', fallback: true }
        };
      }
      
      // Check for network/timeout errors
      if (error.message?.includes('timeout') || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.log('🔴 Azure OpenAI network timeout, using fallback mode');
        return {
          response: "I'm experiencing a temporary connection issue with Azure OpenAI services. Let me process your request using my local capabilities. Please try your question again or ask about loan statuses, amounts, or types.",
          loans: [],
          metadata: { error: 'network_timeout', fallback: true }
        };
      }
      
      console.log('🔴 Azure OpenAI request failed, using fallback mode');
      return this.handleQueryWithoutAPI(message);
    }
  }

  private async handleQueryWithoutAPI(message: string): Promise<{
    response: string;
    loans?: any[];
    metadata?: any;
  }> {
    try {
      // Simple pattern matching for common queries without OpenAI
      const lowerMessage = message.toLowerCase();
      
      // Try to get loans from Elasticsearch first, fallback to memory storage
      let allLoans;
      try {
        allLoans = await elasticsearchStorage.getAllLoanApplications();
        console.log(`Retrieved ${allLoans.length} loans from Elasticsearch for fallback search`);
      } catch (esError) {
        console.warn('Elasticsearch failed, using memory storage:', esError);
        allLoans = await storage.getAllLoanApplications();
      }
      
      // Status-based queries
      if (lowerMessage.includes('pending')) {
        const pendingLoans = allLoans.filter(loan => loan.status === 'pending');
        return {
          response: `I found ${pendingLoans.length} pending loan applications:\n\n${pendingLoans.slice(0, 5).map(loan => 
            `• ${loan.customerName || 'Customer'}: ${loan.loanType} loan for $${loan.amount} (Status: ${loan.status})`
          ).join('\n')}${pendingLoans.length > 5 ? `\n\n... and ${pendingLoans.length - 5} more pending applications.` : ''}`,
          loans: pendingLoans.slice(0, 5),
          metadata: { total: pendingLoans.length, type: 'status_filter', status: 'pending' }
        };
      }
      
      if (lowerMessage.includes('approved') || lowerMessage.includes('active')) {
        const approvedLoans = allLoans.filter(loan => loan.status === 'approved');
        return {
          response: `I found ${approvedLoans.length} approved loan applications:\n\n${approvedLoans.slice(0, 5).map(loan => 
            `• ${loan.customerName || 'Customer'}: ${loan.loanType} loan for $${loan.amount} (Status: ${loan.status})`
          ).join('\n')}${approvedLoans.length > 5 ? `\n\n... and ${approvedLoans.length - 5} more approved applications.` : ''}`,
          loans: approvedLoans.slice(0, 5),
          metadata: { total: approvedLoans.length, type: 'status_filter', status: 'approved' }
        };
      }
      
      if (lowerMessage.includes('rejected')) {
        const rejectedLoans = allLoans.filter(loan => loan.status === 'rejected');
        return {
          response: `I found ${rejectedLoans.length} rejected loan applications:\n\n${rejectedLoans.slice(0, 5).map(loan => 
            `• ${loan.customerName || 'Customer'}: ${loan.loanType} loan for $${loan.amount} (Status: ${loan.status})`
          ).join('\n')}${rejectedLoans.length > 5 ? `\n\n... and ${rejectedLoans.length - 5} more rejected applications.` : ''}`,
          loans: rejectedLoans.slice(0, 5),
          metadata: { total: rejectedLoans.length, type: 'status_filter', status: 'rejected' }
        };
      }

      // Count queries
      if (lowerMessage.includes('how many') || lowerMessage.includes('count')) {
        return {
          response: `Here's a summary of loan applications in our system:\n\n• Total applications: ${allLoans.length}\n• Pending: ${allLoans.filter(l => l.status === 'pending').length}\n• Approved: ${allLoans.filter(l => l.status === 'approved').length}\n• Rejected: ${allLoans.filter(l => l.status === 'rejected').length}`,
          metadata: { 
            total: allLoans.length,
            breakdown: {
              pending: allLoans.filter(l => l.status === 'pending').length,
              approved: allLoans.filter(l => l.status === 'approved').length,
              rejected: allLoans.filter(l => l.status === 'rejected').length
            }
          }
        };
      }

      // Amount-based queries
      const amountMatch = lowerMessage.match(/(above|over|more)\s+\$?(\d+(?:,?\d{3})*)/);
      if (amountMatch && amountMatch[2]) {
        const threshold = parseFloat(amountMatch[2].replace(/,/g, ''));
        const highValueLoans = allLoans.filter(loan => parseFloat(loan.amount.toString()) > threshold);
        return {
          response: `I found ${highValueLoans.length} loan applications above $${threshold.toLocaleString()}:\n\n${highValueLoans.slice(0, 5).map(loan => 
            `• ${loan.customerName || 'Customer'}: ${loan.loanType} loan for $${loan.amount} (Status: ${loan.status})`
          ).join('\n')}${highValueLoans.length > 5 ? `\n\n... and ${highValueLoans.length - 5} more applications.` : ''}`,
          loans: highValueLoans.slice(0, 5),
          metadata: { total: highValueLoans.length, type: 'amount_filter', threshold }
        };
      }

      // Loan type queries
      const types = ['personal', 'mortgage', 'auto', 'business', 'student'];
      for (const type of types) {
        if (lowerMessage.includes(type)) {
          const typeLoans = allLoans.filter(loan => loan.loanType.toLowerCase() === type);
          return {
            response: `I found ${typeLoans.length} ${type} loan applications:\n\n${typeLoans.slice(0, 5).map(loan => 
              `• ${loan.customerName || 'Customer'}: ${loan.loanType} loan for $${loan.amount} (Status: ${loan.status})`
            ).join('\n')}${typeLoans.length > 5 ? `\n\n... and ${typeLoans.length - 5} more ${type} applications.` : ''}`,
            loans: typeLoans.slice(0, 5),
            metadata: { total: typeLoans.length, type: 'loan_type_filter', loanType: type }
          };
        }
      }

      // Hello/help queries
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
        return {
          response: `Hello! I'm your loan management assistant. I can help you with various queries such as:

• "Show me all pending loans"
• "Find approved applications" 
• "How many loans do we have?"
• "Show me personal loans"
• "Find loans above $50,000"

Currently operating in basic mode. For advanced AI features, please contact your administrator to configure API keys.

What would you like to know about our loan portfolio?`
        };
      }

      // Default response
      return {
        response: `I can help you search loan applications. Try asking:
• "Show me pending loans"
• "How many approved applications?"
• "Find personal loans"
• "Show loans above $100,000"

What would you like to search for?`
      };

    } catch (error) {
      console.error('Error in fallback query handler:', error);
      return {
        response: "I'm sorry, I'm having trouble accessing the loan data right now. Please try again later."
      };
    }
  }

  private async searchLoansFromStorage(parameters: any): Promise<any[]> {
    try {
      // Try to get loans from Elasticsearch first, fallback to memory storage
      let allLoans;
      try {
        allLoans = await elasticsearchStorage.getAllLoanApplications();
        console.log(`Retrieved ${allLoans.length} loans from Elasticsearch for search`);
      } catch (esError) {
        console.warn('Elasticsearch failed, using memory storage:', esError);
        allLoans = await storage.getAllLoanApplications();
      }
      
      let filteredLoans = allLoans;

      // Apply status filter
      if (parameters.status) {
        filteredLoans = filteredLoans.filter(loan => 
          loan.status.toLowerCase() === parameters.status.toLowerCase()
        );
      }

      // Apply loan type filter
      if (parameters.loanType) {
        filteredLoans = filteredLoans.filter(loan => 
          loan.loanType.toLowerCase() === parameters.loanType.toLowerCase()
        );
      }

      // Apply amount filters
      if (parameters.minAmount) {
        filteredLoans = filteredLoans.filter(loan => 
          parseFloat(loan.amount.toString()) >= parameters.minAmount
        );
      }

      if (parameters.maxAmount) {
        filteredLoans = filteredLoans.filter(loan => 
          parseFloat(loan.amount.toString()) <= parameters.maxAmount
        );
      }

      // Apply customer name filter
      if (parameters.customerName) {
        filteredLoans = filteredLoans.filter(loan => 
          loan.customerName?.toLowerCase().includes(parameters.customerName.toLowerCase())
        );
      }

      // Apply risk score filters
      if (parameters.minRiskScore) {
        filteredLoans = filteredLoans.filter(loan => 
          loan.riskScore >= parameters.minRiskScore
        );
      }

      if (parameters.maxRiskScore) {
        filteredLoans = filteredLoans.filter(loan => 
          loan.riskScore <= parameters.maxRiskScore
        );
      }

      // Apply text search if provided
      if (parameters.query && parameters.query.trim()) {
        const searchTerm = parameters.query.toLowerCase();
        filteredLoans = filteredLoans.filter(loan => {
          const searchText = [
            loan.customerName,
            loan.customerEmail,
            loan.loanType,
            loan.status,
            loan.applicationId,
            loan.amount?.toString()
          ].join(' ').toLowerCase();
          return searchText.includes(searchTerm);
        });
      }

      return filteredLoans.slice(0, 50); // Limit results

    } catch (error) {
      console.error('Error searching loans from storage:', error);
      return [];
    }
  }

  async generateResponse(prompt: string, context: string[]): Promise<string> {
    try {
      const systemPrompt = `You are an AI assistant for ElastiBank's loan management system. You help loan officers and customers with comprehensive loan-related queries.

Available loan data:
${context.slice(0, 20).join('\n')}

Guidelines:
- Provide accurate, specific information based on the loan data provided
- For loan listings, format them clearly with bullet points or numbered lists
- For count queries, provide exact numbers
- For amount ranges, show formatted currency values
- Be conversational but professional
- If the data shows specific loan applications, reference them by customer name and details
- Focus on being helpful and informative about loan status, amounts, types, and customer information
- Always base responses on the actual data provided in the context`;

      const response = await this.client.chat.completions.create({
        model: this.getChatModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  async analyzeDocument(text: string): Promise<{
    documentType: string;
    extractedInfo: any;
    confidence: number;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.getChatModel(),
        messages: [
          {
            role: "system",
            content: "You are a document analyzer for a bank loan system. Analyze the document and return JSON with document type, extracted information, and confidence score."
          },
          {
            role: "user",
            content: `Analyze this document text and classify it as one of: income, identity, property, or other. Extract relevant information and provide a confidence score (0-1).\n\nDocument text: ${text}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        documentType: result.documentType || 'other',
        extractedInfo: result.extractedInfo || {},
        confidence: Math.max(0, Math.min(1, result.confidence || 0))
      };
    } catch (error) {
      console.error('Failed to analyze document:', error);
      throw error;
    }
  }
}

export const openai = new OpenAIService();
