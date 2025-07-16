export class ElasticsearchClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async search(query: string, filters: any = {}, searchType: 'hybrid' | 'semantic' = 'hybrid') {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        filters,
        searchType
      })
    });

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    return response.json();
  }

  async searchApplications(query: string, filters: any = {}) {
    const params = new URLSearchParams({
      query,
      ...filters
    });

    const response = await fetch(`${this.baseUrl}/search/applications?${params}`);
    
    if (!response.ok) {
      throw new Error('Application search failed');
    }

    return response.json();
  }

  async getHealth() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

export const elasticsearchClient = new ElasticsearchClient();
