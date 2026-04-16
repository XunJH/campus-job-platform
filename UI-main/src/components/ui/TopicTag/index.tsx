import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

const topicTagVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50',
        filled: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        active: 'bg-gray-900 text-white hover:bg-black',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-[10px] rounded-full',
        md: 'px-3 py-1 text-xs rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface TopicTagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof topicTagVariants> {
  onRemove?: () => void;
}

const TopicTag = React.forwardRef<HTMLSpanElement, TopicTagProps>(
  ({ className, variant, size, onRemove, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(topicTagVariants({ variant, size, className }))}
        {...props}
      >
        {children}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
          >
            <X size={size === 'sm' ? 10 : 12} />
          </button>
        )}
      </span>
    );
  }
);
TopicTag.displayName = 'TopicTag';

export { TopicTag, topicTagVariants };
