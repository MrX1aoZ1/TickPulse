'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function OAuthCallbackPage() {
  const { user, checkAuthStatus } = useAuth();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (user) {
      router.replace('/webapp/');
    }
  }, [user, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    (async () => {
      if (await checkAuthStatus()) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (cancelled) return;

      if (!(await checkAuthStatus())) {
        router.replace('/login?error=session_error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkAuthStatus, router]);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 flex flex-col items-center gap-4">
        <LoadingSpinner />
        <p className="text-sm text-gray-600">Signing you in…</p>
      </div>
    </div>
  );
}
