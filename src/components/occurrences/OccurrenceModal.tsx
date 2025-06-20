import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { Database } from '../../types/database.types';
import { useAuth } from '../../hooks/useAuth';

type Player = Database['public']['Tables']['jogadores']['Row'];
type OccurrenceType = {
  id: string;
  nome: string;
  descricao: string;
};

interface OccurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainPlayer: Player;
  groupId: string;
}

const OccurrenceModal: React.FC<OccurrenceModalProps> = ({
  isOpen,
  onClose,
  mainPlayer,
  groupId,
}) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [involvedPlayers, setInvolvedPlayers] = useState<string[]>([mainPlayer.id]);
  
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch occurrence types
        const { data: types, error: typesError } = await supabase
          .from('tipos_ocorrencia')
          .select('*')
          .order('nome');

        if (typesError) throw typesError;
        setOccurrenceTypes(types || []);

        // Fetch players from group
        const { data: players, error: playersError } = await supabase
          .from('jogadores')
          .select('*')
          .eq('grupo_id', groupId)
          .eq('ativo', true)
          .neq('id', mainPlayer.id)
          .order('nome');

        if (playersError) throw playersError;
        setAvailablePlayers(players || []);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Error loading required data');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, groupId, mainPlayer.id, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (!selectedType || !description) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create occurrence
      const { data: occurrence, error: occurrenceError } = await supabase
        .from('ocorrencias')
        .insert({
          tipo_id: selectedType,
          descricao: description,
          grupo_id: groupId,
          criado_por: user.id,
        })
        .select()
        .single();

      if (occurrenceError) throw occurrenceError;

      // Register involved players
      const involvedPlayersData = involvedPlayers.map(playerId => ({
        ocorrencia_id: occurrence.id,
        jogador_id: playerId,
      }));

      const { error: playersError } = await supabase
        .from('ocorrencias_jogadores')
        .insert(involvedPlayersData);

      if (playersError) throw playersError;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedType('');
        setDescription('');
        setInvolvedPlayers([mainPlayer.id]);
      }, 2000);
    } catch (error) {
      console.error('Error registering occurrence:', error);
      setError('Error registering occurrence');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-paper rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b dark:border-dark-border">
          <h2 className="text-xl font-bold">Registrar Ocorrência</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
              Ocorrência registrada com sucesso!
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Ocorrência *
              </label>
              <select
                className="input"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                required
              >
                <option value="">Selecione um tipo</option>
                {occurrenceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.nome.replace('_', ' ').charAt(0).toUpperCase() + 
                     type.nome.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Jogadores Envolvidos *
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-light rounded">
                  <input type="checkbox" checked disabled />
                  <span>{mainPlayer.nome} (Principal)</span>
                </div>
                {availablePlayers.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`player-${player.id}`}
                      checked={involvedPlayers.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInvolvedPlayers([...involvedPlayers, player.id]);
                        } else {
                          setInvolvedPlayers(
                            involvedPlayers.filter((id) => id !== player.id)
                          );
                        }
                      }}
                    />
                    <label htmlFor={`player-${player.id}`}>{player.nome}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Descrição *
              </label>
              <textarea
                className="input min-h-[100px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que aconteceu..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar Ocorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OccurrenceModal;