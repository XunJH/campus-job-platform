import { useState } from 'react';
import type { PageView } from '../../types';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import CategoryTabs from './CategoryTabs';
import ProjectsGrid from './ProjectsGrid';
import SignUpModal from './SignUpModal';
import MobbinFooter from '../shared/MobbinFooter';

interface Props {
  view: PageView;
  setView: (v: PageView) => void;
}

export default function LandingPage({ view: _view, setView }: Props) {
  const [showSignUp, setShowSignUp] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar onSignUp={() => setShowSignUp(true)} onGoToDashboard={() => setView('community-waitlist')} />
      <HeroSection />
      <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
      <ProjectsGrid />
      <MobbinFooter />
      {showSignUp && (
        <SignUpModal onClose={() => setShowSignUp(false)} onLogin={() => setShowSignUp(false)} />
      )}
    </div>
  );
}
