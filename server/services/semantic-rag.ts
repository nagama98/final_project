import { elasticsearch } from './elasticsearch';
import { openai } from './openai';

export class SemanticRAGService {
  private indexSourceFields = {
    'loan_applications': [
      'description',
      'customerName',
      'loanType',
      'status'
    ]
  };

  // Get Elasticsearch results with simple semantic search
  async getElasticsearchResults(query: string, size: number = 3): Promise<any[]> {
    try {
      // First try semantic search on the description field
      const semanticQuery = {
        query: {
          semantic: {
            field: 'description',
            query: query
          }
        },
        _source: this.indexSourceFields['loan_applications'],
        size
      };

      console.log('🔍 Attempting semantic search on description field...');
      const semanticResult = await elasticsearch.search('loan_applications', semanticQuery);
      
      if (semanticResult.hits.hits.length > 0) {
        console.log(`✅ Semantic search found ${semanticResult.hits.hits.length} results`);
        return semanticResult.hits.hits.map((hit: any) => hit._source);
      }
      
      // If semantic search fails or returns no results, use traditional search
      console.log('⚠️ Semantic search returned no results, falling back to traditional search');
      const fallbackQuery = {
        query: {
          multi_match: {
            query: query,
            fields: ['customerName^2', 'loanType^1.5', 'status', 'purpose'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        },
        _source: this.indexSourceFields['loan_applications'],
        size
      };

      const fallbackResult = await elasticsearch.search('loan_applications', fallbackQuery);
      return fallbackResult.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error('Semantic search failed, falling back to traditional search:', error);
      
      // Fallback to regular search
      const fallbackQuery = {
        query: {
          multi_match: {
            query: query,
            fields: ['customerName^2', 'loanType^1.5', 'status', 'purpose'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        },
        _source: this.indexSourceFields['loan_applications'],
        size
      };

      const fallbackResult = await elasticsearch.search('loan_applications', fallbackQuery);
      return fallbackResult.hits.hits.map((hit: any) => hit._source);
    }
  }

  // Create OpenAI prompt from search results
  createOpenAIPrompt(results: any[]): string {
    let context = '';
    
    for (const hit of results) {
      // For semantic_text matches, extract text from highlighted fields
      if (hit.highlight) {
        const highlightedTexts: string[] = [];
        for (const values of Object.values(hit.highlight)) {
          if (Array.isArray(values)) {
            highlightedTexts.push(...values);
          }
        }
        context += '\n --- \n' + highlightedTexts.join('\n --- \n');
      } else {
        // Fall back to source field
        const sourceField = this.indexSourceFields['loan_applications'][0];
        const hitContext = hit._source[sourceField];
        context += `${hitContext}\n`;
      }
    }

    const prompt = `
Instructions:

- You are an assistant for question-answering tasks.
- Answer questions truthfully and factually using only the context presented.
- If you don't know the answer, just say that you don't know, don't make up an answer.
- You must always cite the document where the answer was extracted using inline academic citation style [], using the position.
- Use markdown format for code examples.
- You are correct, factual, precise, and reliable.

Context:
${context}

`;

    return prompt;
  }

  // Generate OpenAI completion
  async generateOpenAICompletion(userPrompt: string, question: string): Promise<string> {
    try {
      // Extract context from the userPrompt to pass to OpenAI service
      const contextLines = userPrompt.split('\n').filter(line => line.trim() && !line.startsWith('Instructions:'));
      
      const response = await openai.generateResponse(question, contextLines);

      return response;
    } catch (error) {
      console.error('OpenAI completion failed:', error);
      return 'I apologize, but I encountered an issue generating a response. Please try again.';
    }
  }

  // Main RAG pipeline
  async processQuery(question: string): Promise<string> {
    try {
      console.log(`🤖 Processing semantic RAG query: ${question}`);
      
      // Step 1: Get Elasticsearch results
      const elasticsearchResults = await this.getElasticsearchResults(question, 5);
      
      // Step 2: Create context prompt
      const contextPrompt = this.createOpenAIPrompt(elasticsearchResults);
      
      // Step 3: Generate OpenAI completion
      const completion = await this.generateOpenAICompletion(contextPrompt, question);
      
      console.log(`🎯 Semantic RAG response generated successfully`);
      return completion;
      
    } catch (error) {
      console.error('Semantic RAG processing failed:', error);
      return 'I encountered an error while processing your query. Please try rephrasing your question.';
    }
  }

  // Enhanced search with filtering
  async searchWithFilters(query: string, filters: any = {}): Promise<any[]> {
    try {
      // Build filter clauses
      const filterClauses = Object.entries(filters).map(([key, value]) => ({
        term: { [key]: value }
      }));

      // Try semantic search first on description field
      const semanticQuery = {
        query: {
          bool: {
            must: [
              {
                semantic: {
                  field: 'description',
                  query: query
                }
              }
            ],
            filter: filterClauses
          }
        },
        _source: this.indexSourceFields['loan_applications'],
        size: 50
      };

      console.log('🔍 Attempting semantic search...');
      const semanticResult = await elasticsearch.search('loan_applications', semanticQuery);
      
      if (semanticResult.hits.hits.length > 0) {
        console.log(`✅ Semantic search found ${semanticResult.hits.hits.length} results`);
        return semanticResult.hits.hits;
      }

      // Fallback to traditional multi-field search
      console.log('⚠️ Semantic search returned no results, falling back to traditional search');
      const traditionalQuery = {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query,
                  fields: ['description', 'customerName', 'loanType', 'purpose'],
                  type: 'best_fields'
                }
              }
            ],
            filter: filterClauses
          }
        },
        _source: this.indexSourceFields['loan_applications'],
        size: 50
      };

      const traditionalResult = await elasticsearch.search('loan_applications', traditionalQuery);
      return traditionalResult.hits.hits;
    } catch (error) {
      console.error('Filtered semantic search failed:', error);
      return [];
    }
  }
}

export const semanticRAGService = new SemanticRAGService();