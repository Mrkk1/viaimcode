import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-black/5 hover:bg-primary/90",
        tech: "tech-button relative overflow-hidden rounded-xl",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-black/5 hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm shadow-black/5 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm shadow-black/5 hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        tech: "h-[60px] px-12 py-3 text-lg uppercase",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const OriginButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // Render the tech-text span and overlay div only for the tech variant
    if (variant === "tech") {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size: size || "tech", className }))}
          ref={ref}
          style={{
            background: 'linear-gradient(to bottom, #0D1F3C, #050E1B)',
            border: '1px solid #2A578B',
            boxShadow: '0 0 15px rgba(42, 87, 139, 0.4), inset 0 1px 2px rgba(135, 207, 255, 0.15), inset 0 -1px 2px rgba(0, 0, 0, 0.3)',
            fontFamily: "'Roboto', sans-serif",
            fontWeight: 500,
            letterSpacing: '1px',
            textShadow: '0 1px 1px rgba(0, 0, 0, 0.3), 0 -1px 0 rgba(200, 235, 255, 0.2)'
          }}
          {...props}
        >
          <span
            className="tech-text inline-block relative z-[1]"
            style={{
              background: 'linear-gradient(to bottom, #B8E0FF, #82B9E8)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}
          >
            {props.children}
          </span>
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(135, 207, 255, 0.05) 0%, rgba(135, 207, 255, 0) 50%)'
            }}
          />
        </Comp>
      );
    }

    // For other variants, render the button normally
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
OriginButton.displayName = "OriginButton";

export { OriginButton, buttonVariants };
