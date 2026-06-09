import { FileQuestion } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  icon = <FileQuestion className="h-10 w-10 text-muted-foreground" />, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px] rounded-lg border border-dashed', className)}>
      <div className="rounded-full bg-muted/50 p-4">
        {icon}
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
