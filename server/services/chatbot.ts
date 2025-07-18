import { elasticsearch } from './elasticsearch.js';
import { openai } from './openai.js';

export class ChatbotService {
  private indexName = 'loan_applications';
  
  async searchElasticsearch(query: string): Promise<any[]> {
    try {
      // First try semantic search with description field
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
              number_of_fragments: 2,
              order: 'score'
            }
          }
        },
        size: 5
      };

      const result = await elasticsearch.search(this.indexName, semanticQuery);
      return result.hits.hits;
    } catch (error) {
      console.error('Semantic search failed, trying regular search:', error);
      
      try {
        // Fallback to regular search without semantic_text fields
        const fallbackQuery = {
          query: {
            multi_match: {
              query: query,
              fields: ['customerName^2', 'loanType^1.5', 'purpose', 'status', 'applicationId'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          },
          highlight: {
            fields: {
              customerName: {},
              loanType: {},
              purpose: {},
              status: {}
            }
          },
          size: 5
        };

        const fallbackResult = await elasticsearch.search(this.indexName, fallbackQuery);
        return fallbackResult.hits.hits;
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        
        // Last resort: get recent applications
        try {
          const recentQuery = {
            query: { match_all: {} },
            sort: [{ createdAt: { order: 'desc' } }],
            size: 5
          };
          
          const recentResult = await elasticsearch.search(this.indexName, recentQuery);
          return recentResult.hits.hits;
        } catch (recentError) {
          console.error('Even recent search failed:', recentError);
          return [];
        }
      }
    }
  }

  createContextPrompt(searchResults: any[]): string {
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

    const prompt = `You are an AI assistant for ElastiBank, a comprehensive loan management system. You help loan officers, managers, and staff with ALL types of questions about banking, loans, and customer service.

YOUR CAPABILITIES:
✓ Answer questions about loan applications, customers, and banking data
✓ Provide explanations about banking processes, loan terms, and financial concepts
✓ Help with greetings, general questions, and system guidance
✓ Calculate statistics and provide insights from loan data
✓ Explain loan approval processes, risk assessment, and banking procedures

CONTEXT DATA:
${context}

INSTRUCTIONS:
1. Answer ALL types of questions - not just data searches
2. For loan-specific questions: Use the provided data to give accurate, detailed responses
3. For general banking questions: Provide helpful explanations about loan processes, banking terms, financial concepts
4. For greetings/help: Be welcoming and explain what you can help with
5. For counts/statistics: Calculate from the provided data and explain the findings
6. Be conversational, professional, and informative
7. Always provide specific details when available (names, amounts, IDs)
8. If no context data is relevant, still provide helpful banking and loan-related information

Remember: You are a knowledgeable banking assistant who can discuss any topic related to loans, banking, customers, and financial services.`;
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
  }> {
    try {
      console.log(`🤖 Processing chatbot query: "${question}"`);
      
      // Search Elasticsearch with semantic_text
      const searchResults = await this.searchElasticsearch(question);
      console.log(`📊 Found ${searchResults.length} relevant results`);
      
      // Create context prompt
      const contextPrompt = this.createContextPrompt(searchResults);
      
      // Generate AI response
      const answer = await this.generateResponse(contextPrompt, question);
      
      // Extract sources for citation
      const sources = searchResults.map((hit, index) => ({
        position: index + 1,
        applicationId: hit._source.applicationId,
        customerName: hit._source.customerName,
        loanType: hit._source.loanType,
        score: hit._score
      }));
      
      return {
        answer,
        sources,
        searchResults
      };
    } catch (error) {
      console.error('Chatbot processing failed:', error);
      return {
        answer: 'I apologize, but I encountered an error while processing your request. Please try again.',
        sources: [],
        searchResults: []
      };
    }
  }
}

export const chatbot = new ChatbotService();