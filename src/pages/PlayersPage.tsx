import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Users, 
  Star, 
  Pencil,
  Trash2, 
  AlertCircle,
  Archive,
  ChevronDown,
  ChevronUp,
  Trophy,
  Calendar,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Search
} from 'lucide-react';
import PlayerForm from '../components/players/PlayerForm';
import OccurrenceModal from '../components/occurrences/OccurrenceModal';

interface Player {
  id: string;
  nome: string;
  telefone: string | null;
  nivel: number;
  posicao: string | null;
  ativo: boolean;
  idade: number;
  tipo: string;
  foto_url: string | null;
  referencia: string | null;
  grupo: {
    nome: string;
  };
  _count?: {
    ocorrencias: number;
    jogos: number;
  };
  payment_status?: {
    paid: boolean;
    last_payment?: string;
  };
  ocorrencias_count?: number;
}

const PlayersPage: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'avulsos' | 'desativados'>('todos');

  const fetchPlayers = async () => {
    if (!user) return;

    try {
      setError(null);
      
      // First, get active group from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('grupo_ativo')
        .eq('id', user.id)
        .single();

      if (profileData?.grupo_ativo) {
        setSelectedGroupId(profileData.grupo_ativo);

        // Get current month range
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // First, get all players
        const { data: allPlayers, error: playersError } = await supabase
          .from('jogadores')
          .select(`
            *,
            grupo:grupos(nome)
          `)
          .eq('grupo_id', profileData.grupo_ativo)
          .order('nome');

        if (playersError) throw playersError;

        // Get occurrences count for each player
        const playersWithOccurrences = await Promise.all(allPlayers?.map(async (player) => {
          const { count } = await supabase
            .from('ocorrencias_jogadores')
            .select('*', { count: 'exact', head: true })
            .eq('jogador_id', player.id)
            .eq('arquivado', false);

          return {
            ...player,
            ocorrencias_count: count || 0
          };
        }) || []);

        // Then, get payments for the current month
        const { data: payments, error: paymentsError } = await supabase
          .from('financas')
          .select('jogador_id, data')
          .eq('grupo_id', profileData.grupo_ativo)
          .eq('tipo', 'receita')
          .gte('data', startDate)
          .lte('data', endDate);

        if (paymentsError) throw paymentsError;

        // Map payments to players
        const playersWithPayments = playersWithOccurrences.map(player => ({
          ...player,
          payment_status: {
            paid: payments?.some(p => p.jogador_id === player.id) || false,
            last_payment: payments?.find(p => p.jogador_id === player.id)?.data
          }
        }));

        // Fetch participation in games
        const { data: gamesData, error: gamesError } = await supabase
          .from('jogos_jogadores')
          .select(`
            jogador_id,
            jogo:jogos(id)
          `);

        if (gamesError) throw gamesError;

        // Process data to add counts
        const processedPlayers = playersWithPayments.map(player => {
          const playerGames = gamesData?.filter(
            g => g.jogador_id === player.id
          ) || [];

          return {
            ...player,
            _count: {
              ocorrencias: 0,
              jogos: playerGames.length
            }
          };
        });

        setPlayers(processedPlayers);
      }
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error);
      setError('Erro ao carregar jogadores. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [supabase, user]);

  const handleDelete = async (playerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este jogador?')) return;

    try {
      const { error } = await supabase
        .from('jogadores')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(players.filter(player => player.id !== playerId));
    } catch (error) {
      console.error('Erro ao deletar jogador:', error);
      alert('Erro ao deletar jogador');
    }
  };

  const handleToggleStatus = async (playerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('jogadores')
        .update({ ativo: !currentStatus })
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(players.map(player => 
        player.id === playerId 
          ? { ...player, ativo: !currentStatus }
          : player
      ));
    } catch (error) {
      console.error('Erro ao atualizar status do jogador:', error);
      alert('Erro ao atualizar status do jogador');
    }
  };

  const handleOccurrenceClick = (player: Player) => {
    setSelectedPlayer(player);
    setShowOccurrenceModal(true);
  };

  const handleResenhasClick = (playerId: string) => {
    navigate(`/jogadores/${playerId}/resenhas`);
  };

  const filteredPlayers = players.filter(player => {
    // Search term filter
    const matchesSearch = player.nome.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    let matchesStatus = true;
    switch (statusFilter) {
      case 'ativos':
        matchesStatus = player.ativo && player.tipo === 'ativo';
        break;
      case 'avulsos':
        matchesStatus = player.ativo && player.tipo === 'avulso';
        break;
      case 'desativados':
        matchesStatus = !player.ativo;
        break;
    }

    return matchesSearch && matchesStatus;
  });

  const renderStars = (nivel: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < nivel
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getRandomColor = () => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getPosicaoColor = (posicao: string | null) => {
    switch (posicao) {
      case 'goleiro':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
      case 'zagueiro':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'meio-campo':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'atacante':
        return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const getTipoTag = (tipo: string) => {
    return tipo === 'ativo'
      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
      : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
  };

  if (!selectedGroupId) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nenhum grupo selecionado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Selecione um grupo ativo para gerenciar jogadores
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Jogadores</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4 sm:mb-0">
            Gerencie os jogadores dos seus grupos
          </p>
          <div className="block sm:hidden">
            <button onClick={() => setShowForm(true)} className="btn-primary w-full mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Novo Jogador
            </button>
          </div>
        </div>
        <div className="hidden sm:block">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Jogador
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      {!showForm && (
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar jogadores..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`btn ${
                statusFilter === 'todos'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('ativos')}
              className={`btn ${
                statusFilter === 'ativos'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('avulsos')}
              className={`btn ${
                statusFilter === 'avulsos'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              Avulsos
            </button>
            <button
              onClick={() => setStatusFilter('desativados')}
              className={`btn ${
                statusFilter === 'desativados'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              Desativados
            </button>
          </div>
        </div>
      )}

      {showForm ? (
        <div className="card p-6">
          <PlayerForm
            groupId={selectedGroupId}
            onCancel={() => setShowForm(false)}
            onSuccess={fetchPlayers}
          />
        </div>
      ) : loading ? (
        <div className="flex justify-center">
          <p>Carregando jogadores...</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum jogador encontrado</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm
              ? 'Nenhum jogador corresponde à sua busca'
              : 'Adicione jogadores aos seus grupos para começar'}
          </p>
          {!searchTerm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Adicionar primeiro jogador
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <div 
              key={player.id} 
              className={`card hover:shadow-md transition-shadow cursor-pointer ${
                !player.ativo ? 'opacity-75' : ''
              }`}
              onClick={() => navigate(`/jogadores/${player.id}`)}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {player.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.nome}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl text-white ${getRandomColor()}`}>
                      {player.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{player.nome}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {player.idade} anos
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTipoTag(player.tipo)}`}>
                        {player.tipo}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-light">
                        {player.grupo.nome}
                      </span>
                      {!player.ativo && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                          Desativado
                        </span>
                      )}
                      {player._count?.jogos > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          {player._count.jogos} jogo(s)
                        </span>
                      )}
                      {player.payment_status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          player.payment_status.paid
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                          {player.payment_status.paid ? 'Adimplente' : 'Inadimplente'}
                        </span>
                      )}
                      {player.ocorrencias_count > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {player.ocorrencias_count} ocorrência(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex space-x-1">{renderStars(player.nivel)}</div>
                  {player.posicao && (
                    <span
                      className={`text-sm font-medium capitalize px-3 py-1 rounded-full ${getPosicaoColor(
                        player.posicao
                      )}`}
                    >
                      {player.posicao}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-dark-border">
                  {player.telefone && (
                    <a
                      href={`https://wa.me/${player.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 transition-colors"
                      title="WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(player.id, player.ativo);
                      }}
                      className={`transition-colors ${
                        player.ativo
                          ? 'text-green-500 hover:text-green-700'
                          : 'text-red-500 hover:text-red-700'
                      }`}
                      title={player.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {player.ativo ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOccurrenceClick(player);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Ocorrências"
                    >
                      <AlertCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResenhasClick(player.id);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Resenhas"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <Link
                      to={`/jogadores/${player.id}/editar`}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Editar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(player.id);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Ocorrências */}
      {selectedPlayer && (
        <OccurrenceModal
          isOpen={showOccurrenceModal}
          onClose={() => {
            setShowOccurrenceModal(false);
            setSelectedPlayer(null);
          }}
          mainPlayer={selectedPlayer}
          groupId={selectedGroupId}
        />
      )}
    </div>
  );
};

export default PlayersPage;