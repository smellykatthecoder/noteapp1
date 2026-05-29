"use client";

import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  subtle?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

export function GlassPanel({
  children,
  className,
  subtle = false,
  as: Component = "div",
}: GlassPanelProps) {
  return (
    <Component
      className={cn(
        "rounded-2xl",
        subtle ? "glass-subtle" : "glass",
        className
      )}
    >
      {children}
    </Component>
  );
}
