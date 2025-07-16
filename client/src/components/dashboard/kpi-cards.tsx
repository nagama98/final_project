import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, DollarSign, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface KPIData {
  totalApplications: number;
  approvedLoans: number;
  totalPortfolio: number;
  pendingReview: number;
  approvalRate: string;
}

export default function KPICards() {
  const { data: metrics, isLoading } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/metrics'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const kpiData = [
    {
      title: "Total Applications",
      value: metrics.totalApplications.toLocaleString(),
      icon: FileText,
      color: "blue",
      change: "+12.5%",
      changeLabel: "from last month"
    },
    {
      title: "Approved Loans",
      value: metrics.approvedLoans.toLocaleString(),
      icon: CheckCircle,
      color: "green",
      change: `+${metrics.approvalRate}%`,
      changeLabel: "approval rate"
    },
    {
      title: "Total Portfolio",
      value: `$${(metrics.totalPortfolio / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: "orange",
      change: "+15.2%",
      changeLabel: "growth"
    },
    {
      title: "Pending Review",
      value: metrics.pendingReview.toLocaleString(),
      icon: Clock,
      color: "yellow",
      change: "-2.1%",
      changeLabel: "backlog"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((item, index) => {
        const Icon = item.icon;
        const colorClasses = {
          blue: "bg-blue-100 text-blue-600",
          green: "bg-green-100 text-green-600",
          orange: "bg-orange-100 text-orange-600",
          yellow: "bg-yellow-100 text-yellow-600"
        };

        return (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{item.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[item.color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`${item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change}
                </span>
                <span className="text-gray-500 ml-2">{item.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
