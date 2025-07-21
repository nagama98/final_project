import { apiRequest } from '@/lib/queryClient';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: Array<{
    position: number;
    applicationId: string;
    customerName: string;
    loanType: string;
    amount?: number;
    status?: string;
    score: number;
  }>;
}

export interface ChatbotResponse {
  answer: string;
  sources: any[];
  searchResults: any[];
  metadata?: {
    processingTime: number;
    searchTime: number;
    responseTime: number;
    totalResults: number;
    error?: boolean;
  };
}

export class ChatbotService {
  static async sendMessage(question: string): Promise<ChatbotResponse> {
    try {
      const response = await apiRequest('/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({ question })
      });

      const data = await response.json();
      
      return {
        answer: data.answer || 'I apologize, but I could not generate a response.',
        sources: data.sources || [],
        searchResults: data.searchResults || [],
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Chatbot request failed:', error);
      throw error;
    }
  }

  static createMessage(content: string, type: 'user' | 'bot', sources?: any[]): ChatMessage {
    return {
      id: Date.now().toString() + Math.random(),
      type,
      content,
      timestamp: new Date(),
      sources
    };
  }

  static createErrorMessage(error: any): ChatMessage {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return this.createMessage(
      `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
      'bot'
    );
  }
}

// Helper function to format bot responses with better readability
export const formatBotResponse = (content: string): string => {
  // Clean up and format the response text for better chat display
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove markdown bold formatting
    .replace(/\*(.*?)\*/g, '$1')      // Remove markdown italic formatting
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce excessive line breaks
    .replace(/^\s+|\s+$/g, '')        // Trim whitespace
    .replace(/\s{2,}/g, ' ')          // Reduce multiple spaces to single
    .trim();
};