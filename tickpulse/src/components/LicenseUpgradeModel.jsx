'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LicenseUpgradeModal({ isOpen, onUpgrade, formError }) {
  const [inputKey, setInputKey] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpgrade(inputKey);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-stone-100/90 dark:bg-zinc-950/90 flex items-center justify-center p-4 z-20">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">License Upgrade</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
            Calendar is a premium feature. Enter a premium license key to unlock it
            (demo keys are listed in the README; no payment is required yet).
          </p>

          <input
            type="text"
            className="w-full p-2 border rounded mb-4 dark:bg-zinc-900 dark:border-zinc-700"
            placeholder="Enter premium license key"
            value={inputKey}
            onChange={(event) => {
              let rawValue = event.target.value
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase();

              let formattedValue = '';
              for (let i = 0; i < rawValue.length; i++) {
                if (i > 0 && i % 4 === 0 && i < 16) {
                  formattedValue += '-';
                }
                formattedValue += rawValue[i];
              }

              if (formattedValue.length > 19) {
                formattedValue = formattedValue.slice(0, 19);
              }

              setInputKey(formattedValue);
            }}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push('/webapp')}
              className="px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              Back to tasks
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Upgrade
            </button>
          </div>
          {formError && (
            <p className="mt-2 text-center text-red-500 text-sm">
              {formError}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
