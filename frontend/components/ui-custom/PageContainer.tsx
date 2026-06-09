import { cn } from '../../lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageContainer({ children, className, title, description, action }: PageContainerProps) {
  return (
    <div className={cn('flex-1 space-y-4 p-4 md:p-8 pt-6', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between space-y-2">
          <div>
            {title && <h2 className="text-3xl font-bold tracking-tight">{title}</h2>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex items-center space-x-2">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
