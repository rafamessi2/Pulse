import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'gradient-bg text-white shadow-md hover:opacity-90',
        secondary: 'bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 border border-secondary/20',
        outline: 'border border-border bg-transparent hover:bg-accent text-foreground',
        ghost: 'hover:bg-accent text-foreground',
        destructive: 'bg-destructive/20 text-red-400 hover:bg-destructive/30 border border-destructive/20',
        muted: 'bg-muted text-muted-foreground hover:bg-muted/80',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-xl px-3 text-xs',
        lg: 'h-13 rounded-2xl px-8 text-base',
        xl: 'h-14 rounded-2xl px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
