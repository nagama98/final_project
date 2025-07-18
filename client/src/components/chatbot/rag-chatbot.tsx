import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, User, MessageCircle, X, Send, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function RAGChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your AI assistant powered by Elasticsearch and Azure OpenAI. I can help you with:\n\n**Loan Searches:**\n• Search applications by status, type, or amount\n• Find specific customer loans\n• Get loan statistics and counts\n• Analyze loan portfolios\n\n**General Questions:**\n• Explain loan management processes\n• Answer banking and finance questions\n• Provide system information\n• Help with loan terminology\n\n**Examples:**\n• 'Show me all pending loans'\n• 'What is a mortgage loan?'\n• 'How does loan approval work?'\n• 'Explain risk scoring'",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      try {
        console.log('Sending chat message:', message);
        const response = await apiRequest('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            message,
            userId: 1 // TODO: Get actual user ID
          })
        });
        
        console.log('Chat response received:', response);
        return await response.json();
      } catch (error: any) {
        console.error('Chat API error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.response || "I received your message but couldn't generate a response. Please try again.",
        timestamp: new Date()
      }]);
    },
    onError: (error: any) => {
      console.error('Chat error:', error);
      
      // Get more specific error information
      let errorMessage = "I'm experiencing an issue processing your request. Please try again.";
      
      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      } else if (error.status) {
        errorMessage = `Server error (${error.status}). Please try your question again.`;
      } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        errorMessage = "Network connection issue. Please check your connection and try again.";
      }
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      }]);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(inputMessage);
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <Card className="w-96 h-96 mb-4 flex flex-col">
          <CardHeader className="flex-row items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-medium">AI Loan Assistant</h4>
                <p className="text-xs text-gray-500">Enhanced with keyword search</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 ${
                  message.type === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-xs rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
                {message.type === 'user' && (
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Ask about loans, documents, or rates..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || chatMutation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">RAG search active</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                <Search className="mr-1 h-3 w-3" />
                Semantic Search
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
