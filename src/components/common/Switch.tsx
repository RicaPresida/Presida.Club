import React from 'react';
import { Loader2 } from 'lucide-react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, loading }) => {
  return (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 items-center rounded-full
        ${checked ? 'bg-primary-500' : 'bg-gray-200 dark:bg-dark-light'}
        transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed`}
      onClick={onChange}
      disabled={loading}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
          ${loading ? 'animate-pulse' : ''}`}
      />
      {loading && (
        <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-primary-500" />
      )}
    </button>
  );
};