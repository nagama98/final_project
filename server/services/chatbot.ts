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
    const query = { bool: { must: [] } };
    
    if (conditions === 'all loan applications') {
      return { match_all: {} };
    }
    
    const lowerConditions = conditions.toLowerCase();
    
    // Add loan type filter
    if (lowerConditions.includes('business')) {
      query.bool.must.push({ term: { 'loanType.keyword': 'business' } });
    }
    if (lowerConditions.includes('personal')) {
      query.bool.must.push({ term: { 'loanType.keyword': 'personal' } });
    }
    if (lowerConditions.includes('mortgage')) {
      query.bool.must.push({ term: { 'loanType.keyword': 'mortgage' } });
    }
    if (lowerConditions.includes('auto')) {
      query.bool.must.push({ term: { 'loanType.keyword': 'auto' } });
    }
    if (lowerConditions.includes('student')) {
      query.bool.must.push({ term: { 'loanType.keyword': 'student' } });
    }
    
    // Add status filter
    if (lowerConditions.includes('approved')) {
      query.bool.must.push({ term: { 'status.keyword': 'approved' } });
    }
    if (lowerConditions.includes('pending')) {
      query.bool.must.push({ term: { 'status.keyword': 'pending' } });
    }
    if (lowerConditions.includes('rejected')) {
      query.bool.must.push({ term: { 'status.keyword': 'rejected' } });
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

    const prompt = `You are an AI assistant for ElastiBank, a comprehensive loan management system. You help loan officers, managers, and staff with ALL types of questions about banking, loans, and customer service.

YOUR CAPABILITIES:
✓ Search and analyze loan applications with real-time data
✓ Provide detailed explanations about banking processes and loan terms
✓ Calculate statistics and provide insights from loan portfolios
✓ Help with customer inquiries and system guidance
✓ Explain loan approval processes and risk assessment

REAL-TIME SEARCH RESULTS:
${context || 'No specific loan data found for this query.'}${searchSummary}

RESPONSE GUIDELINES:
1. Write in clear, natural English using short paragraphs for easy reading
2. Start responses with a friendly acknowledgment of what was found
3. For data queries: Present information in organized, digestible chunks
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
      // Use Azure OpenAI directly with the client
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
      console.error('Azure OpenAI completion failed:', error);
      
      // Provide intelligent fallback responses for all types of questions
      const lowerQuestion = question.toLowerCase();
      
      if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi') || lowerQuestion.includes('hey')) {
        return 'Hello! I\'m your AI assistant for ElastiBank. I can help you with loan applications, customer information, banking processes, and answer any questions about our loan management system. What would you like to know?';
      } else if (lowerQuestion.includes('help') || lowerQuestion.includes('what can you do')) {
        return 'I can help you with:\n\n✓ Search and analyze loan applications\n✓ Find customer information and loan histories\n✓ Explain banking processes and loan terms\n✓ Calculate loan statistics and metrics\n✓ Provide insights on risk assessment and approval processes\n✓ Answer questions about loan types, interest rates, and terms\n\nWhat specific information are you looking for?';
      } else if (lowerQuestion.includes('how many') || lowerQuestion.includes('count') || lowerQuestion.includes('total')) {
        return 'I can help you calculate statistics from our loan data. For current totals, the dashboard shows our latest metrics. You can also ask me about specific counts like "how many approved loans" or "total mortgage applications" and I\'ll search through our database for precise numbers.';
      } else if (lowerQuestion.includes('customer') || lowerQuestion.includes('client')) {
        return 'I can help you find information about customers and their loan applications. Try asking about specific customer names, credit scores, or loan histories. For example: "Show me customers with high credit scores" or "Find customers with multiple loans."';
      } else if (lowerQuestion.includes('loan') || lowerQuestion.includes('application') || lowerQuestion.includes('mortgage') || lowerQuestion.includes('personal') || lowerQuestion.includes('auto')) {
        return 'I can help you search through loan applications by type, status, amount, or customer. Try asking questions like "Show me pending mortgage loans" or "Find loans above $50,000" or "What are the current interest rates?"';
      } else if (lowerQuestion.includes('approve') || lowerQuestion.includes('reject') || lowerQuestion.includes('status')) {
        return 'I can help you understand loan approval processes, check application statuses, and explain our risk assessment criteria. Ask me about specific loan statuses or approval rates for different loan types.';
      } else if (lowerQuestion.includes('risk') || lowerQuestion.includes('credit') || lowerQuestion.includes('score')) {
        return 'I can explain our risk assessment process, credit score requirements, and help you analyze loan risk profiles. Ask me about risk factors, credit score distributions, or specific risk categories.';
      } else {
        return 'I\'m here to help with any banking and loan-related questions! I can search loan applications, explain banking processes, help with customer inquiries, and provide insights about our loan portfolio. What would you like to know about?';
      }
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
      
      console.log(`🔍 Amount query detection: ${isAmountQuery} for "${question}"`);
      
      let searchResults: any[] = [];
      let totalResults = 0;
      
      if (isAmountQuery) {
        // For amount queries, search the entire index with proper filtering
        const amountFilter = this.extractAmountRange(question);
        console.log(`💰 Amount query detected: ${JSON.stringify(amountFilter)}`);
        
        const searchQuery = {
          query: amountFilter.gte || amountFilter.lte ? {
            range: { amount: amountFilter }
          } : { match_all: {} },
          size: 50,
          sort: [{ amount: { order: amountFilter.lte ? 'desc' : 'asc' } }]
        };
        
        const result = await elasticsearch.search(this.indexName, searchQuery);
        searchResults = result.hits.hits;
        totalResults = result.hits.total?.value || result.hits.total || 0;
        
        console.log(`💰 Amount-based search: Found ${searchResults.length} results out of ${totalResults} total`);
      } else {
        // Regular semantic search
        searchResults = await this.searchElasticsearch(question);
        totalResults = searchResults.length;
      }
      
      const searchTime = Date.now() - startTime;
      console.log(`📊 Search completed in ${searchTime}ms - Found ${searchResults.length} relevant results`);
      
      // Analyze search results for better context
      const metadata = this.analyzeSearchResults(searchResults, question);
      metadata.totalResults = totalResults;
      console.log(`📈 Search analysis: ${metadata.summary}`);
      
      // Create enhanced context prompt
      const contextPrompt = this.createContextPrompt(searchResults, metadata);
      
      // Generate AI response with timing
      const responseStartTime = Date.now();
      console.log('🧠 Generating AI response...');
      const response = await this.generateResponse(contextPrompt, question);
      
      const responseTime = Date.now() - responseStartTime;
      const totalTime = Date.now() - startTime;
      console.log(`💬 Response generated in ${responseTime}ms`);
      console.log(`✅ Query processing completed in ${totalTime}ms`);
      
      // Extract enhanced sources for citation
      const sources = searchResults.slice(0, 4).map((hit, index) => ({
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
        searchResults: searchResults.slice(0, 4),
        metadata: {
          ...metadata,
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
}

export const chatbot = new ChatbotService();