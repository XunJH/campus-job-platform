import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const logoVariants = cva('', {
  variants: {
    size: {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    },
    tone: {
      default: 'text-gray-900',
      inverted: 'text-white',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'default',
  },
});

export interface LogoProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'color'>,
    VariantProps<typeof logoVariants> {}

const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ className, size, tone, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(logoVariants({ size, tone, className }))}
        {...props}
      >
        <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="currentColor" />
      </svg>
    );
  }
);
Logo.displayName = 'Logo';

export { Logo, logoVariants };
