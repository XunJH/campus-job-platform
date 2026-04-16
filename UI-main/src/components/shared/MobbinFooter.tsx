export default function MobbinFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-8">
      <div className="px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-gray-900">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="currentColor" />
          </svg>
          contra
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-900 transition-colors">About</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Careers</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Contra, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
