import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingScreen({ message = 'Loading...', fullScreen = false, className }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4',
        fullScreen ? 'min-h-screen bg-background' : 'h-[400px] w-full rounded-lg border border-dashed',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
    </div>
  );
}
