import type { PageView } from '../../types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import WaitlistCard from './WaitlistCard';
import CommunityFeed from './CommunityFeed';

interface Props {
  view: PageView;
  setView: (v: PageView) => void;
}

export default function CommunityPage({ view, setView }: Props) {
  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <Sidebar setView={setView} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar view={view} setView={setView} />
        <div className="flex-1 flex overflow-hidden">
          <WaitlistCard />
          <CommunityFeed />
        </div>
      </div>
    </div>
  );
}
