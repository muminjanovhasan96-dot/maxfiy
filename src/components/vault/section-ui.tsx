"use client";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  count,
  unit,
  children,
}: {
  count?: number;
  unit?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <p className="text-sm text-muted-foreground">
        {count !== undefined ? `${count.toLocaleString()} ${unit ?? "items"}` : ""}
      </p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function GallerySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-[3px] sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
      {Array.from({ length: 24 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-none" />
      ))}
    </div>
  );
}
