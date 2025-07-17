import { useState } from "react";
import KPICards from "@/components/dashboard/kpi-cards";
import AdvancedSearch from "@/components/dashboard/advanced-search";
import ApplicationsTable from "@/components/dashboard/applications-table";
import AnalyticsChart from "@/components/dashboard/analytics-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CreditCard, Home, Upload } from "lucide-react";

interface SearchFilters {
  loanType: string;
  status: string;
  amountRange: string;
  dateRange: string;
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
}

export default function Dashboard() {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    loanType: "all",
    status: "all",
    amountRange: "all",
    dateRange: "",
    searchQuery: "",
    startDate: undefined,
    endDate: undefined
  });

  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };
  const documentCategories = [
    {
      title: "Income Documents",
      description: "Tax returns, pay stubs, bank statements",
      icon: FileText,
      fileCount: 24,
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Identity Verification",
      description: "Driver's license, passport, SSN",
      icon: CreditCard,
      fileCount: 12,
      color: "bg-green-100 text-green-600"
    },
    {
      title: "Property Documents",
      description: "Appraisals, insurance, contracts",
      icon: Home,
      fileCount: 8,
      color: "bg-orange-100 text-orange-600"
    }
  ];

  return (
    <div className="w-full max-w-none">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Loan Management Dashboard</h1>
        <p className="text-gray-600">Monitor loan applications, track performance, and manage customer relationships</p>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Advanced Search */}
      <AdvancedSearch onFiltersChange={handleFiltersChange} />

      {/* Applications Table */}
      <ApplicationsTable filters={searchFilters} />

      {/* Analytics */}
      <AnalyticsChart />

      {/* Document Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Document Management</CardTitle>
            <Button className="bg-primary hover:bg-blue-700">
              <Upload className="mr-2 h-4 w-4" />
              Upload Documents
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${category.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{category.title}</h4>
                  <p className="text-xs text-gray-500 mb-4">{category.description}</p>
                  <div className="text-xs text-gray-400">
                    <span className="text-green-600">{category.fileCount} files</span> • Last updated 2 hours ago
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
