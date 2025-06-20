import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <Trophy className="w-20 h-20 text-primary-500 mb-6" />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Página não encontrada</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
        A página que você está procurando foi movida, excluída ou nunca existiu.
      </p>
      <Link to="/" className="btn-primary">
        Voltar para o início
      </Link>
    </div>
  );
};

export default NotFoundPage;