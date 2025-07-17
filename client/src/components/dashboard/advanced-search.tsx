import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, RotateCcw, Save, X, Calendar as CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SearchFilters {
  loanType: string;
  status: string;
  amountRange: string;
  dateRange: string;
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
}

interface AdvancedSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
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

export default function AdvancedSearch({ onFiltersChange }: AdvancedSearchProps) {
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    loanType: "all",
    status: "all",
    amountRange: "all",
    dateRange: "all",
    searchQuery: "",
    startDate: undefined,
    endDate: undefined
  });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { data: applications } = useQuery<LoanApplication[]>({
    queryKey: ['/api/applications'],
  });

  // Generate suggestions based on search query
  useEffect(() => {
    if (searchFilters.searchQuery.length > 0 && applications) {
      const query = searchFilters.searchQuery.toLowerCase();
      const suggestionSet = new Set<string>();
      
      applications.forEach(app => {
        // Add matching customer names
        if (app.customerName.toLowerCase().includes(query)) {
          suggestionSet.add(app.customerName);
        }
        // Add matching application IDs
        if (app.applicationId.toLowerCase().includes(query)) {
          suggestionSet.add(app.applicationId);
        }
        // Add matching loan types
        if (app.loanType.toLowerCase().includes(query)) {
          suggestionSet.add(app.loanType.charAt(0).toUpperCase() + app.loanType.slice(1) + " Loan");
        }
        // Add matching statuses
        if (app.status.toLowerCase().includes(query)) {
          suggestionSet.add(app.status.charAt(0).toUpperCase() + app.status.slice(1).replace('_', ' '));
        }
        // Add matching email domains
        if (app.customerEmail.toLowerCase().includes(query)) {
          suggestionSet.add(app.customerEmail);
        }
      });
      
      setSuggestions(Array.from(suggestionSet).slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchFilters.searchQuery, applications]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...searchFilters, [key]: value };
    setSearchFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (startDate?: Date, endDate?: Date) => {
    const newFilters = { 
      ...searchFilters, 
      startDate, 
      endDate,
      dateRange: startDate || endDate ? "custom" : "all"
    };
    setSearchFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchQueryChange = (value: string) => {
    const newFilters = { ...searchFilters, searchQuery: value };
    setSearchFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const newFilters = { ...searchFilters, searchQuery: suggestion };
    setSearchFilters(newFilters);
    onFiltersChange(newFilters);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    onFiltersChange(searchFilters);
    setShowSuggestions(false);
  };

  const handleReset = () => {
    const resetFilters = {
      loanType: "all",
      status: "all",
      amountRange: "all",
      dateRange: "",
      searchQuery: "",
      startDate: undefined,
      endDate: undefined
    };
    setSearchFilters(resetFilters);
    onFiltersChange(resetFilters);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    handleSearchQueryChange("");
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Advanced Search & Filters</CardTitle>
          <Button variant="ghost" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Search
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-6 relative" ref={searchInputRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search applications, customers, loan types..."
              value={searchFilters.searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              className="pl-10 pr-10"
              onFocus={() => searchFilters.searchQuery && setShowSuggestions(true)}
            />
            {searchFilters.searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Auto-suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center">
                    <Search className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
            <Select value={searchFilters.loanType} onValueChange={(value) => handleFilterChange("loanType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="personal">Personal Loan</SelectItem>
                <SelectItem value="home">Home Loan</SelectItem>
                <SelectItem value="auto">Auto Loan</SelectItem>
                <SelectItem value="business">Business Loan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select value={searchFilters.status} onValueChange={(value) => handleFilterChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
            <Select value={searchFilters.amountRange} onValueChange={(value) => handleFilterChange("amountRange", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Amounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="0-10000">$0 - $10,000</SelectItem>
                <SelectItem value="10000-50000">$10,000 - $50,000</SelectItem>
                <SelectItem value="50000-100000">$50,000 - $100,000</SelectItem>
                <SelectItem value="100000+">$100,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application Date Range</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !searchFilters.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {searchFilters.startDate ? format(searchFilters.startDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchFilters.startDate}
                    onSelect={(date) => handleDateRangeChange(date, searchFilters.endDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !searchFilters.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {searchFilters.endDate ? format(searchFilters.endDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={searchFilters.endDate}
                    onSelect={(date) => handleDateRangeChange(searchFilters.startDate, date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button onClick={handleSearch} className="bg-primary hover:bg-blue-700">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
