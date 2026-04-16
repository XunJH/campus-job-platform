const avatars = [
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
  'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop',
];

const nodePositions = [
  { x: 50, y: 20, size: 32, idx: 0 },
  { x: 78, y: 35, size: 28, idx: 1 },
  { x: 85, y: 62, size: 30, idx: 2 },
  { x: 65, y: 78, size: 26, idx: 3 },
  { x: 15, y: 65, size: 28, idx: 4 },
  { x: 8, y: 38, size: 30, idx: 5 },
  { x: 35, y: 15, size: 26, idx: 6 },
  { x: 35, y: 72, size: 28, idx: 7 },
];

export default function WaitlistCard() {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="border-b border-gray-100 pb-4 mb-4 flex items-start gap-3">
        <img
          src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&fit=crop"
          alt="Sam"
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <input
            type="text"
            placeholder="What's going on, Sam?"
            className="w-full text-sm text-gray-400 outline-none placeholder-gray-400"
          />
        </div>
        <button className="text-sm font-medium text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full">
          Post
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="relative h-56 bg-gradient-to-b from-blue-50 via-green-50 to-white flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
            {nodePositions.map((node, i) =>
              nodePositions.slice(i + 1, i + 3).map((target, j) => (
                <line
                  key={`${i}-${j}`}
                  x1={`${node.x}%`} y1={`${node.y}%`}
                  x2={`${target.x}%`} y2={`${target.y}%`}
                  stroke="#e5e7eb" strokeWidth="1"
                />
              ))
            )}
            <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="78%" y2="35%" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="85%" y2="62%" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="15%" y2="65%" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="8%" y2="38%" stroke="#e5e7eb" strokeWidth="1" />
          </svg>

          {nodePositions.map((node, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-white shadow-md overflow-hidden"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: `${node.size}px`,
                height: `${node.size}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <img src={avatars[node.idx]} alt="" className="w-full h-full object-cover" />
            </div>
          ))}

          <div
            className="absolute rounded-full border-3 border-white shadow-lg overflow-hidden bg-blue-500 flex items-center justify-center text-white font-bold"
            style={{
              left: '50%',
              top: '50%',
              width: '44px',
              height: '44px',
              transform: 'translate(-50%, -50%)',
              border: '3px solid white',
            }}
          >
            A
          </div>

          <div
            className="absolute w-7 h-7 bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center"
            style={{ left: '70%', top: '18%' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 21V3h14v9h-7v9H5z" fill="#333" />
            </svg>
          </div>
        </div>

        <div className="p-6 text-center">
          <h3 className="font-bold text-gray-900 text-xl mb-2">Claim your spot</h3>
          <p className="text-sm text-gray-500 mb-5">
            We are rolling out access to small groups at a time as we refine the experience.
          </p>

          <div className="border border-gray-100 rounded-xl p-4 mb-5">
            <p className="text-3xl font-bold text-gray-900">56,460</p>
            <p className="text-[10px] tracking-widest text-gray-400 font-semibold mt-1">
              PEOPLE ON THE WAITLIST
            </p>
          </div>

          <button className="w-full bg-gray-900 text-white font-medium py-3.5 rounded-full hover:bg-black transition-colors">
            Join the waitlist
          </button>
        </div>
      </div>
    </div>
  );
}
