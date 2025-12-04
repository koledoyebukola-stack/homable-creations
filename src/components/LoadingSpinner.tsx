import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      {message && <p className="text-lg text-gray-600">{message}</p>}
    </div>
  );
}