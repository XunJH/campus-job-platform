import { X, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onLogin: () => void;
}

export default function SignUpModal({ onClose, onLogin }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Sign up to Contra</h2>

        <button className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white font-medium py-3 rounded-full hover:bg-black transition-colors mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-medium text-gray-400 tracking-widest">OR SIGN UP BELOW</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="flex gap-3 mb-3">
          <input
            type="text"
            defaultValue="Sam"
            placeholder="First name"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
          />
          <input
            type="text"
            defaultValue="Lee"
            placeholder="Last name"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        <input
          type="email"
          defaultValue="samlee.mobbin+1@gmail.com"
          placeholder="Email address"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors mb-3"
        />

        <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-500" />
            <span className="text-sm text-gray-700">Success!</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <div className="w-5 h-3 rounded-sm bg-orange-400" style={{background: 'linear-gradient(135deg, #F48120 50%, #FAAD3F 50%)'}}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-600 rounded-full" />
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-600">CLOUDFLARE</span>
          </div>
          <div className="text-xs text-gray-400 flex gap-2">
            <a href="#" className="hover:underline">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:underline">Terms</a>
          </div>
        </div>

        <button className="w-full border border-gray-300 text-gray-900 font-medium py-3 rounded-full hover:bg-gray-50 transition-colors mb-4">
          Continue
        </button>

        <p className="text-center text-sm text-gray-500">
          Already using Contra?{' '}
          <button onClick={onLogin} className="text-blue-600 hover:underline font-medium">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
