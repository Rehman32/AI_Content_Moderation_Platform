import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 md:p-8">
      {/* Background Gradient for SaaS feel */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-3xl opacity-50 mix-blend-multiply" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/20 blur-3xl opacity-50 mix-blend-multiply" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Content Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Enterprise-grade content safety platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
