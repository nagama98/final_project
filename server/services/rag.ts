import { elasticsearch } from './elasticsearch.js';
import { openai } from './openai.js';
import { storage } from '../storage.js';

export class RAGService {
  // Enhanced query processing for natural language questions
  private parseNaturalLanguageQuery(query: string): {
    intent: string;
    filters: any;
    parameters: any;
  } {
    const lowerQuery = query.toLowerCase();
    const result = {
      intent: 'general',
      filters: {} as any,
      parameters: {} as any
    };

    // Status-based queries
    if (lowerQuery.includes('active') || lowerQuery.includes('approved')) {
      result.intent = 'status_filter';
      result.filters.status = 'approved';
    } else if (lowerQuery.includes('pending') || lowerQuery.includes('under review')) {
      result.intent = 'status_filter';
      result.filters.status = 'pending';
    } else if (lowerQuery.includes('rejected') || lowerQuery.includes('denied')) {
      result.intent = 'status_filter';
      result.filters.status = 'rejected';
    } else if (lowerQuery.includes('disbursed')) {
      result.intent = 'status_filter';
      result.filters.status = 'disbursed';
    }

    // Loan type queries
    if (lowerQuery.includes('personal loan')) {
      result.filters.loanType = 'personal';
    } else if (lowerQuery.includes('mortgage') || lowerQuery.includes('home loan')) {
      result.filters.loanType = 'mortgage';
    } else if (lowerQuery.includes('auto loan') || lowerQuery.includes('car loan')) {
      result.filters.loanType = 'auto';
    } else if (lowerQuery.includes('business loan')) {
      result.filters.loanType = 'business';
    } else if (lowerQuery.includes('student loan')) {
      result.filters.loanType = 'student';
    }

    // Amount-based queries
    const amountMatches = lowerQuery.match(/above|over|more than|greater than\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatches) {
      result.intent = 'amount_filter';
      result.parameters.minAmount = parseFloat(amountMatches[1].replace(/,/g, ''));
    }

    const belowMatches = lowerQuery.match(/below|under|less than\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (belowMatches) {
      result.intent = 'amount_filter';
      result.parameters.maxAmount = parseFloat(belowMatches[1].replace(/,/g, ''));
    }

    const rangeMatches = lowerQuery.match(/between\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+and\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (rangeMatches) {
      result.intent = 'amount_filter';
      result.parameters.minAmount = parseFloat(rangeMatches[1].replace(/,/g, ''));
      result.parameters.maxAmount = parseFloat(rangeMatches[2].replace(/,/g, ''));
    }

    // Customer-specific queries
    const customerMatches = lowerQuery.match(/for\s+([a-zA-Z\s]+)/);
    if (customerMatches && !lowerQuery.includes('loan for')) {
      result.intent = 'customer_filter';
      result.parameters.customerName = customerMatches[1].trim();
    }

    // Risk score queries
    if (lowerQuery.includes('high risk') || lowerQuery.includes('risky')) {
      result.intent = 'risk_filter';
      result.parameters.minRiskScore = 70;
    } else if (lowerQuery.includes('low risk') || lowerQuery.includes('safe')) {
      result.intent = 'risk_filter';
      result.parameters.maxRiskScore = 30;
    }

    // Count/summary queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('total number')) {
      result.intent = 'count';
    }

    // Summary/statistics queries
    if (lowerQuery.includes('summary') || lowerQuery.includes('overview') || lowerQuery.includes('statistics')) {
      result.intent = 'summary';
    }

    return result;
  }

  async processSmartQuery(query: string): Promise<any[]> {
    const { intent, filters, parameters } = this.parseNaturalLanguageQuery(query);
    
    try {
      // Get all applications from storage for processing
      const allApplications = await storage.getAllLoanApplications();
      
      let filteredApplications = allApplications;

      // Apply status filters
      if (filters.status) {
        filteredApplications = filteredApplications.filter(app => 
          app.status.toLowerCase() === filters.status.toLowerCase()
        );
      }

      // Apply loan type filters
      if (filters.loanType) {
        filteredApplications = filteredApplications.filter(app => 
          app.loanType.toLowerCase() === filters.loanType.toLowerCase()
        );
      }

      // Apply amount filters
      if (parameters.minAmount !== undefined) {
        filteredApplications = filteredApplications.filter(app => 
          parseFloat(app.amount.toString()) >= parameters.minAmount
        );
      }

      if (parameters.maxAmount !== undefined) {
        filteredApplications = filteredApplications.filter(app => 
          parseFloat(app.amount.toString()) <= parameters.maxAmount
        );
      }

      // Apply customer name filter
      if (parameters.customerName) {
        filteredApplications = filteredApplications.filter(app => 
          app.customerName?.toLowerCase().includes(parameters.customerName.toLowerCase())
        );
      }

      // Apply risk score filters
      if (parameters.minRiskScore !== undefined) {
        filteredApplications = filteredApplications.filter(app => 
          app.riskScore >= parameters.minRiskScore
        );
      }

      if (parameters.maxRiskScore !== undefined) {
        filteredApplications = filteredApplications.filter(app => 
          app.riskScore <= parameters.maxRiskScore
        );
      }

      // Convert to search result format
      return filteredApplications.slice(0, 20).map(app => ({
        id: app.id.toString(),
        source: app,
        score: 1.0
      }));

    } catch (error) {
      console.error('Smart query processing failed:', error);
      return [];
    }
  }

  async searchRelevantDocuments(query: string, limit: number = 5): Promise<any[]> {
    try {
      const response = await elasticsearch.hybridSearch('documents', query);
      return response.hits?.hits?.slice(0, limit) || [];
    } catch (error) {
      console.warn('Elasticsearch document search failed, returning empty results');
      return [];
    }
  }

  async searchLoanApplications(query: string, filters: any = {}, limit: number = 10): Promise<any[]> {
    try {
      // Use smart query processing for natural language
      return await this.processSmartQuery(query);
    } catch (error) {
      console.warn('Smart query processing failed, falling back to basic search');
      return await this.searchApplicationsFromStorage(query, filters, limit);
    }
  }

  private async searchApplicationsFromStorage(query: string, filters: any = {}, limit: number = 10): Promise<any[]> {
    try {
      const allApps = await storage.getAllLoanApplications();
      
      // Simple text search in multiple fields
      const filteredApps = allApps.filter(app => {
        // Text search in relevant fields
        const searchText = [
          app.customerName,
          app.customerEmail,
          app.loanType,
          app.status,
          app.applicationId,
          app.amount?.toString()
        ].join(' ').toLowerCase();
        
        if (query && query.trim()) {
          if (!searchText.includes(query.toLowerCase())) {
            return false;
          }
        }
        
        // Apply filters
        if (filters.loanType && app.loanType !== filters.loanType) return false;
        if (filters.status && app.status !== filters.status) return false;
        
        return true;
      });
      
      return filteredApps.slice(0, limit).map(app => ({
        id: app.id.toString(),
        source: app,
        score: 1.0
      }));
    } catch (error) {
      console.error('Storage fallback search failed:', error);
      return [];
    }
  }

  async generateRAGResponse(userQuery: string, userId: number): Promise<{
    response: string;
    context: any[];
  }> {
    try {
      // Parse the query to understand intent
      const { intent, filters, parameters } = this.parseNaturalLanguageQuery(userQuery);
      
      // Get smart results based on query
      const relevantLoans = await this.processSmartQuery(userQuery);
      const relevantDocs = await this.searchRelevantDocuments(userQuery, 2);

      // Generate contextual response based on intent and results
      const response = await this.generateContextualResponse(userQuery, intent, relevantLoans, relevantDocs, parameters);

      return {
        response,
        context: [...relevantLoans, ...relevantDocs]
      };
    } catch (error) {
      console.error('Failed to generate RAG response:', error);
      return {
        response: this.generateFallbackResponse(userQuery),
        context: []
      };
    }
  }

  private async generateContextualResponse(
    query: string, 
    intent: string, 
    loans: any[], 
    docs: any[], 
    parameters: any
  ): Promise<string> {
    try {
      // Try OpenAI first for rich responses
      const context = [
        ...loans.map(loan => `Loan: ${loan.source?.customerName} - ${loan.source?.loanType} for $${loan.source?.amount} (${loan.source?.status})`),
        ...docs.map(doc => `Document: ${doc.source?.fileName || 'Document'} - ${doc.source?.extractedText?.substring(0, 200) || 'No text'}`),
      ];

      const enhancedPrompt = `
User Query: "${query}"
Intent: ${intent}
Parameters: ${JSON.stringify(parameters)}

Available loan data:
${context.join('\n')}

Please provide a helpful, specific response based on the user's query and the available loan data. 
If asking for a list, format it clearly. If asking for counts or summaries, provide specific numbers.
Be conversational and helpful while being accurate to the data provided.
      `;

      return await openai.generateResponse(enhancedPrompt, context);
    } catch (openaiError) {
      console.warn('OpenAI unavailable, using intelligent fallback');
      return this.generateIntelligentFallback(query, intent, loans, parameters);
    }
  }

  private generateIntelligentFallback(query: string, intent: string, loans: any[], parameters: any): string {
    const lowerQuery = query.toLowerCase();

    // Handle count queries
    if (intent === 'count' || lowerQuery.includes('how many')) {
      if (loans.length === 0) {
        return `I found 0 loan applications matching your criteria.`;
      }
      
      const statusText = parameters.status ? ` ${parameters.status}` : '';
      const typeText = parameters.loanType ? ` ${parameters.loanType}` : '';
      return `I found ${loans.length}${statusText}${typeText} loan application${loans.length !== 1 ? 's' : ''} matching your criteria.`;
    }

    // Handle specific loan listings
    if (loans.length > 0) {
      const loanList = loans.slice(0, 10).map((loan, index) => {
        const source = loan.source;
        return `${index + 1}. ${source?.customerName || 'Customer'} - ${source?.loanType} loan for $${source?.amount?.toLocaleString()} (Status: ${source?.status})${source?.riskScore ? ` - Risk Score: ${source?.riskScore}` : ''}`;
      }).join('\n');

      let prefix = '';
      if (intent === 'status_filter') {
        const status = parameters.status || Object.values(parameters.filters || {})[0];
        prefix = `Here are the ${status} loan applications:\n\n`;
      } else if (intent === 'amount_filter') {
        if (parameters.minAmount && parameters.maxAmount) {
          prefix = `Here are loan applications between $${parameters.minAmount.toLocaleString()} and $${parameters.maxAmount.toLocaleString()}:\n\n`;
        } else if (parameters.minAmount) {
          prefix = `Here are loan applications above $${parameters.minAmount.toLocaleString()}:\n\n`;
        } else if (parameters.maxAmount) {
          prefix = `Here are loan applications below $${parameters.maxAmount.toLocaleString()}:\n\n`;
        }
      } else {
        prefix = `Here are the loan applications I found:\n\n`;
      }

      const suffix = loans.length > 10 ? `\n\n... and ${loans.length - 10} more applications.` : '';
      
      return `${prefix}${loanList}${suffix}`;
    }

    // No results found
    if (intent === 'status_filter') {
      const status = Object.values(parameters.filters || {})[0] || 'specified';
      return `I didn't find any ${status} loan applications in our system.`;
    }
    
    if (intent === 'amount_filter') {
      if (parameters.minAmount && parameters.maxAmount) {
        return `I didn't find any loan applications between $${parameters.minAmount.toLocaleString()} and $${parameters.maxAmount.toLocaleString()}.`;
      } else if (parameters.minAmount) {
        return `I didn't find any loan applications above $${parameters.minAmount.toLocaleString()}.`;
      } else if (parameters.maxAmount) {
        return `I didn't find any loan applications below $${parameters.maxAmount.toLocaleString()}.`;
      }
    }

    return this.generateFallbackResponse(query);
  }

  private generateFallbackResponse(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
      return "Hello! I'm your AI loan assistant. I can help you find loan applications by status (active, pending, rejected), amount ranges, customer names, loan types, and more. What would you like to know?";
    }
    
    if (lowerQuery.includes('help')) {
      return `I can help you with various loan queries such as:
• "Show me all active loans"
• "Give me pending loan applications" 
• "Find loans above $50,000"
• "Show me personal loans"
• "How many approved loans are there?"
• "Find high risk loan applications"

What would you like to search for?`;
    }

    return "I can help you search for loan applications by status, amount, customer name, loan type, and more. Try asking something like 'Show me all pending loans' or 'Find loans above $50,000'. What would you like to know?";
  }

  async indexLoanApplication(loanApp: any): Promise<void> {
    try {
      await elasticsearch.indexDocument('loan_applications', loanApp.id.toString(), loanApp);
    } catch (error) {
      console.warn('Failed to index loan application in Elasticsearch:', error);
    }
  }

  async indexDocument(document: any): Promise<void> {
    try {
      if (document.extractedText) {
        await elasticsearch.indexDocument('documents', document.id.toString(), document);
      }
    } catch (error) {
      console.warn('Failed to index document in Elasticsearch:', error);
    }
  }
}

export const rag = new RAGService();