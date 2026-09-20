'use client';

import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:3000';

export default function SocialAuthButtons({ disabled = false, next }) {
  const oauthQuery = next ? `?next=${encodeURIComponent(next)}` : '';

  const startOAuth = (provider) => {
    window.location.href = `${API_BASE_URL}/auth/${provider}${oauthQuery}`;
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
        onClick={() => startOAuth('google')}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FcGoogle className="text-xl" aria-hidden="true" />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => startOAuth('github')}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FaGithub className="text-xl" aria-hidden="true" />
        Continue with GitHub
      </button>
    </div>
  );
}
