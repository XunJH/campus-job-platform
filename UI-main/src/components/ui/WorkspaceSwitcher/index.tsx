import * as React from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Avatar } from '../Avatar';

interface Workspace {
  id: string;
  name: string;
  memberName?: string;
  avatar?: string;
}

export interface WorkspaceSwitcherProps {
  className?: string;
  workspaces: Workspace[];
  activeId: string;
  onSelect: (id: string) => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  className,
  workspaces,
  activeId,
  onSelect,
}) => {
  const [open, setOpen] = React.useState(false);
  const active = workspaces.find((w) => w.id === activeId) || workspaces[0];
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Avatar src={active?.avatar} fallback={active?.name} size="sm" />
            <div className="text-left">
              <p className="text-xs font-medium text-gray-900 leading-tight truncate max-w-[120px]">
                {active?.name}
              </p>
              {active?.memberName && (
                <p className="text-xs text-gray-500">{active.memberName}</p>
              )}
            </div>
          </div>
          <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-md py-1 z-50">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeId;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    onSelect(ws.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={ws.avatar} fallback={ws.name} size="xs" />
                    <span className="font-medium">{ws.name}</span>
                  </div>
                  {isActive && <Check size={14} className="text-gray-900" />}
                </button>
              );
            })}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Plus size={14} />
                <span>Add workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
WorkspaceSwitcher.displayName = 'WorkspaceSwitcher';

export { WorkspaceSwitcher };
