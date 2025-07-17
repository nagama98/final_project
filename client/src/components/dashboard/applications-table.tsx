import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Filter, Download, Plus, Eye, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

interface SearchFilters {
  loanType: string;
  status: string;
  amountRange: string;
  dateRange: string;
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
}

interface ApplicationsTableProps {
  filters: SearchFilters;
}

export default function ApplicationsTable({ filters }: ApplicationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show 20 items per page
  const maxTotalItems = 100; // Limit to 100 records total

  const { data: applications, isLoading } = useQuery<LoanApplication[]>({
    queryKey: ['/api/applications'],
  });

  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    if (!filters) return applications.slice(0, maxTotalItems);
    
    return applications.slice(0, maxTotalItems).filter(app => {
      // Filter by search query
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const searchableFields = [
          app.applicationId,
          app.customerName,
          app.customerEmail,
          app.loanType,
          app.status,
          app.amount
        ].join(' ').toLowerCase();
        
        if (!searchableFields.includes(query)) {
          return false;
        }
      }
      
      // Filter by loan type
      if (filters.loanType && filters.loanType !== 'all' && app.loanType !== filters.loanType) {
        return false;
      }
      
      // Filter by status
      if (filters.status && filters.status !== 'all' && app.status !== filters.status) {
        return false;
      }
      
      // Filter by date range (custom date picker)
      if (filters.startDate || filters.endDate) {
        const appDate = new Date(app.createdAt);
        
        // Filter by start date
        if (filters.startDate) {
          const startOfDay = new Date(filters.startDate);
          startOfDay.setHours(0, 0, 0, 0);
          if (appDate < startOfDay) return false;
        }
        
        // Filter by end date
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (appDate > endOfDay) return false;
        }
      }
      
      // Filter by amount range
      if (filters.amountRange && filters.amountRange !== 'all') {
        const amount = parseInt(app.amount);
        switch (filters.amountRange) {
          case '0-10000':
            if (amount < 0 || amount > 10000) return false;
            break;
          case '10000-50000':
            if (amount < 10000 || amount > 50000) return false;
            break;
          case '50000-100000':
            if (amount < 50000 || amount > 100000) return false;
            break;
          case '100000+':
            if (amount < 100000) return false;
            break;
        }
      }
      
      return true;
    });
  }, [applications, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApplications = filteredApplications.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'disbursed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 750) return 'bg-green-500';
    if (score >= 650) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Applications</CardTitle>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button className="bg-primary hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">
                      {application.applicationId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarFallback className="text-xs">
                          {getInitials(application.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {application.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.customerEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {application.loanType.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${parseInt(application.amount).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${getStatusColor(application.status)}`}>
                      {formatStatus(application.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${getRiskScoreColor(application.riskScore)}`}
                          style={{ width: `${(application.riskScore / 850) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {application.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(application.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" className="text-primary hover:text-blue-700">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {application.status === 'under_review' && (
                        <>
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} applications
            {filteredApplications.length >= maxTotalItems && (
              <span className="text-blue-600 ml-1">(Limited to {maxTotalItems} records)</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            {totalPages > 5 && (
              <>
                <span className="text-gray-500">...</span>
                <Button
                  variant={currentPage === totalPages ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
