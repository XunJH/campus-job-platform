import { Search } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="relative pt-14 pb-8 bg-white overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.35,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(219,234,254,0.5) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center text-center px-4 pt-12 pb-6">
        <div className="flex items-center bg-gray-100 rounded-full p-1 mb-10 text-sm font-medium">
          <button className="px-5 py-1.5 rounded-full bg-white shadow-sm text-gray-900 text-xs font-semibold tracking-wide">
            HIRE
          </button>
          <button className="px-5 py-1.5 rounded-full text-gray-500 text-xs font-semibold tracking-wide hover:text-gray-700 transition-colors">
            GET HIRED
          </button>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-950 tracking-tight leading-tight mb-5">
          A new way to work
        </h1>
        <p className="text-gray-500 text-lg max-w-md leading-relaxed mb-10">
          Discover, connect, and work with the world's best independent creatives and clients.
        </p>

        <div className="flex items-center w-full max-w-xl bg-white border border-gray-200 rounded-full shadow-sm overflow-hidden">
          <Search className="ml-4 text-gray-400 shrink-0" size={18} />
          <input
            type="text"
            placeholder="What do you need help with?"
            className="flex-1 px-3 py-3 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          <button className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full m-1 hover:bg-black transition-colors whitespace-nowrap">
            Browse 1M+ independents
          </button>
        </div>
      </div>
    </div>
  );
}
