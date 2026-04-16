import { TrendingUp, Smile, Bell, PanelLeftClose } from 'lucide-react';
import type { PageView } from '../../types';

interface Props {
  view: PageView;
  setView: (v: PageView) => void;
}

export default function TopBar({ view, setView }: Props) {
  const isAiView = view === 'community-ai';

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <PanelLeftClose size={18} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-gray-900 text-lg">Community</h1>
          <span className="text-[10px] font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            BETA
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <TrendingUp size={14} className="text-gray-500" />
          <span className="font-medium">
            {isAiView ? '50' : 'Get discovered'}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
        </div>

        <button
          onClick={() => setView(isAiView ? 'community-waitlist' : 'community-ai')}
          className={`flex items-center gap-1.5 border rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            isAiView
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'border-pink-300 text-pink-600 hover:bg-pink-50'
          }`}
        >
          {isAiView ? (
            <>
              <span>✦</span>
              Refer & earn $
            </>
          ) : (
            <>
              <span>✦</span>
              Contra Pro
            </>
          )}
        </button>

        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          <Smile size={20} />
        </button>

        <button className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {isAiView ? '3' : '9+'}
          </span>
        </button>
      </div>
    </header>
  );
}
