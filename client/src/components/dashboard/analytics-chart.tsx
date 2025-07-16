import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export default function AnalyticsChart() {
  const riskDistribution = [
    { label: "Low Risk (800+)", percentage: 45, color: "bg-green-500" },
    { label: "Medium Risk (650-799)", percentage: 35, color: "bg-yellow-500" },
    { label: "High Risk (Below 650)", percentage: 20, color: "bg-red-500" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Loan Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Loan Performance</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-gray-500">7D</Button>
              <Button size="sm" className="bg-blue-50 text-primary">30D</Button>
              <Button variant="ghost" size="sm" className="text-gray-500">90D</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Chart visualization would be rendered here</p>
              <p className="text-sm text-gray-400">Showing loan approval rates over time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Risk Assessment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskDistribution.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
