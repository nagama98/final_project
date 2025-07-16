import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Database, Plus } from 'lucide-react';

export default function DataManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordCount, setRecordCount] = useState(100000);

  // Get current data status
  const { data: dataStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/data-status'],
    refetchInterval: 5000, // Refresh every 5 seconds while generating
  });

  // Generate sample data mutation
  const generateDataMutation = useMutation({
    mutationFn: async (count: number) => {
      return apiRequest('/api/generate-sample-data', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Data Generation Started',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/data-status'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start data generation',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateData = () => {
    generateDataMutation.mutate(recordCount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Management</h1>
        <p className="text-muted-foreground">
          Manage loan application data and generate sample records
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Data Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Current Data Status
            </CardTitle>
            <CardDescription>
              Overview of existing loan applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading status...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Applications:</span>
                  <span className="text-2xl font-bold">{dataStatus?.totalApplications || 0}</span>
                </div>
                {dataStatus?.lastGenerated && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Generated:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(dataStatus.lastGenerated).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/data-status'] })}
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Sample Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Generate Sample Data
            </CardTitle>
            <CardDescription>
              Create dummy loan applications for testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="recordCount" className="text-sm font-medium">
                  Number of Records
                </label>
                <Input
                  id="recordCount"
                  type="number"
                  min="1000"
                  max="1000000"
                  value={recordCount}
                  onChange={(e) => setRecordCount(parseInt(e.target.value) || 100000)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 100,000 records (includes Elasticsearch indexing)
                </p>
              </div>

              <Button 
                onClick={handleGenerateData}
                disabled={generateDataMutation.isPending}
                className="w-full"
              >
                {generateDataMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate {recordCount.toLocaleString()} Records
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Data generation runs in the background</p>
                <p>• Each record includes realistic customer data</p>
                <p>• Applications are automatically indexed in Elasticsearch</p>
                <p>• AI embeddings are generated for semantic search</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Generation Progress */}
      {generateDataMutation.isPending && (
        <Card>
          <CardHeader>
            <CardTitle>Data Generation in Progress</CardTitle>
            <CardDescription>
              Please wait while sample data is being generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating loan applications with Elasticsearch indexing...</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This process may take several minutes depending on the number of records and external service performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}