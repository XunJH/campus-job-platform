import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const avatarVariants = cva('relative inline-flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      xs: 'w-6 h-6 text-[10px]',
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-14 h-14 text-base',
      xl: 'w-20 h-20 text-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, ...props }, ref) => {
    const [error, setError] = React.useState(false);
    const showFallback = !src || error;
    const initial = fallback?.charAt(0).toUpperCase() || '?';

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, className }), 'bg-gray-100 text-gray-600 font-medium items-center justify-center')}
        {...props}
      >
        {!showFallback ? (
          <img
            src={src}
            alt={alt || fallback}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
