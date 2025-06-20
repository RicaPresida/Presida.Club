import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, DollarSign, AlertCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Player {
  id: string;
  nome: string;
  tipo: string;
}

interface ParticipantInput {
  id: string;
  valor_gasto: string;
  descricao: string;
  selected: boolean;
}

const ResenhaFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState<ParticipantInput[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!activeGroup) return;

      try {
        const { data: playersData, error } = await supabase
          .from('jogadores')
          .select('id, nome, tipo')
          .eq('grupo_id', activeGroup.id)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        
        // Initialize all players as participants
        setPlayers(playersData || []);
        setParticipants((playersData || []).map(player => ({
          id: player.id,
          valor_gasto: '0',
          descricao: '',
          selected: false
        })));
      } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        setError('Erro ao carregar jogadores');
      }
    };

    fetchPlayers();
  }, [supabase, activeGroup]);

  const handleParticipantChange = (id: string, field: keyof ParticipantInput, value: any) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const calculateTotal = () => {
    return participants
      .filter(p => p.selected)
      .reduce((sum, p) => sum + (parseFloat(p.valor_gasto) || 0), 0);
  };

  const calculateValorDevido = (total: number) => {
    const selectedCount = participants.filter(p => p.selected).length;
    return selectedCount > 0 ? total / selectedCount : 0;
  };

  const calculateBalance = (participant: ParticipantInput) => {
    if (!participant.selected) return 0;
    const total = calculateTotal();
    const valorDevido = calculateValorDevido(total);
    return parseFloat(participant.valor_gasto) - valorDevido;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !user) return;

    if (!selectedResponsavel) {
      setError('Selecione um responsável');
      return;
    }

    const selectedParticipants = participants.filter(p => p.selected);
    if (selectedParticipants.length === 0) {
      setError('Selecione pelo menos um participante');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const total = calculateTotal();
      const valorDevido = calculateValorDevido(total);

      // Create resenha
      const { data: resenha, error: resenhaError } = await supabase
        .from('resenhas')
        .insert({
          data,
          grupo_id: activeGroup.id,
          responsavel_id: selectedResponsavel,
          total,
          status: 'pendente'
        })
        .select()
        .single();

      if (resenhaError) throw resenhaError;

      // Add participants
      const { error: participantsError } = await supabase
        .from('resenhas_jogadores')
        .insert(
          selectedParticipants.map(p => ({
            resenha_id: resenha.id,
            jogador_id: p.id,
            valor_gasto: parseFloat(p.valor_gasto),
            valor_devido: valorDevido,
            pago: false
          }))
        );

      if (participantsError) throw participantsError;

      navigate('/resenha');
    } catch (error) {
      console.error('Erro ao criar resenha:', error);
      setError('Erro ao criar resenha');
    } finally {
      setLoading(false);
    }
  };

  if (!activeGroup) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Nenhum grupo selecionado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Selecione um grupo ativo para criar resenhas
        </p>
      </div>
    );
  }

  const total = calculateTotal();
  const valorDevido = calculateValorDevido(total);

  return (
    <div>
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/resenha')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold mb-2">Nova Resenha</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Registre os gastos da resenha
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
                {participants.filter(p => p.selected).length} selecionados
              </p>
            </div>

            <div className="space-y-4">
              {participants.map((participant) => {
                const player = players.find(p => p.id === participant.id);
                if (!player) return null;

                const balance = calculateBalance(participant);

                return (
                  <div 
                    key={participant.id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      participant.selected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-light'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={participant.selected}
                        onChange={(e) => handleParticipantChange(
                          participant.id,
                          'selected',
                          e.target.checked
                        )}
                        className="h-4 w-4"
                      />

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{player.nome}</span>
                          <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-light capitalize">
                            {player.tipo}
                          </span>
                        </div>

                        {participant.selected && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

                            <div className="md:col-span-2">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-dark-light">
                                <div className="flex items-center gap-2">
                                  {balance > 0 ? (
                                    <ArrowUpCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  <span className="text-sm">
                                    {balance > 0 ? 'Valor a receber:' : 'Valor a pagar:'}
                                  </span>
                                </div>
                                <span className={`font-medium ${
                                  balance > 0 
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {Math.abs(balance).toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
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
                {participants.filter(p => p.selected).length} participantes
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold">
                {total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Valor por pessoa:{' '}
                {valorDevido.toLocaleString('pt-BR', {
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
            onClick={() => navigate('/resenha')}
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
            {loading ? 'Criando...' : 'Criar Resenha'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResenhaFormPage;