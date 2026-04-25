import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import type { ReactNode } from 'react';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-subtle" />
      <div className="container flex min-h-screen flex-col items-center justify-center py-10">
        <Link to="/" className="mb-8" aria-label="Impactory home">
          <Logo />
        </Link>
        <Card className="w-full max-w-md border-border/70 p-8 shadow-elegant">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
        </Card>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}