import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Applications from "@/pages/applications";
import NewApplication from "@/pages/new-application";
import DataManagement from "@/pages/data-management";
import Customers from "@/pages/customers";
import Documents from "@/pages/documents";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import RAGChatbot from "@/components/chatbot/rag-chatbot";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/applications" component={Applications} />
      <Route path="/applications/new" component={NewApplication} />
      <Route path="/data-management" component={DataManagement} />
      <Route path="/customers" component={Customers} />
      <Route path="/documents" component={Documents} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-8">
              <Router />
            </main>
          </div>
          <RAGChatbot />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
