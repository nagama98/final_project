import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface SearchResult {
  id: string;
  source: any;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  searchType: string;
  query: string;
}

export function useElasticsearch() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await apiRequest('GET', '/api/health');
      const data = await response.json();
      setIsConnected(data.elasticsearch === 'connected');
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const search = async (query: string, filters: any = {}, searchType: 'hybrid' | 'semantic' = 'hybrid'): Promise<SearchResponse> => {
    try {
      const response = await apiRequest('POST', '/api/search', {
        query,
        filters,
        searchType
      });
      return await response.json();
    } catch (error) {
      throw new Error('Search failed');
    }
  };

  const searchApplications = async (query: string, filters: any = {}): Promise<SearchResult[]> => {
    try {
      const response = await apiRequest('GET', '/api/search/applications', {
        query,
        ...filters
      });
      const data = await response.json();
      return data.results;
    } catch (error) {
      throw new Error('Application search failed');
    }
  };

  return {
    isConnected,
    isLoading,
    search,
    searchApplications,
    checkConnection
  };
}
