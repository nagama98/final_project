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
    const amountMatch = query.match(/(\$?[\d,]+)/);
    if (amountMatch) {
      const amount = parseInt(amountMatch[1].replace(/[$,]/g, ''));
      if (query.includes('above') || query.includes('over') || query.includes('>')) {
        return { gte: amount };
      } else if (query.includes('below') || query.includes('under') || query.includes('<')) {
        return { lte: amount };
      }
    }
    return {};
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
1. Always acknowledge what data was found: "${searchResults.length} loan applications found" or "No specific matches found"
2. For data queries: Provide precise details from the search results with specific numbers and names
3. For general questions: Give comprehensive banking knowledge while noting available data context
4. For greetings: Be welcoming and mention current system status (e.g., "${metadata?.totalResults || 0} loans in database")
5. Always be specific about what you found vs. general knowledge
6. Use the actual data when available, explain when you're providing general information
7. Mention search performance when relevant (fast response, large dataset, etc.)

Remember: You have access to real loan data and should provide current, specific information when available.`;
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
        temperature: 0.7,
        max_tokens: 800
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
    console.log(`🤖 Processing chatbot query: "${question}"`);
    
    try {
      // Search Elasticsearch with enhanced logging
      const searchResults = await this.searchElasticsearch(question);
      const searchTime = Date.now() - startTime;
      console.log(`📊 Search completed in ${searchTime}ms - Found ${searchResults.length} relevant results`);
      
      // Analyze search results for better context
      const metadata = this.analyzeSearchResults(searchResults, question);
      console.log(`📈 Search analysis: ${metadata.summary}`);
      
      // Create enhanced context prompt
      const contextPrompt = this.createContextPrompt(searchResults, metadata);
      
      // Generate AI response with timing
      const responseStartTime = Date.now();
      console.log('🧠 Generating AI response...');
      const answer = await this.generateResponse(contextPrompt, question);
      const responseTime = Date.now() - responseStartTime;
      console.log(`💬 Response generated in ${responseTime}ms`);
      
      // Extract enhanced sources for citation
      const sources = searchResults.slice(0, 5).map((hit, index) => ({
        position: index + 1,
        applicationId: hit._source.applicationId,
        customerName: hit._source.customerName,
        loanType: hit._source.loanType,
        amount: hit._source.amount,
        status: hit._source.status,
        score: hit._score
      }));
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ Query processing completed in ${totalTime}ms`);
      
      return {
        answer,
        sources,
        searchResults: searchResults.slice(0, 5),
        metadata: {
          ...metadata,
          processingTime: totalTime,
          searchTime,
          responseTime
        }
      };
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`❌ Chatbot processing failed after ${errorTime}ms:`, error);
      
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