import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-brand-fg shadow-md shadow-brand/30 hover:bg-brand-hover active:scale-[0.98]",
        secondary:
          "bg-surface-2 text-fg hover:bg-surface-3 border border-line-strong active:scale-[0.98]",
        destructive:
          "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:scale-[0.98]",
        outline:
          "border border-line-strong bg-transparent hover:bg-surface-2 hover:text-fg",
        ghost: "hover:bg-surface-2 text-fg-muted hover:text-fg",
        link: "text-brand-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-6 text-base font-bold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
