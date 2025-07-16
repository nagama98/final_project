import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, University, User } from "lucide-react";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <University className="text-primary text-2xl mr-3" />
              <span className="text-xl font-bold text-gray-900">ElastiBank</span>
            </div>
            <div className="hidden md:block ml-8">
              <div className="flex items-baseline space-x-8">
                <a href="/dashboard" className="text-primary bg-blue-50 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/applications" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Applications
                </a>
                <a href="/customers" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Customers
                </a>
                <a href="/documents" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Documents
                </a>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search loans, customers, documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center p-0">
                    3
                  </Badge>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-medium">John Doe</div>
                  <div className="text-gray-500">Loan Officer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
