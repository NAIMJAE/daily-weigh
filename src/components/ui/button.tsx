import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-[8px] cursor-pointer whitespace-nowrap shrink-0";
    
    const variants = {
      primary: "bg-[#FF4D00] text-white hover:bg-[#E64500] active:scale-[0.99]",
      secondary: "bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#F4F4F5] hover:border-[#D4D4D8]",
      ghost: "text-[#666666] hover:text-[#111111] hover:bg-[#F4F4F5]",
      danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
