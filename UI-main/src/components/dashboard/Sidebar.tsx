import { Home, LayoutDashboard, Briefcase, MessageSquare, User, BarChart2, Compass, FolderOpen, Wallet, ChevronRight, Plus } from 'lucide-react';
import type { PageView } from '../../types';

interface Props {
  setView: (v: PageView) => void;
}

const navItems = [
  { icon: Home, label: 'Home', badge: 'BETA', active: true },
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Briefcase, label: 'Jobs' },
  { icon: MessageSquare, label: 'Messages' },
];

export default function Sidebar({ setView }: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="p-4">
        <button
          onClick={() => setView('landing')}
          className="flex items-center gap-2 font-semibold text-[15px] tracking-tight mb-5"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="currentColor" />
          </svg>
          contra
        </button>

        <button className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 mb-5 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2.5">
            <img
              src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop"
              alt="Sam"
              className="w-7 h-7 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="text-xs font-medium text-gray-900 leading-tight">Independent workspace</p>
              <p className="text-xs text-gray-500">Sam Lee</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </button>

        <nav className="space-y-0.5 mb-4">
          {navItems.map(({ icon: Icon, label, badge, active }) => (
            <button
              key={label}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={16} />
                {label}
              </span>
              {badge && (
                <span className="text-[9px] font-bold tracking-wider text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest px-3 mb-1">IDENTITY</p>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <User size={16} />
            Profile
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <BarChart2 size={16} />
            Analytics
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest px-3 mb-1">LEADS</p>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <Compass size={16} />
            Discover
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest px-3 mb-1">PROJECTS & PAYMENTS</p>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <span className="flex items-center gap-2.5">
              <FolderOpen size={16} />
              Projects & invoices
            </span>
            <Plus size={13} className="text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <span className="flex items-center gap-2.5">
              <Wallet size={16} />
              Wallet
            </span>
            <span className="text-xs text-gray-400">$0.00</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
