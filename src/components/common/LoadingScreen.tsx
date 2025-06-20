import React from 'react';
import { Trophy } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center dark:bg-dark">
      <div className="text-center">
        <Trophy className="w-16 h-16 text-primary-500 mx-auto mb-4 animate-pulse-slow" />
        <h1 className="text-2xl font-bold mb-2">Presida.Club</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;