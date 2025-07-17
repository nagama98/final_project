import { elasticsearch } from './elasticsearch.js';
import { openai } from './openai.js';
import { storage } from '../storage.js';
import { elasticsearchStorage } from '../storage-elasticsearch.js';

export class RAGService {
  // Convert natural language to Elasticsearch query
  private buildElasticsearchQuery(query: string): any {
    const lowerQuery = query.toLowerCase();
    
    // Base query structure
    const esQuery: any = {
      query: {
        bool: {
          must: [],
          filter: [],
          should: []
        }
      },
      size: 100,
      sort: [{ createdAt: { order: 'desc' } }]
    };

    // Customer name search
    const customerNameMatch = lowerQuery.match(/(?:customer|client|person|individual)\s+(?:named|called)?\s*([a-zA-Z\s]+)/);
    if (customerNameMatch) {
      const customerName = customerNameMatch[1].trim();
      esQuery.query.bool.should.push({
        multi_match: {
          query: customerName,
          fields: ['customerName^2', 'customerFirstName', 'customerLastName'],
          fuzziness: 'AUTO'
        }
      });
    }

    // Customer ID search
    const custIdMatch = lowerQuery.match(/(?:customer\s+id|custid|cust-id|customer\s+identifier)\s*:?\s*([a-zA-Z0-9\-]+)/);
    if (custIdMatch) {
      esQuery.query.bool.filter.push({
        term: { customerId: custIdMatch[1].trim() }
      });
    }

    // Application/Loan ID search
    const loanIdMatch = lowerQuery.match(/(?:loan\s+id|application\s+id|loan\s+number|application\s+number)\s*:?\s*([a-zA-Z0-9\-]+)/);
    if (loanIdMatch) {
      esQuery.query.bool.filter.push({
        term: { applicationId: loanIdMatch[1].trim() }
      });
    }

    // Status filtering
    if (lowerQuery.includes('pending') || lowerQuery.includes('under review')) {
      esQuery.query.bool.filter.push({ term: { status: 'pending' } });
    } else if (lowerQuery.includes('approved') || lowerQuery.includes('active')) {
      esQuery.query.bool.filter.push({ term: { status: 'approved' } });
    } else if (lowerQuery.includes('rejected') || lowerQuery.includes('denied')) {
      esQuery.query.bool.filter.push({ term: { status: 'rejected' } });
    } else if (lowerQuery.includes('disbursed')) {
      esQuery.query.bool.filter.push({ term: { status: 'disbursed' } });
    }

    // Loan type filtering
    if (lowerQuery.includes('personal loan')) {
      esQuery.query.bool.filter.push({ term: { loanType: 'personal' } });
    } else if (lowerQuery.includes('mortgage') || lowerQuery.includes('home loan')) {
      esQuery.query.bool.filter.push({ term: { loanType: 'mortgage' } });
    } else if (lowerQuery.includes('auto loan') || lowerQuery.includes('car loan')) {
      esQuery.query.bool.filter.push({ term: { loanType: 'auto' } });
    } else if (lowerQuery.includes('business loan')) {
      esQuery.query.bool.filter.push({ term: { loanType: 'business' } });
    } else if (lowerQuery.includes('student loan')) {
      esQuery.query.bool.filter.push({ term: { loanType: 'student' } });
    }

    // Amount range filtering
    const amountAbove = lowerQuery.match(/(?:above|over|more than|greater than)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountAbove) {
      const amount = parseFloat(amountAbove[1].replace(/,/g, ''));
      esQuery.query.bool.filter.push({
        range: { amount: { gte: amount } }
      });
    }

    const amountBelow = lowerQuery.match(/(?:below|under|less than)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountBelow) {
      const amount = parseFloat(amountBelow[1].replace(/,/g, ''));
      esQuery.query.bool.filter.push({
        range: { amount: { lte: amount } }
      });
    }

    const amountRange = lowerQuery.match(/between\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+and\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountRange) {
      const minAmount = parseFloat(amountRange[1].replace(/,/g, ''));
      const maxAmount = parseFloat(amountRange[2].replace(/,/g, ''));
      esQuery.query.bool.filter.push({
        range: { amount: { gte: minAmount, lte: maxAmount } }
      });
    }

    // Risk level filtering
    if (lowerQuery.includes('high risk') || lowerQuery.includes('risky')) {
      esQuery.query.bool.filter.push({ term: { riskLevel: 'high' } });
    } else if (lowerQuery.includes('medium risk')) {
      esQuery.query.bool.filter.push({ term: { riskLevel: 'medium' } });
    } else if (lowerQuery.includes('low risk') || lowerQuery.includes('safe')) {
      esQuery.query.bool.filter.push({ term: { riskLevel: 'low' } });
    }

    // If no specific filters, add a general search
    if (esQuery.query.bool.must.length === 0 && esQuery.query.bool.filter.length === 0 && esQuery.query.bool.should.length === 0) {
      esQuery.query.bool.must.push({
        multi_match: {
          query: query,
          fields: ['customerName^2', 'loanType', 'loanPurpose', 'customerEmail', 'applicationId'],
          fuzziness: 'AUTO'
        }
      });
    }

    return esQuery;
  }

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
    if (lowerQuery.includes('personal loan') || lowerQuery.includes('personal')) {
      result.filters.loanType = 'personal';
    } else if (lowerQuery.includes('mortgage') || lowerQuery.includes('home loan')) {
      result.filters.loanType = 'mortgage';
    } else if (lowerQuery.includes('auto loan') || lowerQuery.includes('car loan')) {
      result.filters.loanType = 'auto';
    } else if (lowerQuery.includes('business loan') || lowerQuery.includes('business')) {
      result.filters.loanType = 'business';
    } else if (lowerQuery.includes('student loan') || lowerQuery.includes('student')) {
      result.filters.loanType = 'student';
    }

    // Amount-based queries
    const amountMatches = lowerQuery.match(/above|over|more than|greater than\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatches && amountMatches[1]) {
      result.intent = 'amount_filter';
      result.parameters.minAmount = parseFloat(amountMatches[1].replace(/,/g, ''));
    }

    const belowMatches = lowerQuery.match(/below|under|less than\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (belowMatches && belowMatches[1]) {
      result.intent = 'amount_filter';
      result.parameters.maxAmount = parseFloat(belowMatches[1].replace(/,/g, ''));
    }

    const rangeMatches = lowerQuery.match(/between\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+and\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (rangeMatches && rangeMatches[1] && rangeMatches[2]) {
      result.intent = 'amount_filter';
      result.parameters.minAmount = parseFloat(rangeMatches[1].replace(/,/g, ''));
      result.parameters.maxAmount = parseFloat(rangeMatches[2].replace(/,/g, ''));
    }

    // Customer-specific queries (more specific pattern to avoid false matches)
    const customerMatches = lowerQuery.match(/(?:for customer|for client|loans for)\s+([a-zA-Z\s]+)/);
    if (customerMatches && customerMatches[1] && customerMatches[1].length < 30) {
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
      // First try Elasticsearch with RRF pattern
      const esResults = await elasticsearch.hybridSearch('loan_applications', query, filters);
      
      if (esResults.hits?.hits?.length > 0) {
        return esResults.hits.hits.slice(0, limit).map((hit: any) => ({
          id: hit._id,
          source: hit._source,
          score: hit._score || 1.0,
          highlight: hit.highlight
        }));
      }
      
      // Fall back to smart query processing
      return await this.processSmartQuery(query);
    } catch (error) {
      console.warn('Elasticsearch search failed, falling back to storage search');
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
      console.log('🤖 Processing chatbot query:', userQuery);
      
      // Step 1: Parse natural language query to understand intent
      const parsedQuery = this.parseNaturalLanguageQuery(userQuery);
      console.log('🔍 Parsed query intent:', parsedQuery.intent);
      console.log('🔍 Parsed query filters:', JSON.stringify(parsedQuery.filters));
      console.log('🔍 Parsed query parameters:', JSON.stringify(parsedQuery.parameters));
      
      // Step 2: Get loan applications from Elasticsearch storage directly
      const searchResults = await this.executeDirectElasticsearchSearch(parsedQuery);
      console.log(`📊 Found ${searchResults.length} loan applications`);
      
      // Step 3: Generate context summary for AI model
      const contextSummary = this.generateContextSummary(searchResults, userQuery);
      console.log('📋 Context summary generated for AI processing');
      
      // Step 4: Send query + context to AI model for final response
      const aiResponse = await this.generateAIResponseFromContext(userQuery, searchResults, contextSummary);
      console.log('🎯 AI response generated successfully');
      
      return {
        response: aiResponse,
        context: searchResults.map(result => ({
          id: result.id || result.applicationId,
          source: result,
          score: 1.0
        }))
      };
    } catch (error) {
      console.error('❌ Error in generateRAGResponse:', error);
      const fallbackResponse = this.generateFallbackResponse(userQuery);
      return {
        response: fallbackResponse,
        context: []
      };
    }
  }

  // Direct Elasticsearch search using the actual data store
  private async executeDirectElasticsearchSearch(parsedQuery: any): Promise<any[]> {
    try {
      console.log('🔍 NEW METHOD: executeDirectElasticsearchSearch called');
      // Get all applications from Elasticsearch storage
      const allApplications = await elasticsearchStorage.getAllLoanApplications();
      console.log(`📈 Retrieved ${allApplications.length} total applications from Elasticsearch`);
      
      let filteredApplications = allApplications;
      
      // Apply filters based on parsed query - handle multiple filters
      if (parsedQuery.filters.status) {
        filteredApplications = filteredApplications.filter(app => 
          app.status.toLowerCase() === parsedQuery.filters.status.toLowerCase()
        );
      }
      
      if (parsedQuery.filters.loanType) {
        filteredApplications = filteredApplications.filter(app => 
          app.loanType.toLowerCase() === parsedQuery.filters.loanType.toLowerCase()
        );
      }
      
      if (parsedQuery.intent === 'amount_filter') {
        if (parsedQuery.parameters.minAmount !== undefined) {
          filteredApplications = filteredApplications.filter(app => 
            parseFloat(app.amount) >= parsedQuery.parameters.minAmount
          );
        }
        if (parsedQuery.parameters.maxAmount !== undefined) {
          filteredApplications = filteredApplications.filter(app => 
            parseFloat(app.amount) <= parsedQuery.parameters.maxAmount
          );
        }
      }
      
      if (parsedQuery.intent === 'customer_filter' && parsedQuery.parameters.customerName) {
        filteredApplications = filteredApplications.filter(app => 
          app.customerName?.toLowerCase().includes(parsedQuery.parameters.customerName.toLowerCase())
        );
      }
      
      if (parsedQuery.intent === 'risk_filter') {
        if (parsedQuery.parameters.minRiskScore !== undefined) {
          filteredApplications = filteredApplications.filter(app => 
            app.riskScore >= parsedQuery.parameters.minRiskScore
          );
        }
        if (parsedQuery.parameters.maxRiskScore !== undefined) {
          filteredApplications = filteredApplications.filter(app => 
            app.riskScore <= parsedQuery.parameters.maxRiskScore
          );
        }
      }
      
      console.log(`🎯 Filtered to ${filteredApplications.length} applications based on query`);
      return filteredApplications.slice(0, 50); // Limit results
    } catch (error) {
      console.error('Direct Elasticsearch search failed:', error);
      return [];
    }
  }

  // Enhanced AI response generation with context
  private async generateAIResponseFromContext(query: string, searchResults: any[], contextSummary: string): Promise<string> {
    try {
      const systemPrompt = `You are an AI assistant for ElastiBank's loan management system. You help loan officers and customers with comprehensive loan-related queries.

You have access to real-time loan application data from Elasticsearch. Analyze the query and provide accurate, helpful responses based on the actual data provided.

Context Summary:
${contextSummary}

Sample Applications:
${searchResults.slice(0, 5).map(app => `- ${app.applicationId}: ${app.customerName} - ${app.loanType} loan for $${app.amount?.toLocaleString()} (${app.status}) - Risk: ${app.riskLevel}`).join('\n')}

Guidelines:
- Provide accurate, specific information based on the loan data provided
- For loan listings, format them clearly with bullet points or numbered lists
- For count queries, provide exact numbers from the data
- For amount ranges, show formatted currency values
- Be conversational but professional
- Reference specific loan applications by customer name and application ID when relevant
- Focus on being helpful and informative about loan status, amounts, types, customer information, and risk levels
- Always base responses on the actual data provided in the context`;

      const response = await openai.generateResponse(query, [systemPrompt]);
      return response;
    } catch (openaiError) {
      console.warn('🟡 OpenAI unavailable, using intelligent fallback');
      return this.generateIntelligentFallbackFromResults(query, searchResults);
    }
  }

  // Intelligent fallback based on search results
  private generateIntelligentFallbackFromResults(query: string, searchResults: any[]): string {
    const lowerQuery = query.toLowerCase();

    if (searchResults.length === 0) {
      return `I couldn't find any loan applications matching "${query}". Try searching for specific customer names, loan types (personal, mortgage, auto, business, student), status (pending, approved, rejected), or amount ranges.`;
    }

    // Count queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('total')) {
      const statusBreakdown = this.getStatusBreakdown(searchResults);
      let countResponse = `I found ${searchResults.length} loan applications matching your query.`;
      
      if (Object.keys(statusBreakdown).length > 1) {
        const statusText = Object.entries(statusBreakdown)
          .map(([status, count]) => `${count} ${status}`)
          .join(', ');
        countResponse += ` Breakdown: ${statusText}.`;
      }
      
      return countResponse;
    }

    // List queries
    if (lowerQuery.includes('show') || lowerQuery.includes('list') || lowerQuery.includes('find')) {
      const applicationList = searchResults.slice(0, 10).map((app, index) => {
        const riskLevel = app.riskScore > 70 ? 'High' : app.riskScore > 30 ? 'Medium' : 'Low';
        return `${index + 1}. ${app.customerName} (${app.applicationId}) - ${app.loanType} loan for $${app.amount?.toLocaleString()} - Status: ${app.status} - Risk: ${riskLevel} (${app.riskScore})`;
      }).join('\n');

      let prefix = 'Here are the loan applications I found:\n\n';
      if (searchResults.length > 10) {
        prefix += `Showing top 10 of ${searchResults.length} results:\n\n`;
      }

      return prefix + applicationList;
    }

    // General response
    const summary = this.generateContextSummary(searchResults, query);
    return `I found ${searchResults.length} loan applications. Here's a summary:\n\n${summary}`;
  }

  // Execute Elasticsearch query on loan applications index
  private async executeElasticsearchQuery(esQuery: any): Promise<any[]> {
    try {
      const response = await elasticsearch.search('loan_applications', esQuery);
      
      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error('Elasticsearch query execution failed:', error);
      // Fallback to storage search if Elasticsearch fails
      return await this.fallbackStorageSearch(esQuery);
    }
  }

  // Fallback to storage search if Elasticsearch fails
  private async fallbackStorageSearch(esQuery: any): Promise<any[]> {
    try {
      const allApplications = await storage.getAllLoanApplications();
      
      // Extract filters from the esQuery structure
      let filteredApps = allApplications;
      
      // Apply filters based on the query structure
      if (esQuery.query?.bool?.filter?.length > 0) {
        for (const filter of esQuery.query.bool.filter) {
          if (filter.term?.status) {
            filteredApps = filteredApps.filter(app => app.status === filter.term.status);
          }
          if (filter.term?.loanType) {
            filteredApps = filteredApps.filter(app => app.loanType === filter.term.loanType);
          }
          if (filter.range?.amount) {
            const range = filter.range.amount;
            if (range.gte !== undefined) {
              filteredApps = filteredApps.filter(app => parseFloat(app.amount) >= range.gte);
            }
            if (range.lte !== undefined) {
              filteredApps = filteredApps.filter(app => parseFloat(app.amount) <= range.lte);
            }
          }
        }
      }
      
      // Apply text search if multi_match query exists
      if (esQuery.query?.bool?.must?.length > 0) {
        for (const must of esQuery.query.bool.must) {
          if (must.multi_match) {
            const searchText = must.multi_match.query.toLowerCase();
            filteredApps = filteredApps.filter(app => 
              app.customerName?.toLowerCase().includes(searchText) ||
              app.loanType?.toLowerCase().includes(searchText) ||
              app.applicationId?.toLowerCase().includes(searchText) ||
              app.status?.toLowerCase().includes(searchText)
            );
          }
        }
      }
      
      return filteredApps.slice(0, 100);
    } catch (error) {
      console.error('Fallback storage search failed:', error);
      return [];
    }
  }

  // Generate context summary for AI processing
  private generateContextSummary(results: any[], originalQuery: string): string {
    if (results.length === 0) {
      return `No loan applications found matching the query: "${originalQuery}"`;
    }

    const summary = {
      totalResults: results.length,
      statusBreakdown: this.getStatusBreakdown(results),
      loanTypeBreakdown: this.getLoanTypeBreakdown(results),
      amountStats: this.getAmountStats(results),
      riskLevelBreakdown: this.getRiskLevelBreakdown(results),
      topCustomers: this.getTopCustomers(results),
      sampleApplications: results.slice(0, 5).map(app => ({
        applicationId: app.applicationId,
        customerName: app.customerName,
        amount: app.amount,
        status: app.status,
        loanType: app.loanType,
        riskLevel: app.riskLevel
      }))
    };

    return JSON.stringify(summary, null, 2);
  }

  private getStatusBreakdown(results: any[]): any {
    const breakdown: any = {};
    results.forEach(app => {
      breakdown[app.status] = (breakdown[app.status] || 0) + 1;
    });
    return breakdown;
  }

  private getLoanTypeBreakdown(results: any[]): any {
    const breakdown: any = {};
    results.forEach(app => {
      breakdown[app.loanType] = (breakdown[app.loanType] || 0) + 1;
    });
    return breakdown;
  }

  private getAmountStats(results: any[]): any {
    const amounts = results.map(app => app.amount || 0);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const avg = amounts.length > 0 ? total / amounts.length : 0;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    
    return { total, average: avg, minimum: min, maximum: max };
  }

  private getRiskLevelBreakdown(results: any[]): any {
    const breakdown: any = {};
    results.forEach(app => {
      breakdown[app.riskLevel] = (breakdown[app.riskLevel] || 0) + 1;
    });
    return breakdown;
  }

  private getTopCustomers(results: any[]): any[] {
    const customerMap: any = {};
    results.forEach(app => {
      const customerName = app.customerName || 'Unknown';
      if (!customerMap[customerName]) {
        customerMap[customerName] = {
          name: customerName,
          applications: 0,
          totalAmount: 0
        };
      }
      customerMap[customerName].applications++;
      customerMap[customerName].totalAmount += app.amount || 0;
    });
    
    return Object.values(customerMap).slice(0, 5);
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