import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Applications from "@/pages/applications";
import Customers from "@/pages/customers";
import Documents from "@/pages/documents";
import ChatbotPage from "@/pages/chatbot";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/applications" component={Applications} />
      <Route path="/customers" component={Customers} />
      <Route path="/documents" component={Documents} />
      <Route path="/chatbot" component={ChatbotPage} />
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
            <main className="flex-1 min-w-0 p-4 lg:p-8">
              <div className="w-full max-w-none">
                <Router />
              </div>
            </main>
          </div>

        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
