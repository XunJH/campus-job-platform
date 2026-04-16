import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input, inputVariants } from '../Input';
import { cn } from '../../../lib/utils';
import type { VariantProps } from 'class-variance-authority';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, variant, size, state, onClear, value, ...props }, ref) => {
    const hasValue = Boolean(value);
    const sizeClasses = {
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
    };
    const heightClass = sizeClasses[(size as keyof typeof sizeClasses) || 'md'];

    return (
      <div className={cn('relative w-full', className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <Input
          ref={ref}
          variant={variant}
          size={size}
          state={state}
          className={cn('pl-9', hasValue && onClear && 'pr-8')}
          value={value}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex items-center justify-center rounded-full',
              heightClass
            )}
            style={{ width: heightClass === 'h-8' ? '1rem' : heightClass === 'h-10' ? '1.25rem' : '1.5rem' }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
