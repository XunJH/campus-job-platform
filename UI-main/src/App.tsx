import { useState } from 'react';
import type { PageView } from './types';
import LandingPage from './components/landing/LandingPage';
import CommunityPage from './components/dashboard/CommunityPage';
import Playground from './playground';

export default function App() {
  const [view, setView] = useState<PageView>('landing');
  const hash = window.location.hash;

  if (hash === '#/playground') {
    return <Playground />;
  }

  if (view === 'landing' || view === 'landing-signup') {
    return <LandingPage view={view} setView={setView} />;
  }

  return <CommunityPage view={view} setView={setView} />;
}
