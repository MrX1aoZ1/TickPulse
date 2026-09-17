'use client';

import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:3000';

export default function SocialAuthButtons({ disabled = false, next }) {
  const startGoogleLogin = () => {
    const params = next ? `?next=${encodeURIComponent(next)}` : '';
    window.location.href = `${API_BASE_URL}/auth/google${params}`;
  };

  return (
    <div className="space-y-3">
      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">
          or continue with
        </span>
        <div className="flex-grow border-t border-gray-200" />
      </div>

      <button
        type="button"
        onClick={startGoogleLogin}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FcGoogle className="text-xl" aria-hidden="true" />
        Continue with Google
      </button>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="GitHub login is not available yet"
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 rounded-md bg-gray-50 text-gray-400 font-medium cursor-not-allowed"
      >
        <FaGithub className="text-xl" aria-hidden="true" />
        Continue with GitHub
        <span className="text-[10px] uppercase tracking-wide bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
          Soon
        </span>
      </button>
    </div>
  );
}
