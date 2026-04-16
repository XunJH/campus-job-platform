interface Props {
  onSignUp: () => void;
  onGoToDashboard: () => void;
}

export default function LandingNavbar({ onSignUp, onGoToDashboard }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <button onClick={onGoToDashboard} className="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="currentColor" />
          </svg>
          contra
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-700">
          <a href="#" className="hover:text-black transition-colors">Independents</a>
          <a href="#" className="hover:text-black transition-colors">Companies</a>
          <a href="#" className="hover:text-black transition-colors">Creator tools</a>
          <a href="#" className="hover:text-black transition-colors">Human in the loop</a>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors">
          <img
            src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=32&h=32&fit=crop"
            alt="Indy"
            className="w-5 h-5 rounded-full object-cover"
          />
          <span>Get Indy</span>
          <span className="bg-blue-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">AI</span>
        </button>
        <button
          onClick={onSignUp}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-black transition-colors"
        >
          Sign up
        </button>
        <button className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
          Log in
        </button>
      </div>
    </nav>
  );
}
