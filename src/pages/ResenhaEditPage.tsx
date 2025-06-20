import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';

interface Player {
  id: string;
  nome: string;
  tipo: string;
}

interface ParticipantInput {
  id: string;
  valor_gasto: string;
  descricao: string;
  pago: boolean;
}

const ResenhaEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState('');
  const [selectedResponsavel, setSelectedResponsavel] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch resenha data
        const { data: resenha, error: resenhaError } = await supabase
          .from('resenhas')
          .select(`
            *,
            jogadores:resenhas_jogadores(
              jogador_id,
              valor_gasto,
              descricao,
              pago
            )
          `)
          .eq('id', id)
          .single();

        if (resenhaError) throw resenhaError;

        // Fetch all players
        const { data: playersData, error: playersError } = await supabase
          .from('jogadores')
          .select('id, nome, tipo')
          .eq('grupo_id', resenha.grupo_id)
          .eq('ativo', true)
          .order('nome');

        if (playersError) throw playersError;

        setData(resenha.data);
        setSelectedResponsavel(resenha.responsavel_id);
        setPlayers(playersData || []);

        // Initialize participants
        const initialParticipants = playersData?.map(player => {
          const participantData = resenha.jogadores.find(j => j.jogador_id === player.id);
          return {
            id: player.id,
            valor_gasto: participantData ? participantData.valor_gasto.toString() : '0',
            descricao: participantData?.descricao || '',
            pago: participantData?.pago || false
          };
        }) || [];

        setParticipants(initialParticipants);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados da resenha');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, supabase]);

  const handleParticipantChange = (id: string, field: keyof ParticipantInput, value: any) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const calculateTotal = () => {
    return participants.reduce((sum, p) => sum + (parseFloat(p.valor_gasto) || 0), 0);
  };

  const calculateValorDevido = (total: number) => {
    return participants.length > 0 ? total / participants.length : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      const total = calculateTotal();
      const valorDevido = calculateValorDevido(total);

      // Update resenha
      const { error: resenhaError } = await supabase
        .from('resenhas')
        .update({
          data,
          responsavel_id: selectedResponsavel,
          total
        })
        .eq('id', id);

      if (resenhaError) throw resenhaError;

      // Update participants
      const { error: participantsError } = await supabase
        .from('resenhas_jogadores')
        .upsert(
          participants.map(p => ({
            resenha_id: id,
            jogador_id: p.id,
            valor_gasto: parseFloat(p.valor_gasto),
            descricao: p.descricao || null,
            valor_devido: valorDevido,
            pago: p.pago
          }))
        );

      if (participantsError) throw participantsError;

      navigate(`/resenha/${id}`);
    } catch (error) {
      console.error('Erro ao atualizar resenha:', error);
      setError('Erro ao atualizar resenha');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Carregando resenha...</p>
      </div>
    );
  }

  return (
    <div>
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/resenha/${id}`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold mb-2">Editar Resenha</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Atualize os dados da resenha
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="data" className="block text-sm font-medium mb-1">
                Data *
              </label>
              <input
                type="date"
                id="data"
                className="input"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="responsavel" className="block text-sm font-medium mb-1">
                Responsável *
              </label>
              <select
                id="responsavel"
                className="input"
                value={selectedResponsavel}
                onChange={(e) => setSelectedResponsavel(e.target.value)}
                required
              >
                <option value="">Selecione um responsável</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t dark:border-dark-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Participantes</h2>
              <p className="text-sm text-gray-500">
                {participants.length} participantes
              </p>
            </div>

            <div className="space-y-4">
              {participants.map((participant) => {
                const player = players.find(p => p.id === participant.id);
                if (!player) return null;

                return (
                  <div 
                    key={participant.id} 
                    className="p-4 border dark:border-dark-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-sm font-medium">
                          {player.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{player.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-light capitalize">
                          {player.tipo}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleParticipantChange(
                            participant.id,
                            'pago',
                            !participant.pago
                          )}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            participant.pago
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {participant.pago ? 'Pago' : 'Pendente'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Valor Gasto
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input pl-10"
                            value={participant.valor_gasto}
                            onChange={(e) => handleParticipantChange(
                              participant.id,
                              'valor_gasto',
                              e.target.value
                            )}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Descrição
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={participant.descricao}
                          onChange={(e) => handleParticipantChange(
                            participant.id,
                            'descricao',
                            e.target.value
                          )}
                          placeholder="Ex: Bebidas, comidas, etc."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Resumo</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {participants.length} participantes
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold">
                {calculateTotal().toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Valor por pessoa:{' '}
                {calculateValorDevido(calculateTotal()).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/resenha/${id}`)}
            className="btn-outline"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResenhaEditPage;