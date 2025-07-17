import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AdvancedSearch from "@/components/dashboard/advanced-search";
import ApplicationsTable from "@/components/dashboard/applications-table";
import LoanApplicationForm from "@/components/forms/loan-application-form";

interface SearchFilters {
  loanType: string;
  status: string;
  amountRange: string;
  dateRange: string;
  searchQuery: string;
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
    searchQuery: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: applications, isLoading } = useQuery<LoanApplication[]>({
    queryKey: ['/api/applications'],
  });

  const handleFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  const handleApplicationSuccess = () => {
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
            <p className="text-gray-600">Manage and track all loan applications</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Loan Application</DialogTitle>
              </DialogHeader>
              <LoanApplicationForm onSuccess={handleApplicationSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
          <p className="text-gray-600">Manage and track all loan applications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Loan Application</DialogTitle>
            </DialogHeader>
            <LoanApplicationForm onSuccess={handleApplicationSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Advanced Search */}
      <AdvancedSearch onFiltersChange={handleFiltersChange} />

      {/* Applications Table */}
      <ApplicationsTable filters={searchFilters} />
    </div>
  );
}
