import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-[#F4F4F5] text-[#666666] border border-[#E5E5E5]",
    accent: "bg-[#FFF1EB] text-[#FF4D00] border border-[#FFD8CC]",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    outline: "bg-transparent text-[#666666] border border-[#E5E5E5]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] text-xs font-medium tracking-tight whitespace-nowrap shrink-0",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
