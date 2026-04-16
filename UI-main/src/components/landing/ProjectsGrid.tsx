const projects = [
  {
    id: 1,
    title: 'Brand Identity System',
    author: 'Sarah Lin',
    image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  },
  {
    id: 2,
    title: 'E-commerce Dashboard',
    author: 'Marcus J.',
    image: 'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  },
  {
    id: 3,
    title: 'Mobile App UI Kit',
    author: 'Emily Zhang',
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  },
  {
    id: 4,
    title: 'Social Media Campaign',
    author: 'David Kim',
    image: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  },
];

export default function ProjectsGrid() {
  return (
    <div className="px-6 py-8 bg-white">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{project.title}</h3>
              <div className="flex items-center gap-2">
                <img src={project.avatar} alt={project.author} className="w-5 h-5 rounded-full object-cover" />
                <span className="text-xs text-gray-500">{project.author}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
