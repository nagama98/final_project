import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import LoanApplicationForm from '@/components/forms/loan-application-form';
import { Button } from '@/components/ui/button';

export default function NewApplication() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/applications">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Loan Application</h1>
          <p className="text-muted-foreground">
            Create a new loan application for processing
          </p>
        </div>
      </div>
      
      <LoanApplicationForm 
        onSuccess={() => {
          // Could redirect or show success message
          console.log('Application submitted successfully');
        }}
      />
    </div>
  );
}