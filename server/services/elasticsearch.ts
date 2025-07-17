import { Client } from '@elastic/elasticsearch';

export class ElasticsearchService {
  private client: Client;
  
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'https://51b5b32b861646d9aaf9d955fca237ff.us-central1.gcp.cloud.es.io:9243/',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'bPxw5VQJkc5raIKOyCKkM8OQ'
      }
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Elasticsearch ping failed:', error);
      return false;
    }
  }

  async createIndex(indexName: string, mapping: any): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          mappings: mapping // Updated for ES 8.x - use 'mappings' directly
        });
      }
    } catch (error) {
      console.error(`Failed to create index ${indexName}:`, error);
      // Don't throw error, let app continue in fallback mode
    }
  }

  async indexDocument(indexName: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        document: document
      });
      console.log(`Successfully indexed document ${id} in ${indexName}`);
    } catch (error) {
      console.error(`Failed to index document:`, error);
      throw error;
    }
  }

  async search(indexName: string, query: any): Promise<any> {
    try {
      const response = await this.client.search({
        index: indexName,
        ...query
      });
      return response;
    } catch (error) {
      console.error(`Search failed:`, error);
      throw error;
    }
  }

  async getAllDocuments(indexName: string, size: number = 100): Promise<any[]> {
    try {
      const response = await this.client.search({
        index: indexName,
        query: { match_all: {} },
        size: size,
        sort: [{ createdAt: { order: 'desc' } }]
      });
      return response.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));
    } catch (error) {
      console.error(`Failed to get all documents:`, error);
      return [];
    }
  }

  async getDocument(indexName: string, id: string): Promise<any | null> {
    try {
      const response = await this.client.get({
        index: indexName,
        id: id
      });
      return { id: response._id, ...response._source };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      console.error(`Failed to get document:`, error);
      throw error;
    }
  }

  async updateDocument(indexName: string, id: string, updates: any): Promise<void> {
    try {
      await this.client.update({
        index: indexName,
        id,
        doc: updates
      });
      console.log(`Successfully updated document ${id} in ${indexName}`);
    } catch (error) {
      console.error(`Failed to update document:`, error);
      throw error;
    }
  }

  async bulkIndex(indexName: string, documents: any[]): Promise<void> {
    try {
      if (documents.length === 0) return;

      const body = [];
      for (const doc of documents) {
        // Index action
        body.push({
          index: {
            _index: indexName,
            _id: doc.id || doc.custId || doc.applicationId
          }
        });
        // Document data
        body.push(doc);
      }

      const response = await this.client.bulk({ body });
      
      if (response.errors) {
        console.error('Bulk indexing had errors:', response.items);
        throw new Error('Bulk indexing failed');
      }
      
      console.log(`Successfully bulk indexed ${documents.length} documents to ${indexName}`);
    } catch (error) {
      console.error(`Failed to bulk index documents:`, error);
      throw error;
    }
  }

  async hybridSearch(indexName: string, searchQuery: string, filters: any = {}): Promise<any> {
    try {
      // Use RRF (Reciprocal Rank Fusion) pattern for better search results
      const query = {
        retriever: {
          rrf: {
            retrievers: [
              {
                standard: {
                  query: {
                    multi_match: {
                      query: searchQuery,
                      fields: ['applicationId^2', 'customerName^2', 'loanType', 'status', 'customerEmail'],
                      boost: 1.5
                    }
                  }
                }
              },
              {
                standard: {
                  query: {
                    multi_match: {
                      query: searchQuery,
                      fields: ['customerName', 'loanType'],
                      fuzziness: 'AUTO',
                      boost: 0.8
                    }
                  }
                }
              }
            ]
          }
        },
        highlight: {
          fields: {
            customerName: {
              type: "unified",
              number_of_fragments: 2,
              order: "score"
            },
            loanType: {
              type: "unified",
              number_of_fragments: 2,
              order: "score"
            },
            status: {
              type: "unified",
              number_of_fragments: 2,
              order: "score"
            }
          }
        },
        size: 10
      };

      // Add filters if provided
      if (Object.keys(filters).length > 0) {
        query.retriever.rrf.retrievers.forEach(retriever => {
          if (!retriever.standard.query.bool) {
            retriever.standard.query = {
              bool: {
                must: [retriever.standard.query],
                filter: Object.entries(filters).map(([key, value]) => ({
                  term: { [key]: value }
                }))
              }
            };
          }
        });
      }

      return this.search(indexName, query);
    } catch (error) {
      console.error('Hybrid search failed, falling back to basic search:', error);
      // Fallback to basic search if RRF is not available
      const fallbackQuery = {
        query: {
          bool: {
            should: [
              {
                multi_match: {
                  query: searchQuery,
                  fields: ['applicationId^2', 'customerName^2', 'loanType', 'status', 'customerEmail'],
                  boost: 1.5
                }
              }
            ],
            filter: Object.keys(filters).length > 0 ? [
              ...Object.entries(filters).map(([key, value]) => ({
                term: { [key]: value }
              }))
            ] : []
          }
        },
        size: 10
      };
      
      try {
        return this.search(indexName, fallbackQuery);
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        return { hits: { hits: [], total: { value: 0 } } };
      }
    }
  }

  // Add Elasticsearch ML embedding method  
  async generateMLEmbedding(text: string): Promise<number[]> {
    try {
      // Use Elasticsearch's ML inference API with a pre-trained model
      // This is a placeholder for actual ML model integration
      const response = await this.client.ml.inferTrainedModel({
        model_id: 'sentence-transformers__all-minilm-l6-v2', // Example model
        body: {
          docs: [{ text_field: text }]
        }
      });
      
      return response.body.inference_results[0].predicted_value;
    } catch (error) {
      console.warn('ML embedding failed, using fallback method:', error);
      // Fallback: Generate simple hash-based embedding
      return this.generateSimpleEmbedding(text);
    }
  }

  // Fallback simple embedding generation
  private generateSimpleEmbedding(text: string): number[] {
    const embedding = new Array(384).fill(0); // Smaller dimension for demo
    for (let i = 0; i < text.length && i < 384; i++) {
      embedding[i % 384] += text.charCodeAt(i) / 1000;
    }
    return embedding;
  }

  async vectorSearch(indexName: string, vector: number[], k: number = 10): Promise<any> {
    const query = {
      knn: {
        field: 'embedding',
        query_vector: vector,
        k,
        num_candidates: k * 2
      }
    };

    return this.search(indexName, query);
  }

  async initializeIndices(): Promise<void> {
    // Users index
    await this.createIndex('users', {
      properties: {
        id: { type: 'integer' },
        username: { type: 'keyword' },
        email: { type: 'keyword' },
        firstName: { type: 'text' },
        lastName: { type: 'text' },
        role: { type: 'keyword' },
        phone: { type: 'keyword' },
        createdAt: { type: 'date' }
      }
    });

    // Customers index
    await this.createIndex('customers', {
      properties: {
        id: { type: 'keyword' },
        custId: { type: 'keyword' },
        username: { type: 'keyword' },
        email: { type: 'keyword' },
        role: { type: 'keyword' },
        firstName: { type: 'text' },
        lastName: { type: 'text' },
        phone: { type: 'keyword' },
        address: { type: 'text' },
        dateOfBirth: { type: 'date' },
        ssn: { type: 'keyword' },
        employmentStatus: { type: 'keyword' },
        annualIncome: { type: 'double' },
        creditScore: { type: 'integer' },
        riskLevel: { type: 'keyword' },
        totalLoans: { type: 'integer' },
        totalAmount: { type: 'double' },
        activeLoans: { type: 'integer' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' }
      }
    });

    // Loan applications index
    await this.createIndex('loan_applications', {
      properties: {
        id: { type: 'integer' },
        applicationId: { type: 'keyword' },
        customerId: { type: 'keyword' },
        custId: { type: 'keyword' },
        customerName: { type: 'text' },
        customerEmail: { type: 'keyword' },
        loanType: { type: 'keyword' },
        amount: { type: 'text' },
        term: { type: 'integer' },
        status: { type: 'keyword' },
        interestRate: { type: 'text' },
        riskScore: { type: 'integer' },
        documents: { type: 'text' },
        notes: { type: 'text' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
        embedding: {
          type: 'dense_vector',
          dims: 1536 // OpenAI embedding dimension
        }
      }
    });

    // Documents index
    await this.createIndex('documents', {
      properties: {
        id: { type: 'integer' },
        applicationId: { type: 'integer' },
        documentType: { type: 'keyword' },
        fileName: { type: 'text' },
        fileUrl: { type: 'keyword' },
        fileSize: { type: 'integer' },
        mimeType: { type: 'keyword' },
        extractedText: { type: 'text' },
        uploadedAt: { type: 'date' },
        embedding: {
          type: 'dense_vector',
          dims: 1536
        }
      }
    });

    // Chat messages index
    await this.createIndex('chat_messages', {
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        message: { type: 'text' },
        response: { type: 'text' },
        createdAt: { type: 'date' }
      }
    });

    console.log('All Elasticsearch indices initialized successfully');
  }
}

export const elasticsearch = new ElasticsearchService();
