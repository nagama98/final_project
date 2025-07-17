import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, Eye, DollarSign, CreditCard, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Customer {
  id: string;
  custId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  ssn?: string;
  employmentStatus?: string;
  annualIncome?: number;
  totalLoans: number;
  totalAmount: number;
  activeLoans: number;
  creditScore: number;
  riskLevel: string;
  createdAt: string;
  recentLoans?: Array<{
    id: string;
    applicationId: string;
    status: string;
    amount: string;
    loanType: string;
  }>;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [creditScoreFilter, setCreditScoreFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [loanActivityFilter, setLoanActivityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const filteredCustomers = customers?.filter(customer => {
    const matchesSearch = searchQuery === "" || 
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.custId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRisk = riskFilter === "all" || customer.riskLevel === riskFilter;
    
    const matchesCreditScore = creditScoreFilter === "all" || 
      (creditScoreFilter === "excellent" && customer.creditScore >= 750) ||
      (creditScoreFilter === "good" && customer.creditScore >= 700 && customer.creditScore < 750) ||
      (creditScoreFilter === "fair" && customer.creditScore >= 650 && customer.creditScore < 700) ||
      (creditScoreFilter === "poor" && customer.creditScore < 650);
    
    const matchesEmployment = employmentFilter === "all" || customer.employmentStatus === employmentFilter;
    
    const matchesLoanActivity = loanActivityFilter === "all" ||
      (loanActivityFilter === "active" && customer.activeLoans > 0) ||
      (loanActivityFilter === "inactive" && customer.activeLoans === 0) ||
      (loanActivityFilter === "high-value" && customer.totalAmount > 100000);
    
    return matchesSearch && matchesRisk && matchesCreditScore && matchesEmployment && matchesLoanActivity;
  }) || [];

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customers</h1>
        <p className="text-gray-600">Manage customer relationships and loan information</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers?.length || 0}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers?.reduce((sum, c) => sum + c.activeLoans, 0) || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Portfolio</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${customers?.reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString() || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Credit Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers?.length ? Math.round(customers.reduce((sum, c) => sum + c.creditScore, 0) / customers.length) : 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Search and Filter Controls */}
      <Card className="mb-8 w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Customer Search & Filters</CardTitle>
            <Button variant="outline" size="sm" onClick={() => {
              setSearchQuery("");
              setRiskFilter("all");
              setCreditScoreFilter("all");
              setEmploymentFilter("all");
              setLoanActivityFilter("all");
              setCurrentPage(1);
            }}>
              <Search className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers by name, email, customer ID, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Score Range</label>
              <Select value={creditScoreFilter} onValueChange={setCreditScoreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="excellent">Excellent (750+)</SelectItem>
                  <SelectItem value="good">Good (700-749)</SelectItem>
                  <SelectItem value="fair">Fair (650-699)</SelectItem>
                  <SelectItem value="poor">Poor (&lt; 650)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
              <Select value={employmentFilter} onValueChange={setEmploymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employment</SelectItem>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Activity</label>
              <Select value={loanActivityFilter} onValueChange={setLoanActivityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Has Active Loans</SelectItem>
                  <SelectItem value="inactive">No Active Loans</SelectItem>
                  <SelectItem value="high-value">High Value (&gt;$100k)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {paginatedCustomers.length} of {filteredCustomers.length} customers
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-left p-4">Credit Score</th>
                  <th className="text-left p-4">Risk Level</th>
                  <th className="text-left p-4">Total Loans</th>
                  <th className="text-left p-4">Active Loans</th>
                  <th className="text-left p-4">Total Amount</th>
                  <th className="text-left p-4">Loan IDs</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(customer.firstName, customer.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                          <p className="text-sm text-gray-500">ID: {customer.custId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{customer.email}</p>
                        <p className="text-sm text-gray-500">{customer.phone || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{customer.creditScore}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={getRiskColor(customer.riskLevel)}>
                        {customer.riskLevel}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{customer.totalLoans}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{customer.activeLoans}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">${customer.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <div className="max-w-xs">
                        {customer.recentLoans && customer.recentLoans.length > 0 ? (
                          <div className="space-y-1">
                            {customer.recentLoans.slice(0, 3).map((loan) => (
                              <div key={loan.id} className="text-xs">
                                <span className="font-mono text-blue-600">{loan.applicationId}</span>
                                <span className="text-gray-500 ml-2">({loan.status})</span>
                              </div>
                            ))}
                            {customer.recentLoans.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{customer.recentLoans.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">No loans</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
