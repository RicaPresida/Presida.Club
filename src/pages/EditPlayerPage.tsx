import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PlayerForm from '../components/players/PlayerForm';

const EditPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!id || !user) {
    return null;
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Editar Jogador</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Atualize as informações do jogador
        </p>
      </header>

      <div className="card p-6">
        <PlayerForm
          groupId={id}
          playerId={id}
          onCancel={() => navigate('/jogadores')}
        />
      </div>
    </div>
  );
};

export default EditPlayerPage;