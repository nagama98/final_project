import { Chatbot } from '@/components/chatbot';

export default function ChatbotPage() {
  return (
    <div className="h-[calc(100vh-4rem)] p-6">
      <div className="max-w-4xl mx-auto h-full">
        <Chatbot />
      </div>
    </div>
  );
}