import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Documents() {
  return (
    <div className="w-full max-w-none">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">Upload, manage, and search through loan documents</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Document Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">Document management page content will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
