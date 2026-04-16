const categories = [
  'All',
  'Design',
  'Development',
  'Marketing',
  'Photography',
  'Writing',
  'Music',
  'Video',
];

interface Props {
  active?: string;
  onChange?: (cat: string) => void;
}

export default function CategoryTabs({ active = 'All', onChange }: Props) {
  return (
    <div className="sticky top-14 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto">
        {categories.map((cat) => {
          const isActive = cat === active;
          return (
            <button
              key={cat}
              onClick={() => onChange?.(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
