import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../hooks/useAuth';
import { 
  Star, 
  Phone, 
  ArrowLeft, 
  AlertCircle, 
  Archive, 
  ChevronDown, 
  ChevronUp, 
  Trophy, 
  Pencil, 
  Save, 
  X, 
  Calendar, 
  User, 
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import SoccerBall from '../components/icons/SoccerBall';
import OccurrenceModal from '../components/occurrences/OccurrenceModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlayerCharacteristics {
  velocidade: number;
  finalizacao: number;
  passe: number;
  drible: number;
  defesa: number;
  fisico: number;
  atualizado_em?: string;
  atualizado_por?: string;
}

interface Occurrence {
  id: string;
  tipo: {
    nome: string;
    descricao: string;
  };
  descricao: string;
  criado_em: string;
  resolvido: boolean;
  resolucao_descricao: string | null;
  arquivado: boolean;
  arquivado_em: string | null;
  arquivado_descricao: string | null;
  outros_jogadores: {
    id: string;
    nome: string;
  }[];
}

interface Game {
  id: string;
  data: string;
}

interface Goal {
  id: string;
  data: string;
}

interface Payment {
  id: string;
  data: string;
  valor: number;
  descricao: string;
  tipo: 'receita' | 'despesa';
  categoria: string | null;
}

const defaultCharacteristics: PlayerCharacteristics = {
  velocidade: 75,
  finalizacao: 70,
  passe: 72,
  drible: 68,
  defesa: 45,
  fisico: 80
};

const PlayerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [characteristics, setCharacteristics] = useState<PlayerCharacteristics>(defaultCharacteristics);
  const [editingCharacteristics, setEditingCharacteristics] = useState(false);
  const [tempCharacteristics, setTempCharacteristics] = useState<PlayerCharacteristics | null>(null);
  const [savingCharacteristics, setSavingCharacteristics] = useState(false);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [updaterEmail, setUpdaterEmail] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGames, setShowGames] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPayments, setShowPayments] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));

  const fetchPayments = async () => {
    if (!id) return;

    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('financas')
        .select('*')
        .eq('jogador_id', id)
        .order('data', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!id) return;

      try {
        // Fetch player data
        const { data: playerData, error: playerError } = await supabase
          .from('jogadores')
          .select(`
            *,
            caracteristicas:jogadores_caracteristicas(
              velocidade,
              finalizacao,
              passe,
              drible,
              defesa,
              fisico,
              atualizado_em,
              atualizado_por
            )
          `)
          .eq('id', id)
          .single();

        if (playerError) throw playerError;
        setPlayer(playerData);

        if (playerData.caracteristicas?.[0]) {
          setCharacteristics(playerData.caracteristicas[0]);
        }

        // Fetch occurrences
        const { data: occurrencesData, error: occurrencesError } = await supabase
          .from('ocorrencias_jogadores')
          .select(`
            ocorrencia:ocorrencias!ocorrencias_jogadores_ocorrencia_id_fkey(
              id,
              tipo:tipos_ocorrencia(nome, descricao),
              descricao,
              criado_em,
              resolvido,
              resolucao_descricao
            ),
            arquivado,
            arquivado_em,
            arquivado_descricao
          `)
          .eq('jogador_id', id);

        if (occurrencesError) throw occurrencesError;
        setOccurrences(occurrencesData?.map(o => ({
          ...o.ocorrencia,
          arquivado: o.arquivado,
          arquivado_em: o.arquivado_em,
          arquivado_descricao: o.arquivado_descricao,
          outros_jogadores: []
        })) || []);

        // Fetch games
        const { data: gamesData, error: gamesError } = await supabase
          .from('jogos_jogadores')
          .select('jogo:jogos(id, data)')
          .eq('jogador_id', id)
          .order('jogo(data)', { ascending: false });

        if (gamesError) throw gamesError;
        setGames(gamesData?.map(g => g.jogo) || []);

        // Fetch goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('gols')
          .select('*')
          .eq('jogador_id', id)
          .order('data', { ascending: false });

        if (goalsError) throw goalsError;
        setGoals(goalsData || []);

        // Fetch payments
        await fetchPayments();

      } catch (error) {
        console.error('Error fetching player data:', error);
        setError('Error loading player data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();

    // Subscribe to payment changes
    const channel = supabase
      .channel('payment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financas',
          filter: `jogador_id=eq.${id}`,
        },
        () => {
          // Refresh payments when changes occur
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  const calculateOverall = () => {
    const weights = {
      velocidade: 0.2,
      finalizacao: 0.2,
      passe: 0.15,
      drible: 0.15,
      defesa: 0.15,
      fisico: 0.15
    };

    return Math.round(
      Object.entries(characteristics).reduce((sum, [key, value]) => {
        if (typeof value === 'number') {
          return sum + (value * (weights[key as keyof typeof weights] || 0));
        }
        return sum;
      }, 0)
    ).toFixed(2);
  };

  const getCharacteristicsData = () => {
    return Object.entries(characteristics)
      .filter(([key]) => !['atualizado_em', 'atualizado_por'].includes(key))
      .map(([key, value]) => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        value: Math.round(Number(value))
      }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Jogador não encontrado</h2>
        <Link to="/jogadores" className="text-primary-500 hover:underline">
          Voltar para lista de jogadores
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/jogadores"
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold">Perfil do Jogador</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              {player.foto_url ? (
                <img
                  src={player.foto_url}
                  alt={player.nome}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-3xl text-white">
                  {player.nome.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{player.nome}</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {player.idade} anos • {player.tipo}
                </p>
                <div className="flex items-center mt-1">
                  {Array.from({ length: player.nivel }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Posição</p>
                <p className="font-medium capitalize">{player.posicao || '-'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Jogos</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="font-medium">{games.length} participações</p>
                </div>
              </div>

              {player.telefone && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Contato</p>
                  <a
                    href={`https://wa.me/${player.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{player.telefone}</span>
                  </a>
                </div>
              )}

              {player.referencia && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Referência</p>
                  <p className="font-medium">{player.referencia}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Características</h3>
                  {!editingCharacteristics && (
                    <button
                      onClick={() => {
                        setTempCharacteristics({...characteristics});
                        setEditingCharacteristics(true);
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      title="Editar características"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {characteristics.atualizado_em && (
                  <p className="text-xs text-gray-500 mt-1">
                    Última atualização: {new Date(characteristics.atualizado_em).toLocaleDateString()}
                    {updaterEmail && ` por ${updaterEmail}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-xl font-bold">{calculateOverall()}</span>
              </div>
            </div>

            <div className="flex flex-col items-center mb-6">
              <RadarChart width={300} height={300} data={getCharacteristicsData()}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Características"
                  dataKey="value"
                  stroke="#00FF7F"
                  fill="#00FF7F"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </div>

            <div className="space-y-4">
              {Object.entries(editingCharacteristics ? tempCharacteristics! : characteristics)
                .filter(([key]) => !['atualizado_em', 'atualizado_por'].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{key}</span>
                      {editingCharacteristics ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => {
                            if (!tempCharacteristics) return;
                            const newValue = Math.max(0, Math.min(100, parseInt(e.target.value)));
                            setTempCharacteristics({
                              ...tempCharacteristics,
                              [key]: newValue
                            });
                          }}
                          className="w-16 text-right input py-0 px-2"
                          min="0"
                          max="100"
                        />
                      ) : (
                        <span className="font-medium">{Math.round(Number(value))}</span>
                      )}
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-dark-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {editingCharacteristics && (
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setEditingCharacteristics(false);
                    setTempCharacteristics(null);
                  }}
                  className="btn-outline"
                  disabled={savingCharacteristics}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!tempCharacteristics || !user) return;

                    setSavingCharacteristics(true);
                    try {
                      const { error } = await supabase
                        .from('jogadores_caracteristicas')
                        .upsert({
                          jogador_id: id,
                          ...tempCharacteristics,
                          atualizado_por: user.id,
                          atualizado_em: new Date().toISOString()
                        });

                      if (error) throw error;

                      setCharacteristics(tempCharacteristics);
                      setEditingCharacteristics(false);
                      setTempCharacteristics(null);
                    } catch (error) {
                      console.error('Error saving characteristics:', error);
                      alert('Error saving characteristics');
                    } finally {
                      setSavingCharacteristics(false);
                    }
                  }}
                  className="btn-primary"
                  disabled={savingCharacteristics}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingCharacteristics ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Histórico de Pagamentos</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPayments(!showPayments)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showPayments ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {showPayments && (
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum pagamento registrado
                  </div>
                ) : (
                  payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between border-b dark:border-dark-border pb-4">
                      <div className="flex items-center gap-3">
                        {payment.tipo === 'receita' ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{payment.descricao}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(payment.data), 'PP', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className={payment.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}>
                        {payment.tipo === 'receita' ? '+' : '-'}
                        {payment.valor.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Ocorrências</h2>
              <button
                onClick={() => setShowOccurrenceModal(true)}
                className="btn-primary"
              >
                Nova Ocorrência
              </button>
            </div>

            <div className="space-y-4">
              {occurrences.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma ocorrência registrada
                </div>
              ) : (
                <>
                  {occurrences
                    .filter(o => !o.arquivado || showArchived)
                    .map(occurrence => (
                      <div
                        key={occurrence.id}
                        className={`p-4 border dark:border-dark-border rounded-lg ${
                          occurrence.arquivado ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium capitalize">
                              {occurrence.tipo.nome.replace('_', ' ')}
                            </span>
                          </div>
                          {!occurrence.arquivado && (
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('ocorrencias_jogadores')
                                    .update({
                                      arquivado: true,
                                      arquivado_em: new Date().toISOString(),
                                      arquivado_descricao: 'Arquivado pelo usuário'
                                    })
                                    .eq('ocorrencia_id', occurrence.id)
                                    .eq('jogador_id', id);

                                  if (error) throw error;

                                  setOccurrences(occurrences.map(o =>
                                    o.id === occurrence.id
                                      ? {
                                          ...o,
                                          arquivado: true,
                                          arquivado_em: new Date().toISOString(),
                                          arquivado_descricao: 'Arquivado pelo usuário'
                                        }
                                      : o
                                  ));
                                } catch (error) {
                                  console.error('Error archiving occurrence:', error);
                                  alert('Error archiving occurrence');
                                }
                              }}
                              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              title="Arquivar"
                            >
                              <Archive className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                          {occurrence.descricao}
                        </p>

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(occurrence.criado_em), 'PP', { locale: ptBR })}
                          </span>
                        </div>

                        {occurrence.arquivado && (
                          <div className="mt-2 text-sm text-gray-500">
                            Arquivado em: {format(new Date(occurrence.arquivado_em!), 'PP', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    ))}

                  {occurrences.some(o => o.arquivado) && (
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showArchived ? (
                        <>
                          <ChevronUp className="w-4 h-4 inline-block mr-1" />
                          Ocultar arquivadas
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 inline-block mr-1" />
                          Mostrar arquivadas
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Estatísticas</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGames(!showGames)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showGames ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {showGames && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span>Jogos Disputados</span>
                  </div>
                  <span className="font-semibold">{games.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SoccerBall className="w-5 h-5 text-gray-500" />
                    <span>Gols Marcados</span>
                  </div>
                  <span className="font-semibold">{goals.length}</span>
                </div>

                {games.length > 0 && (
                  <div className="mt-4 pt-4 border-t dark:border-dark-border">
                    <h3 className="text-sm font-medium mb-2">Últimos Jogos</h3>
                    <div className="space-y-2">
                      {games.slice(0, 5).map(game => (
                        <div
                          key={game.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>
                              {format(new Date(game.data), 'PP', { locale: ptBR })}
                            </span>
                          </div>
                          <span className="text-gray-500">Participou</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showOccurrenceModal && (
        <OccurrenceModal
          isOpen={showOccurrenceModal}
          onClose={() => setShowOccurrenceModal(false)}
          mainPlayer={player}
          groupId={player.grupo_id}
        />
      )}
    </div>
  );
};

export default PlayerProfilePage;