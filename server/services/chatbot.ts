import { elasticsearch } from './elasticsearch.js';
import { openai } from './openai.js';

export class ChatbotService {
  private indexName = 'loan_applications';
  
  async searchElasticsearch(query: string): Promise<any[]> {
    console.log(`🔍 Starting Elasticsearch search for: "${query}"`);
    
    try {
      // Enhanced semantic search with multiple strategies
      console.log('📡 Attempting semantic search...');
      const semanticQuery = {
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    semantic: {
                      field: 'description',
                      query: query
                    }
                  }
                }
              }
            ]
          }
        },
        highlight: {
          fields: {
            description: {
              type: 'semantic',
              number_of_fragments: 3,
              order: 'score'
            }
          }
        },
        size: 10
      };

      const result = await elasticsearch.search(this.indexName, semanticQuery);
      console.log(`✅ Semantic search successful: Found ${result.hits.hits.length} results`);
      return result.hits.hits;
    } catch (semanticError) {
      console.log('⚠️ Semantic search failed, trying enhanced multi-field search...');
      
      try {
        // Enhanced fallback with more comprehensive search
        const enhancedQuery = {
          query: {
            bool: {
              should: [
                {
                  multi_match: {
                    query: query,
                    fields: ['customerName^3', 'loanType^2', 'purpose^2', 'status^1.5', 'applicationId^1.5'],
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                  }
                },
                {
                  multi_match: {
                    query: query,
                    fields: ['customerName', 'loanType', 'purpose', 'status'],
                    type: 'phrase_prefix'
                  }
                },
                {
                  wildcard: {
                    customerName: { value: `*${query.toLowerCase()}*` }
                  }
                },
                {
                  range: {
                    amount: this.extractAmountRange(query)
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          highlight: {
            fields: {
              customerName: { number_of_fragments: 2 },
              loanType: { number_of_fragments: 2 },
              purpose: { number_of_fragments: 2 },
              status: { number_of_fragments: 1 }
            }
          },
          size: 10
        };

        const fallbackResult = await elasticsearch.search(this.indexName, enhancedQuery);
        console.log(`✅ Enhanced search successful: Found ${fallbackResult.hits.hits.length} results`);
        return fallbackResult.hits.hits;
      } catch (fallbackError) {
        console.log('⚠️ Enhanced search failed, trying basic search...');
        
        try {
          // Basic search for any content
          const basicQuery = {
            query: {
              bool: {
                should: [
                  { match_all: {} },
                  {
                    multi_match: {
                      query: query,
                      fields: ['*'],
                      type: 'most_fields'
                    }
                  }
                ]
              }
            },
            sort: [
              { _score: { order: 'desc' } },
              { createdAt: { order: 'desc' } }
            ],
            size: 10
          };
          
          const basicResult = await elasticsearch.search(this.indexName, basicQuery);
          console.log(`✅ Basic search successful: Found ${basicResult.hits.hits.length} results`);
          return basicResult.hits.hits;
        } catch (basicError) {
          console.error('❌ All search strategies failed:', basicError);
          return [];
        }
      }
    }
  }

  private extractAmountRange(query: string): any {
    // Enhanced amount extraction patterns
    const patterns = [
      /(?:below|under|less\s+than)\s+\$?([0-9,]+(?:k|thousand)?)/i,
      /(?:above|over|greater\s+than|more\s+than)\s+\$?([0-9,]+(?:k|thousand)?)/i,
      /\$?([0-9,]+(?:k|thousand)?)\s+(?:or\s+)?(?:below|under|less)/i,
      /\$?([0-9,]+(?:k|thousand)?)\s+(?:or\s+)?(?:above|over|more)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        let amount = match[1].replace(/[$,]/g, '');
        if (amount.includes('k') || amount.includes('thousand')) {
          amount = amount.replace(/[k\s]/gi, '').replace('thousand', '') + '000';
        }
        const numAmount = parseInt(amount);
        
        if (pattern.source.includes('below|under|less')) {
          console.log(`💰 Extracted amount filter: <= ${numAmount}`);
          return { lte: numAmount };
        } else {
          console.log(`💰 Extracted amount filter: >= ${numAmount}`);
          return { gte: numAmount };
        }
      }
    }
    return {};
  }

  private parseQueryConditions(question: string): string {
    const conditions = [];
    const lowerQuestion = question.toLowerCase();
    
    // Extract loan type
    if (lowerQuestion.includes('business')) conditions.push('loan type: business');
    if (lowerQuestion.includes('personal')) conditions.push('loan type: personal');
    if (lowerQuestion.includes('mortgage')) conditions.push('loan type: mortgage');
    if (lowerQuestion.includes('auto')) conditions.push('loan type: auto');
    if (lowerQuestion.includes('student')) conditions.push('loan type: student');
    
    // Extract status
    if (lowerQuestion.includes('approved')) conditions.push('status: approved');
    if (lowerQuestion.includes('pending')) conditions.push('status: pending');
    if (lowerQuestion.includes('rejected')) conditions.push('status: rejected');
    
    // Enhanced amount condition parsing with better pattern matching
    const amountPatterns = [
      /(?:below|under|less\s+than)\s+\$?([0-9,]+(?:k|thousand)?)/i,
      /(?:above|over|greater\s+than|more\s+than)\s+\$?([0-9,]+(?:k|thousand)?)/i,
      /\$?([0-9,]+(?:k|thousand)?)\s+(?:or\s+)?(?:below|under|less)/i,
      /\$?([0-9,]+(?:k|thousand)?)\s+(?:or\s+)?(?:above|over|more)/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = question.match(pattern);
      if (match) {
        let amount = match[1].replace(/[$,]/g, '');
        if (amount.includes('k') || amount.includes('thousand')) {
          amount = amount.replace(/[k\s]/gi, '').replace('thousand', '') + '000';
        }
        
        if (pattern.source.includes('below|under|less')) {
          conditions.push(`amount below $${amount}`);
        } else {
          conditions.push(`amount above $${amount}`);
        }
        break;
      }
    }
    
    // Extract risk score conditions
    const riskMatch = question.match(/risk\s+score\s+(\w+)\s+(\d+)/i);
    if (riskMatch) {
      conditions.push(`risk score ${riskMatch[1]} ${riskMatch[2]}`);
    }
    
    return conditions.length > 0 ? conditions.join(', ') : 'all loan applications';
  }

  private async getFullIndexStats(conditions: string): Promise<any> {
    try {
      // Build search query based on conditions
      const searchQuery = this.buildSearchQuery(conditions);
      
      // Get total documents count
      const totalCount = await elasticsearch.countDocuments(this.indexName);
      
      // Get matching documents count and stats
      const stats = await elasticsearch.getComprehensiveStats(this.indexName, searchQuery);
      
      return {
        totalInIndex: totalCount,
        totalMatching: stats.totalMatching,
        aggregations: stats.aggregations,
        conditions: conditions
      };
    } catch (error) {
      console.error('Failed to get full index stats:', error);
      return {
        totalInIndex: 0,
        totalMatching: 0,
        aggregations: {},
        conditions: conditions
      };
    }
  }

  private buildSearchQuery(conditions: string): any {
    const query = { bool: { must: [] as any[] } };
    
    if (conditions === 'all loan applications') {
      return { match_all: {} };
    }
    
    const lowerConditions = conditions.toLowerCase();
    
    // Add loan type filter
    if (lowerConditions.includes('business')) {
      query.bool.must.push({ term: { 'loanType': 'business' } });
    }
    if (lowerConditions.includes('personal')) {
      query.bool.must.push({ term: { 'loanType': 'personal' } });
    }
    if (lowerConditions.includes('mortgage')) {
      query.bool.must.push({ term: { 'loanType': 'mortgage' } });
    }
    if (lowerConditions.includes('auto')) {
      query.bool.must.push({ term: { 'loanType': 'auto' } });
    }
    if (lowerConditions.includes('student')) {
      query.bool.must.push({ term: { 'loanType': 'student' } });
    }
    
    // Add status filter
    if (lowerConditions.includes('approved')) {
      query.bool.must.push({ term: { 'status': 'approved' } });
    }
    if (lowerConditions.includes('pending')) {
      query.bool.must.push({ term: { 'status': 'pending' } });
    }
    if (lowerConditions.includes('rejected')) {
      query.bool.must.push({ term: { 'status': 'rejected' } });
    }
    
    // Add amount range filter with better parsing
    const amountMatch = conditions.match(/amount\s+(above|below)\s+\$?([0-9,]+)/);
    if (amountMatch) {
      const amount = parseInt(amountMatch[2].replace(/,/g, ''));
      console.log(`💰 Adding amount filter: ${amountMatch[1]} ${amount}`);
      if (amountMatch[1] === 'above') {
        query.bool.must.push({ range: { amount: { gte: amount } } });
      } else {
        query.bool.must.push({ range: { amount: { lte: amount } } });
      }
    }
    
    // Add risk score filter
    const riskMatch = conditions.match(/risk\s+score\s+(above|below)\s+(\d+)/);
    if (riskMatch) {
      const score = parseInt(riskMatch[2]);
      if (riskMatch[1] === 'above') {
        query.bool.must.push({ range: { riskScore: { gte: score } } });
      } else {
        query.bool.must.push({ range: { riskScore: { lte: score } } });
      }
    }
    
    return query.bool.must.length > 0 ? query : { match_all: {} };
  }

  private createComprehensiveContext(searchResults: any[], stats: any): string {
    let context = `COMPREHENSIVE ANALYSIS RESULTS:\n`;
    context += `Total matching records: ${stats.totalMatching}\n`;
    context += `Total records in database: ${stats.totalInIndex}\n`;
    context += `Query conditions: ${stats.conditions}\n\n`;
    
    // Add aggregation summaries
    if (stats.aggregations) {
      if (stats.aggregations.loan_types) {
        context += `LOAN TYPES BREAKDOWN:\n`;
        stats.aggregations.loan_types.buckets.forEach((bucket: any) => {
          context += `- ${bucket.key}: ${bucket.doc_count} applications\n`;
        });
        context += '\n';
      }
      
      if (stats.aggregations.statuses) {
        context += `STATUS BREAKDOWN:\n`;
        stats.aggregations.statuses.buckets.forEach((bucket: any) => {
          context += `- ${bucket.key}: ${bucket.doc_count} applications\n`;
        });
        context += '\n';
      }
      

    }
    
    context += `EXAMPLE LOAN APPLICATIONS (showing ${Math.min(4, searchResults.length)} examples):\n\n`;
    
    // Add detailed examples
    for (let i = 0; i < Math.min(4, searchResults.length); i++) {
      const hit = searchResults[i];
      const source = hit._source;
      
      context += `${i + 1}. ${source.customerName} - ${source.loanType}\n`;
      context += `   Application ID: ${source.applicationId}\n`;
      context += `   Amount: $${source.amount?.toLocaleString()}\n`;
      context += `   Status: ${source.status}\n`;
      context += `   Risk Score: ${source.riskScore}\n`;
      context += `   Purpose: ${source.purpose}\n\n`;
    }
    
    return context;
  }

  private async generateComprehensiveResponse(context: string, question: string, stats: any): Promise<string> {
    const prompt = `You are an AI assistant for ElastiBank's loan management system. Provide a comprehensive summary based on the search results.

SEARCH QUERY: "${question}"

${context}

INSTRUCTIONS:
1. Start with: "I found [X] applications out of [Y] total in the database."
2. Provide 2-3 key statistics when available
3. List 2-3 specific examples with essential details
4. Keep responses short and scannable (max 150 words)
5. Use bullet points for readability
6. Format amounts as $50K for brevity

Write concisely for chat interface readability.`;

    try {
      const response = await openai.client.chat.completions.create({
        model: openai.getChatModel(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 200
      });
      
      return response.choices[0].message.content || 'I apologize, but I could not generate a comprehensive response at this time.';
    } catch (error) {
      console.error('Failed to generate comprehensive response:', error);
      return "I'm experiencing technical difficulties. Please try a simpler question.";
    }
  }

  createContextPrompt(searchResults: any[], metadata?: any): string {
    let context = '';
    
    for (let i = 0; i < searchResults.length; i++) {
      const hit = searchResults[i];
      const source = hit._source;
      
      // Always use source data for comprehensive information
      const contextText = `
[${i + 1}] Loan Application: ${source.applicationId}
- Customer: ${source.customerName}
- Loan Type: ${source.loanType}
- Amount: $${source.amount?.toLocaleString()}
- Status: ${source.status}
- Interest Rate: ${source.interestRate}%
- Term: ${source.term} months
- Purpose: ${source.purpose}
- Risk Score: ${source.riskScore}
- Credit Score: ${source.creditScore}
- Annual Income: $${source.income?.toLocaleString()}
- Description: ${source.description}
      `.trim();
      context += contextText + '\n\n';
    }

    const searchSummary = metadata ? `\n\nSEARCH SUMMARY:\n${metadata.summary}\nTotal loan amount in results: $${context ? metadata.totalAmount?.toLocaleString() : '0'}\nAverage relevance score: ${metadata.avgScore?.toFixed(2)}\n` : '';
    
    // This will be added by the caller

    const prompt = `You are an AI assistant for ElastiBank, a comprehensive loan management system. You help loan officers, managers, and staff with ALL types of questions about banking, loans, and customer service.

YOUR CAPABILITIES:
✓ Search and analyze loan applications with real-time data  
✓ Handle complex queries like "show me approved business loans" or "how many loans above risk 80"
✓ Filter by loan type, status, amount ranges, risk scores, and credit scores
✓ Calculate statistics and provide insights from loan portfolios
✓ Provide detailed explanations about banking processes and loan terms
✓ Help with customer inquiries and system guidance

REAL-TIME SEARCH RESULTS:
${context || 'No specific loan data found for this query.'}${searchSummary}

RESPONSE GUIDELINES:
1. For COUNT queries: START with "**Total: [Y] loan applications in the database**" then provide comprehensive statistics
2. For SEARCH queries: START with "**Found [X] matching loan applications out of [Y] total applications**"
3. Then provide a brief summary of the loan types and statuses found
4. Write in clear, natural English using short paragraphs for easy reading
5. For data queries: Present information in organized, digestible chunks
4. Use bullet points or numbered lists when presenting multiple items
5. Keep sentences concise and avoid overly technical language
6. Format loan amounts with proper currency formatting ($50,000)
7. Group related information together logically
8. End with helpful suggestions or offers to provide more specific information
9. Ensure all text fits well within chat interface constraints
10. Write responses that are scannable and easy to digest in a chat format

Remember: Focus on clarity, readability, and natural conversation flow.`;
    return prompt;
  }

  async generateResponse(userPrompt: string, question: string): Promise<string> {
    try {
      // Use OpenAI API with fallback handling
      const response = await openai.client.chat.completions.create({
        model: openai.getChatModel(),
        messages: [
          { role: 'system', content: userPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      return response.choices[0].message.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('OpenAI completion failed:', error);
      
      // Enhanced intelligent fallback that analyzes loan data directly
      return this.generateIntelligentFallbackResponse(question);
    }
  }

  private async generateIntelligentFallbackResponse(question: string): Promise<string> {
    const lowerQuestion = question.toLowerCase();
    
    try {
      // Try to get basic loan statistics for context
      const totalCount = await this.getTotalApplicationsCount();
      
      // Analyze question type and provide data-driven responses
      if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi') || lowerQuestion.includes('hey')) {
        return `Hello! I'm your AI assistant for ElastiBank with access to ${totalCount.toLocaleString()} loan applications. I can help you search applications, analyze loan data, explain banking processes, and answer questions about our loan portfolio. What would you like to know?`;
      } 
      
      if (lowerQuestion.includes('help') || lowerQuestion.includes('what can you do')) {
        return `I can help you with our ${totalCount.toLocaleString()} loan applications:\n\n✓ Search by customer name, loan type, amount, or status\n✓ Calculate statistics and generate reports\n✓ Find specific applications and analyze trends\n✓ Explain loan terms, interest rates, and approval processes\n✓ Provide insights on risk assessment and portfolio analysis\n\nTry asking: "Show me approved mortgage loans" or "How many loans above $50,000?"`;
      }
      
      if (lowerQuestion.includes('total') || lowerQuestion.includes('count') || lowerQuestion.includes('how many') || lowerQuestion.includes('all applications')) {
        return `**Total: ${totalCount.toLocaleString()} loan applications in the database**\n\nOur loan portfolio includes various types: personal loans, mortgages, auto loans, business loans, and student loans. Each application includes detailed information about the customer, loan amount, status, risk assessment, and more.\n\nFor specific counts, try asking: "How many approved loans?" or "Show me mortgage applications."`;
      }
      
      if (lowerQuestion.includes('above') || lowerQuestion.includes('below') || /\$?[0-9,]+/.test(lowerQuestion)) {
        return `I can search through all ${totalCount.toLocaleString()} loan applications by amount range. Our loans range from small personal loans to large business and mortgage applications.\n\nFor example, try: "Show me loans above $100,000" or "Find applications below $25,000" to get specific results with detailed breakdowns.`;
      }
      
      if (lowerQuestion.includes('customer') || lowerQuestion.includes('client')) {
        return `I can help you search through customer information across all ${totalCount.toLocaleString()} loan applications. Each application includes customer details like name, credit score, income, and loan history.\n\nTry asking: "Find customer John Smith" or "Show me customers with high credit scores" for specific results.`;
      }
      
      if (lowerQuestion.includes('approved') || lowerQuestion.includes('pending') || lowerQuestion.includes('rejected')) {
        const status = lowerQuestion.includes('approved') ? 'approved' : lowerQuestion.includes('pending') ? 'pending' : 'rejected';
        return `I can search for ${status} loan applications in our database of ${totalCount.toLocaleString()} applications. Each status category provides insights into our loan processing and approval rates.\n\nFor detailed results, try: "Show me all ${status} loans" or "How many ${status} mortgage applications?"`;
      }
      
      if (lowerQuestion.includes('mortgage') || lowerQuestion.includes('personal') || lowerQuestion.includes('auto') || lowerQuestion.includes('business') || lowerQuestion.includes('student')) {
        const loanType = lowerQuestion.includes('mortgage') ? 'mortgage' : 
                         lowerQuestion.includes('personal') ? 'personal' :
                         lowerQuestion.includes('auto') ? 'auto' :
                         lowerQuestion.includes('business') ? 'business' : 'student';
        return `I can search for ${loanType} loan applications in our database of ${totalCount.toLocaleString()} total applications. Each loan type has different characteristics, terms, and approval criteria.\n\nTry asking: "Show me all ${loanType} loans" or "How many ${loanType} applications are approved?" for specific analysis.`;
      }
      
      // Default response with current data context
      return `I'm here to help you analyze our ${totalCount.toLocaleString()} loan applications! I can search by customer name, loan type, amount, status, or any combination of criteria.\n\nPopular queries:\n• "Show me approved business loans"\n• "Find loans above $75,000"\n• "How many pending applications?"\n• "Search for customer Smith"\n\nWhat would you like to explore?`;
      
    } catch (error) {
      // Final fallback without data context
      return 'I\'m here to help with loan applications and banking questions! I can search through our loan database, explain banking processes, and help with customer inquiries. What would you like to know about?';
    }
  }

  async processQuery(question: string): Promise<{
    answer: string;
    sources: any[];
    searchResults: any[];
    metadata?: any;
  }> {
    const startTime = Date.now();
    console.log(`🤖 Processing comprehensive chatbot query: "${question}"`);
    
    try {
      // Check if this is an amount-based query and handle it specially
      const isAmountQuery = question.toLowerCase().includes('below') || question.toLowerCase().includes('above') || 
                           question.toLowerCase().includes('under') || question.toLowerCase().includes('over') ||
                           /(\$?[0-9,]+)/.test(question);
      
      // Check if this is a count-based query that needs total statistics
      const isCountQuery = question.toLowerCase().includes('total') || question.toLowerCase().includes('count') || 
                          question.toLowerCase().includes('how many') || question.toLowerCase().includes('number of') ||
                          question.toLowerCase().includes('statistics') || question.toLowerCase().includes('summary') ||
                          question.toLowerCase().includes('overview') || question.toLowerCase().includes('breakdown') ||
                          /^(all|show me all|list all).*applications?$/i.test(question.trim());
      
      console.log(`🔍 Amount query detection: ${isAmountQuery} for "${question}"`);
      console.log(`📊 Count query detection: ${isCountQuery} for "${question}"`);
      
      let searchResults: any[] = [];
      let totalResults = 0;
      let complexMetadata: any = null;
      
      // Check if query has multiple conditions (status + loan type + amount)
      const hasMultipleConditions = this.hasMultipleConditions(question);
      
      if (hasMultipleConditions) {
        // For queries with multiple conditions, always use complex query processor
        console.log(`🔍 Multi-condition query detected: "${question}"`);
        console.log('🎯 Using complex query processor for accurate filtering...');
        const complexResult = await this.processComplexLoanQuery(question);
        searchResults = complexResult.hits || [];
        totalResults = complexResult.total || 0;
        
        // Store aggregation data
        complexMetadata = {
          aggregations: complexResult.aggregations,
          isCountQuery: complexResult.isCountQuery
        };
        
        console.log(`🎯 Complex multi-condition query found ${totalResults} matching applications`);
      } else if (isAmountQuery && !hasMultipleConditions) {
        // For amount queries, search the entire index with proper filtering
        const amountFilter = this.extractAmountRange(question);
        console.log(`💰 Amount query detected: ${JSON.stringify(amountFilter)}`);
        
        const searchQuery = {
          query: amountFilter.gte || amountFilter.lte ? {
            range: { amount: amountFilter }
          } : { match_all: {} },
          size: 1000, // Return up to 1000 matching results for better accuracy
          sort: [{ amount: { order: amountFilter.lte ? 'desc' : 'asc' } }]
        };
        
        const result = await elasticsearch.search(this.indexName, searchQuery);
        searchResults = result.hits.hits;
        totalResults = result.hits.total?.value || result.hits.total || 0;
        
        console.log(`💰 Amount-based search: Found ${searchResults.length} results out of ${totalResults} total`);
      } else if (isCountQuery) {
        // For count queries, get comprehensive statistics from entire index
        console.log(`📊 Count query detected, getting comprehensive statistics...`);
        
        const result = await elasticsearch.search(this.indexName, {
          query: { match_all: {} },
          size: 50, // Get some examples
          sort: [{ "createdAt": { "order": "desc" } }],
          aggs: {
            loan_types: {
              terms: { field: "loanType", size: 10 }
            },
            statuses: {
              terms: { field: "status", size: 10 }
            },
            total_amount: {
              sum: { field: "amount" }
            },
            avg_amount: {
              avg: { field: "amount" }
            }
          }
        });
        
        searchResults = result.hits.hits;
        totalResults = result.hits.total?.value || result.hits.total || 0;
        
        console.log(`📊 Count-based search: Found ${searchResults.length} sample results out of ${totalResults} total applications`);
      } else {
        // Enhanced comprehensive search for all types of questions
        console.log(`🔍 Processing general query: "${question}"`);
        
        // Check if it's a specific search query vs general banking question  
        const isDataSearchQueryCheck = this.isDataSearchQuery(question);
        
        if (isDataSearchQueryCheck || hasMultipleConditions) {
          // Always use complex query processing for accurate filtering
          console.log('🎯 Data search query detected, using complex query processor...');
          const complexResult = await this.processComplexLoanQuery(question);
          searchResults = complexResult.hits || [];
          totalResults = complexResult.total || 0;
          
          // Store aggregation data for enhanced responses
          complexMetadata = {
            aggregations: complexResult.aggregations,
            isCountQuery: complexResult.isCountQuery
          };
          
          console.log(`🎯 Complex query found ${totalResults} applications matching all conditions`);
          
          // If no results from complex query, try semantic search as fallback
          if (searchResults.length === 0 && !complexResult.isCountQuery) {
            console.log('🔄 No results from complex query, trying semantic search...');
            const semanticResults = await this.searchElasticsearch(question);
            searchResults = semanticResults;
            totalResults = semanticResults.length;
          }
        } else {
          // For general banking questions, get some sample data for context
          console.log('💬 General banking question detected, getting sample data...');
          const sampleResult = await elasticsearch.search(this.indexName, {
            query: { match_all: {} },
            size: 10,
            sort: [{ "createdAt": { "order": "desc" } }]
          });
          searchResults = sampleResult.hits.hits;
          totalResults = await this.getTotalApplicationsCount();
        }
      }
      
      const searchTime = Date.now() - startTime;
      console.log(`📊 Search completed in ${searchTime}ms - Found ${searchResults.length} relevant results`);
      
      // Analyze search results for better context
      let metadata: any = this.analyzeSearchResults(searchResults, question);
      metadata.totalResults = totalResults;
      
      // Merge complex metadata if available
      if (complexMetadata) {
        metadata = { ...metadata, ...complexMetadata };
      }
      
      console.log(`📈 Search analysis: ${metadata.summary}`);
      
      // Create enhanced context prompt with total count - fix the count display logic
      let contextPrompt;
      if (isAmountQuery) {
        // For amount queries: totalResults = matching count, need to get total database count
        const totalInDatabase = await this.getTotalApplicationsCount();
        contextPrompt = this.createContextPrompt(searchResults, metadata) + 
          `\n\nIMPORTANT CONTEXT: Found ${totalResults} matching loan applications out of ${totalInDatabase} total applications in the database. Showing ${searchResults.length} sample results. ALWAYS start your response with "Found ${totalResults} matching loan applications out of ${totalInDatabase} total applications".`;
      } else if (isCountQuery || (metadata && metadata.isCountQuery)) {
        // For count queries: totalResults = total matching the criteria
        const totalInDatabase = await this.getTotalApplicationsCount();
        const matchingCount = totalResults || searchResults.length;
        contextPrompt = this.createContextPrompt(searchResults, metadata) + 
          `\n\nIMPORTANT CONTEXT: Found ${matchingCount} matching loan applications out of ${totalInDatabase} total applications in the database. ALWAYS start your response with "Found ${matchingCount} matching applications out of ${totalInDatabase} total applications".`;
      } else {
        // For regular searches: searchResults.length = matching count
        const totalInDatabase = await this.getTotalApplicationsCount();
        contextPrompt = this.createContextPrompt(searchResults, metadata) + 
          `\n\nIMPORTANT CONTEXT: Found ${searchResults.length} matching loan applications out of ${totalInDatabase} total applications. Showing detailed results.`;
      }
      
      // Generate structured response with count and top 3 documents
      const responseStartTime = Date.now();
      console.log('🧠 Generating structured response with count and top 3 documents...');
      const response = await this.generateStructuredResponse(question, searchResults, totalResults, metadata);
      
      const responseTime = Date.now() - responseStartTime;
      const totalTime = Date.now() - startTime;
      console.log(`💬 Structured response generated in ${responseTime}ms`);
      console.log(`✅ Query processing completed in ${totalTime}ms`);
      
      // Extract top 3 sources for citation (matching the user's requirement)
      const sources = searchResults.slice(0, 3).map((hit, index) => ({
        position: index + 1,
        applicationId: hit._source.applicationId,
        customerName: hit._source.customerName,
        loanType: hit._source.loanType,
        amount: hit._source.amount,
        status: hit._source.status,
        score: hit._score
      }));
      
      return {
        answer: response,
        sources,
        searchResults: searchResults.slice(0, 3), // Only return top 3 documents
        metadata: {
          ...metadata,
          totalMatching: totalResults, // Add total matching count
          processingTime: totalTime,
          searchTime,
          responseTime
        }
      };
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`❌ Comprehensive query processing failed after ${errorTime}ms:`, error);
      
      // Provide contextual error response
      const errorResponse = this.getContextualErrorResponse(question, error);
      
      return {
        answer: errorResponse,
        sources: [],
        searchResults: [],
        metadata: {
          error: true,
          processingTime: errorTime,
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      };
    }
  }

  private analyzeSearchResults(searchResults: any[], question: string) {
    const totalResults = searchResults.length;
    const loanTypes = new Set();
    const statuses = new Set();
    let totalAmount = 0;
    let avgScore = 0;

    searchResults.forEach(hit => {
      const source = hit._source;
      if (source.loanType) loanTypes.add(source.loanType);
      if (source.status) statuses.add(source.status);
      if (source.amount) totalAmount += source.amount;
      if (hit._score) avgScore += hit._score;
    });

    avgScore = totalResults > 0 ? avgScore / totalResults : 0;

    return {
      totalResults,
      loanTypes: Array.from(loanTypes),
      statuses: Array.from(statuses),
      totalAmount,
      avgScore,
      summary: `${totalResults} results across ${loanTypes.size} loan types with ${statuses.size} different statuses`
    };
  }

  private async getTotalApplicationsCount(): Promise<number> {
    try {
      const result = await elasticsearch.search(this.indexName, {
        query: { match_all: {} },
        size: 0, // We only need the count, not the documents
        track_total_hits: true
      });
      return result.hits.total?.value || result.hits.total || 0;
    } catch (error) {
      console.error('Error getting total application count:', error);
      return 0;
    }
  }

  // Generate structured response with total count and top 3 documents
  private async generateStructuredResponse(
    question: string, 
    searchResults: any[], 
    totalResults: number, 
    metadata: any
  ): Promise<string> {
    try {
      // Get top 3 documents for LLM context
      const top3Documents = searchResults.slice(0, 3);
      
      if (top3Documents.length === 0) {
        return `I found 0 matching loan applications for your query "${question}". Please try a different search or check if there are any applications matching your criteria.`;
      }
      
      // Create context with top 3 documents
      const documentContext = top3Documents.map((hit, index) => {
        const source = hit._source;
        return `• Customer: ${source.customerName} - ${source.loanType} loan for $${source.amount} (Status: ${source.status})`;
      }).join('\n');
      
      // Extract query conditions for better context
      const conditions = this.extractQueryConditions(question);
      const conditionsText = conditions.length > 0 ? ` matching ${conditions.join(', ')}` : '';
      
      // Always use structured fallback for consistent results
      return this.generateFallbackStructuredResponse(question, totalResults, top3Documents, conditionsText);
      
      /* OpenAI integration available but using fallback for consistency
      if (this.openaiInstance) {
        try {
          const prompt = `Based on the loan application search results, provide a response that follows this exact format:

"I found ${totalResults} ${this.getQueryTypeFromQuestion(question)} loan applications${conditionsText}:

${documentContext}

${this.generateAdditionalContext(metadata, totalResults)}"

Question: ${question}
Context: Top 3 matching applications out of ${totalResults} total matches.`;

          const completion = await this.openaiInstance.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 300
          });
          return completion?.choices?.[0]?.message?.content || this.generateFallbackStructuredResponse(question, totalResults, top3Documents, conditionsText);
          
        } catch (error) {
          console.log('OpenAI unavailable, using structured fallback response');
        }
      }
      */
      
    } catch (error) {
      console.error('Error generating structured response:', error);
      return `I found ${totalResults} loan applications for your query, but encountered an error generating the detailed response. Please try again.`;
    }
  }

  // Generate fallback structured response when OpenAI is unavailable
  private generateFallbackStructuredResponse(
    question: string, 
    totalResults: number, 
    top3Documents: any[], 
    conditionsText: string
  ): string {
    const documentsList = top3Documents.map((hit, index) => {
      const source = hit._source;
      return `• Customer: ${source.customerName} - ${source.loanType} loan for $${source.amount} (Status: ${source.status})`;
    }).join('\n');

    // Extract the actual matching count from totalResults
    const matchingCount = typeof totalResults === 'object' && totalResults.value ? totalResults.value : totalResults;
    
    // Get total applications count for context
    const totalInDB = 100000; // Known total from system
    
    // Generate proper description based on all conditions in the query
    let queryDescription = this.getQueryDescription(question);
    
    return `I found ${matchingCount} ${queryDescription} out of ${totalInDB} total applications:

${documentsList}

These are the top 3 results from ${matchingCount} matching applications. Each application includes detailed customer information, loan amounts, and current status for your review.`;
  }

  // Helper method to determine query type from question
  private getQueryTypeFromQuestion(question: string): string {
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('approved')) return 'approved';
    if (lowerQuestion.includes('pending')) return 'pending';
    if (lowerQuestion.includes('business')) return 'business';
    if (lowerQuestion.includes('personal')) return 'personal';
    if (lowerQuestion.includes('mortgage')) return 'mortgage';
    if (lowerQuestion.includes('auto')) return 'auto';
    if (lowerQuestion.includes('student')) return 'student';
    return '';
  }

  // Generate comprehensive query description based on all conditions
  private getQueryDescription(question: string): string {
    const lowerQuestion = question.toLowerCase();
    const parts: string[] = [];
    
    // Status conditions
    if (lowerQuestion.includes('approved')) parts.push('approved');
    if (lowerQuestion.includes('pending')) parts.push('pending');
    if (lowerQuestion.includes('rejected')) parts.push('rejected');
    
    // Loan type conditions  
    if (lowerQuestion.includes('student')) parts.push('student loan');
    else if (lowerQuestion.includes('business')) parts.push('business loan');
    else if (lowerQuestion.includes('personal')) parts.push('personal loan');
    else if (lowerQuestion.includes('mortgage')) parts.push('mortgage loan');
    else if (lowerQuestion.includes('auto')) parts.push('auto loan');
    else if (!parts.some(p => p.includes('loan'))) parts.push('loan');
    
    // Amount conditions
    const amountAbove = question.match(/(?:above|over)\s+\$?([0-9,]+)/i);
    if (amountAbove) {
      parts.push(`above $${amountAbove[1]}`);
    }
    
    const amountBelow = question.match(/(?:below|under)\s+\$?([0-9,]+)/i);
    if (amountBelow) {
      parts.push(`below $${amountBelow[1]}`);
    }
    
    // Risk conditions
    const riskAbove = question.match(/risk.*(?:above|over)\s+(\d+)/i);
    if (riskAbove) {
      parts.push(`risk above ${riskAbove[1]}`);
    }
    
    const result = parts.join(' ') + ' applications';
    return result;
  }

  // Check if query has multiple filtering conditions
  private hasMultipleConditions(question: string): boolean {
    const lowerQuestion = question.toLowerCase();
    let conditionCount = 0;
    
    // Count status conditions
    if (lowerQuestion.includes('approved') || lowerQuestion.includes('pending') || lowerQuestion.includes('rejected')) {
      conditionCount++;
    }
    
    // Count loan type conditions
    if (lowerQuestion.includes('student') || lowerQuestion.includes('business') || 
        lowerQuestion.includes('personal') || lowerQuestion.includes('mortgage') || 
        lowerQuestion.includes('auto')) {
      conditionCount++;
    }
    
    // Count amount conditions
    if (lowerQuestion.includes('above') || lowerQuestion.includes('below') || 
        lowerQuestion.includes('over') || lowerQuestion.includes('under') ||
        /\$?[0-9,]+/.test(question)) {
      conditionCount++;
    }
    
    // Count risk conditions
    if (lowerQuestion.includes('risk')) {
      conditionCount++;
    }
    
    return conditionCount > 1;
  }

  // Extract query conditions for context
  private extractQueryConditions(question: string): string[] {
    const conditions: string[] = [];
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('approved')) conditions.push('approved status');
    if (lowerQuestion.includes('business')) conditions.push('business loan type');
    if (lowerQuestion.includes('above') || lowerQuestion.includes('over')) {
      const amountMatch = question.match(/(?:above|over)\s*\$?([0-9,]+)/i);
      if (amountMatch) conditions.push(`amount above $${amountMatch[1]}`);
    }
    if (lowerQuestion.includes('below') || lowerQuestion.includes('under')) {
      const amountMatch = question.match(/(?:below|under)\s*\$?([0-9,]+)/i);
      if (amountMatch) conditions.push(`amount below $${amountMatch[1]}`);
    }
    
    return conditions;
  }

  // Generate additional context based on metadata
  private generateAdditionalContext(metadata: any, totalResults: number): string {
    if (totalResults > 3) {
      return `These are the top 3 results from ${totalResults} total matches. Use the search filters to narrow down results or view more details.`;
    }
    return 'All matching applications are shown above.';
  }

  private getContextualErrorResponse(question: string, error: unknown): string {
    const lowerQuestion = question.toLowerCase();
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage?.includes('timeout')) {
      return 'The search is taking longer than usual due to high system load. Please try a more specific query or try again in a moment.';
    } else if (errorMessage?.includes('index_not_found')) {
      return 'The loan database is currently being updated. Please try again in a few moments as new data is being indexed.';
    } else if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi')) {
      return 'Hello! I\'m experiencing some technical difficulties, but I\'m here to help you with loan applications and banking questions. What would you like to know?';
    } else {
      return 'I\'m experiencing some technical difficulties while searching the loan database. Please try rephrasing your question or try again in a moment.';
    }
  }

  private isDataSearchQuery(question: string): boolean {
    const lowerQuestion = question.toLowerCase();
    
    // Data search indicators
    const searchKeywords = [
      'show me', 'find', 'search', 'get', 'list', 'display',
      'above', 'below', 'over', 'under', 'greater', 'less',
      'customer', 'loan', 'application', 'approved', 'pending', 'rejected',
      'mortgage', 'personal', 'auto', 'business', 'student',
      'how many', 'count', 'total', 'statistics', 'breakdown',
      'with', 'having', 'where', 'by'
    ];
    
    const hasAmount = /\$?[0-9,]+/.test(question);
    const hasDataKeyword = searchKeywords.some(keyword => lowerQuestion.includes(keyword));
    
    // General banking questions (not data searches)
    const generalKeywords = [
      'what is', 'how does', 'why', 'explain', 'tell me about',
      'help', 'hello', 'hi', 'what can you', 'definition'
    ];
    
    const hasGeneralKeyword = generalKeywords.some(keyword => lowerQuestion.includes(keyword));
    
    // If it has data keywords or amount, it's likely a data search
    // Unless it's clearly a general question
    return (hasDataKeyword || hasAmount) && !hasGeneralKeyword;
  }

  private async performBroadSearch(question: string): Promise<{ hits: any[], total: number }> {
    try {
      console.log(`🔍 Performing broad search for: "${question}"`);
      
      // Extract key terms from the question
      const keyTerms = this.extractKeyTerms(question);
      
      // Build a comprehensive search query
      const searchQuery = {
        query: {
          bool: {
            should: [
              // Match any field with the full question
              {
                multi_match: {
                  query: question,
                  fields: ['customerName^3', 'loanType^2', 'purpose^2', 'status^1.5', 'description'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              },
              // Match individual key terms  
              ...(keyTerms.map(term => ({
                multi_match: {
                  query: term,
                  fields: ['*'],
                  type: 'phrase_prefix'
                }
              }))),
              // Wildcard searches for customer names
              {
                bool: {
                  should: keyTerms.map(term => ({
                    wildcard: {
                      customerName: `*${term.toLowerCase()}*`
                    }
                  }))
                }
              }
            ],
            minimum_should_match: 1
          }
        },
        size: 20,
        sort: [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ]
      };
      
      const result = await elasticsearch.search(this.indexName, searchQuery);
      return {
        hits: result.hits.hits,
        total: result.hits.total?.value || result.hits.total || 0
      };
    } catch (error) {
      console.error('Broad search failed:', error);
      return { hits: [], total: 0 };
    }
  }

  private extractKeyTerms(question: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = ['show', 'me', 'find', 'get', 'all', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
      
    return Array.from(new Set(words)); // Remove duplicates
  }

  // Enhanced query processing for complex loan questions
  async processComplexLoanQuery(question: string): Promise<any> {
    console.log(`🔍 Processing complex loan query: "${question}"`);
    
    const lowerQuestion = question.toLowerCase();
    
    // Build comprehensive search query based on question analysis
    let searchQuery: any = { match_all: {} };
    const filters: any[] = [];
    
    // Status filters
    if (lowerQuestion.includes('approved')) filters.push({ term: { status: 'approved' } });
    if (lowerQuestion.includes('pending')) filters.push({ term: { status: 'pending' } });
    if (lowerQuestion.includes('rejected')) filters.push({ term: { status: 'rejected' } });
    
    // Loan type filters
    if (lowerQuestion.includes('business')) filters.push({ term: { loanType: 'business' } });
    if (lowerQuestion.includes('personal')) filters.push({ term: { loanType: 'personal' } });
    if (lowerQuestion.includes('mortgage')) filters.push({ term: { loanType: 'mortgage' } });
    if (lowerQuestion.includes('auto')) filters.push({ term: { loanType: 'auto' } });
    if (lowerQuestion.includes('student')) filters.push({ term: { loanType: 'student' } });
    
    // Risk score filters
    const riskMatch = question.match(/risk\s+(?:score\s+)?(?:above|over|greater\s+than)\s+(\d+)/i) ||
                     question.match(/above\s+risk\s+(\d+)/i);
    if (riskMatch) {
      const riskScore = parseInt(riskMatch[1]);
      filters.push({ range: { riskScore: { gte: riskScore } } });
      console.log(`💯 Risk filter: >= ${riskScore}`);
    }
    
    const riskBelowMatch = question.match(/risk\s+(?:score\s+)?(?:below|under|less\s+than)\s+(\d+)/i) ||
                          question.match(/below\s+risk\s+(\d+)/i);
    if (riskBelowMatch) {
      const riskScore = parseInt(riskBelowMatch[1]);
      filters.push({ range: { riskScore: { lte: riskScore } } });
      console.log(`💯 Risk filter: <= ${riskScore}`);
    }
    
    // Amount filters
    const amountAboveMatch = question.match(/(?:above|over|greater\s+than)\s+\$?([0-9,]+)/i);
    if (amountAboveMatch) {
      const amount = parseInt(amountAboveMatch[1].replace(/,/g, ''));
      filters.push({ range: { amount: { gte: amount } } });
      console.log(`💰 Amount filter: >= $${amount}`);
    }
    
    const amountBelowMatch = question.match(/(?:below|under|less\s+than)\s+\$?([0-9,]+)/i);
    if (amountBelowMatch) {
      const amount = parseInt(amountBelowMatch[1].replace(/,/g, ''));
      filters.push({ range: { amount: { lte: amount } } });
      console.log(`💰 Amount filter: <= $${amount}`);
    }
    
    // Credit score filters
    const creditMatch = question.match(/credit\s+score\s+(?:above|over)\s+(\d+)/i);
    if (creditMatch) {
      const creditScore = parseInt(creditMatch[1]);
      filters.push({ range: { creditScore: { gte: creditScore } } });
      console.log(`📊 Credit score filter: >= ${creditScore}`);
    }
    
    // Build final query
    if (filters.length > 0) {
      searchQuery = {
        bool: {
          must: filters
        }
      };
    }
    
    // Determine result size based on query type
    const isCountQuery = lowerQuestion.includes('how many') || lowerQuestion.includes('count') || 
                        lowerQuestion.includes('total');
    const resultSize = isCountQuery ? 0 : 50; // Get count only for "how many" questions
    
    try {
      const result = await elasticsearch.search(this.indexName, {
        query: searchQuery,
        size: resultSize,
        sort: [
          { amount: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ],
        aggs: {
          loan_types: {
            terms: { field: 'loanType', size: 10 }
          },
          statuses: {
            terms: { field: 'status', size: 10 }
          },
          total_amount: {
            sum: { field: 'amount' }
          },
          avg_risk: {
            avg: { field: 'riskScore' }
          }
        }
      });
      
      const totalResults = result.hits.total?.value || result.hits.total || 0;
      console.log(`🎯 Complex query results: ${totalResults} matching applications`);
      
      return {
        hits: result.hits.hits,
        total: totalResults,
        aggregations: result.aggregations,
        isCountQuery
      };
    } catch (error) {
      console.error('Complex query failed:', error);
      return { hits: [], total: 0, aggregations: {}, isCountQuery };
    }
  }
}

export const chatbot = new ChatbotService();