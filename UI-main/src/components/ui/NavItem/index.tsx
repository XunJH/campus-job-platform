import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';
import { Badge } from '../Badge';
import type { LucideIcon } from 'lucide-react';

const navItemVariants = cva(
  'w-full flex items-center justify-between rounded-lg text-sm font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'bg-blue-50 text-blue-700',
        false: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
      },
      size: {
        default: 'px-3 py-2',
        compact: 'px-2 py-1.5 text-xs',
      },
    },
    defaultVariants: {
      active: false,
      size: 'default',
    },
  }
);

export interface NavItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof navItemVariants> {
  icon?: LucideIcon;
  label: string;
  badge?: string;
}

const NavItem = React.forwardRef<HTMLButtonElement, NavItemProps>(
  ({ className, active, size, icon: Icon, label, badge, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(navItemVariants({ active, size, className }))}
        {...props}
      >
        <span className="flex items-center gap-2.5">
          {Icon && <Icon size={size === 'compact' ? 14 : 16} />}
          {label}
        </span>
        {badge && (
          <Badge variant="blue" size={size === 'compact' ? 'sm' : 'md'} shape="default">
            {badge}
          </Badge>
        )}
      </button>
    );
  }
);
NavItem.displayName = 'NavItem';

export { NavItem, navItemVariants };
