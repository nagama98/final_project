import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import AdvancedSearch from "@/components/dashboard/advanced-search";
import ApplicationsTable from "@/components/dashboard/applications-table";

interface SearchFilters {
  loanType: string;
  status: string;
  amountRange: string;
  dateRange: string;
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
}

interface LoanApplication {
  id: number;
  applicationId: string;
  customerName: string;
  customerEmail: string;
  loanType: string;
  amount: string;
  status: string;
  riskScore: number;
  createdAt: string;
}

export default function Applications() {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    loanType: "all",
    status: "all",
    amountRange: "all",
    dateRange: "",
    searchQuery: "",
    startDate: undefined,
    endDate: undefined
  });
  const { data: applications, isLoading } = useQuery<LoanApplication[]>({
    queryKey: ['/api/applications'],
  });

  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
          <p className="text-gray-600">Manage and track all loan applications</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
        <p className="text-gray-600">Manage and track all loan applications</p>
      </div>

      {/* Advanced Search */}
      <AdvancedSearch onFiltersChange={handleFiltersChange} />

      {/* Applications Table */}
      <ApplicationsTable filters={searchFilters} />
    </div>
  );
}
