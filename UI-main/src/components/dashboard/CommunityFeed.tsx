import { TrendingUp, MessageSquare, Heart, Share2, MoreHorizontal } from 'lucide-react';

const feedItems = [
  {
    id: 1,
    name: 'Alice Chen',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
    time: '2h ago',
    content: 'Just launched a new design system project! Excited to share more soon.',
    likes: 24,
    comments: 5,
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
    time: '4h ago',
    content: 'Looking for freelance frontend developers with React + Tailwind experience. DM me!',
    likes: 56,
    comments: 12,
  },
];

export default function CommunityFeed() {
  return (
    <div className="w-80 border-l border-gray-100 bg-white h-full overflow-y-auto p-4 hidden xl:block">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Trending</h3>
      </div>

      <div className="space-y-4">
        {feedItems.map((item) => (
          <div key={item.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <img src={item.avatar} alt={item.name} className="w-7 h-7 rounded-full object-cover" />
              <div>
                <p className="text-xs font-medium text-gray-900">{item.name}</p>
                <p className="text-[10px] text-gray-400">{item.time}</p>
              </div>
              <button className="ml-auto text-gray-400 hover:text-gray-600">
                <MoreHorizontal size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{item.content}</p>
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              <button className="flex items-center gap-1 hover:text-gray-700">
                <Heart size={12} />
                {item.likes}
              </button>
              <button className="flex items-center gap-1 hover:text-gray-700">
                <MessageSquare size={12} />
                {item.comments}
              </button>
              <button className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                <Share2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
