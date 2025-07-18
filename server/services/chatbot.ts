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
    
    for (const hit of searchResults) {
      // Extract highlighted text for semantic_text matches
      if (hit.highlight) {
        const highlightedTexts: string[] = [];
        for (const values of Object.values(hit.highlight)) {
          if (Array.isArray(values)) {
            highlightedTexts.push(...values);
          }
        }
        if (highlightedTexts.length > 0) {
          context += highlightedTexts.join('\n --- \n') + '\n\n';
        }
      } else {
        // Fall back to source data if no highlights
        const source = hit._source;
        const contextText = `
Loan Application: ${source.applicationId}
Customer: ${source.customerName}
Loan Type: ${source.loanType}
Amount: ${source.amount}
Status: ${source.status}
Purpose: ${source.purpose}
Description: ${source.description}
Risk Score: ${source.riskScore}
Interest Rate: ${source.interestRate}
        `.trim();
        context += contextText + '\n\n';
      }
    }

    const prompt = `
Instructions:

- You are an assistant for question-answering tasks about loan applications and banking.
- Answer questions truthfully and factually using only the context presented.
- If you don't know the answer, just say that you don't know, don't make up an answer.
- You must always cite the document where the answer was extracted using inline academic citation style [], using the position.
- Use markdown format for code examples.
- You are correct, factual, precise, and reliable.
- Focus on loan applications, customer information, and banking-related queries.

Context:
${context}

`;
    return prompt;
  }

  async generateResponse(userPrompt: string, question: string): Promise<string> {
    try {
      const response = await openai.getChatCompletion([
        { role: 'system', content: userPrompt },
        { role: 'user', content: question }
      ]);
      
      return response;
    } catch (error) {
      console.error('OpenAI completion failed:', error);
      
      // Provide intelligent fallback based on question content
      if (question.toLowerCase().includes('how many') || question.toLowerCase().includes('count')) {
        return 'Based on available data, I can see loan applications in the system. For specific counts, please check the dashboard or use the search filters on the Applications page.';
      } else if (question.toLowerCase().includes('customer') || question.toLowerCase().includes('client')) {
        return 'I can help you find information about customers and their loan applications. Try asking about specific customer names or loan types.';
      } else if (question.toLowerCase().includes('loan') || question.toLowerCase().includes('application')) {
        return 'I can help you search through loan applications. You can ask about specific loan types, statuses, or amounts.';
      } else {
        return 'I apologize, but I cannot process your request at the moment. Please try asking about loan applications, customers, or specific banking information.';
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