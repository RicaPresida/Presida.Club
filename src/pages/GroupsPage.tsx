import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { useAuth } from '../hooks/useAuth';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { 
  Plus, 
  Users, 
  DollarSign, 
  FolderRoot as Football, 
  Calendar, 
  Clock, 
  Check,
  MapPin, 
  Loader2
} from 'lucide-react';

interface Group {
  id: string;
  nome: string;
  tipo: string;
  mensalidade: number | null;
  criado_em: string;
  _count?: {
    jogadores: number;
  };
  dias_jogo: GameDay[];
  configuracoes?: {
    valor_padrao: number | null;
  };
}

interface GameDay {
  id: string;
  dia: string;
  horario: string | null;
  local: string | null;
  valor: number | null;
}

const GroupsPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const { user } = useAuth();
  const { subscription, isTrialActive } = usePlanFeatures();
  const [grupos, setGrupos] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [updatingActive, setUpdatingActive] = useState<string | null>(null);
  const [isLifetimeUser, setIsLifetimeUser] = useState(false);

  // Permite criar grupo para Trial, Básico, Profissional, Premium e Lifetime (usuário específico)
  const canCreateNewGroup =
    isTrialActive ||  // Trial ativo
    subscription?.price_id === 'price_1RHolMB0B3nriuwYinEKtACX' || // Básico
    subscription?.price_id === 'price_1RHoosB0B3nriuwYflpemSiN' || // Profissional
    subscription?.price_id === 'price_1RHouUB0B3nriuwYWZibkTjF' || // Premium
    isLifetimeUser;

  useEffect(() => {
    const fetchGrupos = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('grupo_ativo, lifetime')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setActiveGroupId(profile.grupo_ativo);
          setIsLifetimeUser(profile.lifetime === true);
        }

        const { data, error } = await supabase
          .from('grupos')
          .select(`
            *,
            configuracoes:grupo_configuracoes(valor_padrao)
          `)
          .eq('criado_por', user.id)
          .order('criado_em', { ascending: false });

        if (error) throw error;

        if (data) {
          const gruposWithData = await Promise.all(
            data.map(async (grupo) => {
              const { count } = await supabase
                .from('jogadores')
                .select('*', { count: 'exact', head: true })
                .eq('grupo_id', grupo.id);

              const { data: diasJogo } = await supabase
                .from('grupo_dias_jogo')
                .select('*')
                .eq('grupo_id', grupo.id)
                .order('dia');

              return {
                ...grupo,
                _count: {
                  jogadores: count || 0,
                },
                dias_jogo: diasJogo || [],
              };
            })
          );

          setGrupos(gruposWithData);
        }
      } catch (error) {
        console.error('Erro ao buscar grupos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrupos();
  }, [supabase, user]);

  const handleSetActive = async (groupId: string) => {
    if (!user) return;
    
    setUpdatingActive(groupId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ grupo_ativo: groupId })
        .eq('id', user.id);

      if (error) throw error;

      setActiveGroupId(groupId);
    } catch (error) {
      console.error('Erro ao definir grupo ativo:', error);
    } finally {
      setUpdatingActive(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatDayOfWeek = (day: string) => {
    const days: { [key: string]: string } = {
      domingo: 'Domingo',
      segunda: 'Segunda',
      terca: 'Terça',
      quarta: 'Quarta',
      quinta: 'Quinta',
      sexta: 'Sexta',
      sabado: 'Sábado'
    };
    return days[day] || day;
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'campo':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'society':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'quadra':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Meus Grupos</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie seus grupos de futebol
          </p>
        </div>
        {canCreateNewGroup && (
          <Link to="/grupos/novo" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Link>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center">
          <p>Carregando grupos...</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="card p-8 text-center">
          <Football className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum grupo encontrado</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {canCreateNewGroup ? (
              'Crie seu primeiro grupo para começar a gerenciar seu time de futebol'
            ) : (
              'Faça upgrade para o plano Profissional ou Premium para criar grupos'
            )}
          </p>
          {canCreateNewGroup ? (
            <Link to="/grupos/novo" className="btn-primary">
              Criar meu primeiro grupo
            </Link>
          ) : (
            <Link to="/pricing" className="btn-primary">
              Ver planos
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map((grupo) => (
            <div
              key={grupo.id}
              className={`card hover:shadow-md transition-shadow ${
                grupo.id === activeGroupId ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${getTipoIcon(grupo.tipo)}`}>
                    <Football className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize px-3 py-1 rounded-full bg-gray-100 dark:bg-dark-light">
                      {grupo.tipo}
                    </span>
                    <button
                      onClick={() => handleSetActive(grupo.id)}
                      className={`btn ${
                        grupo.id === activeGroupId
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                      disabled={updatingActive === grupo.id}
                    >
                      {updatingActive === grupo.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : grupo.id === activeGroupId ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Ativo
                        </>
                      ) : (
                        'Tornar Ativo'
                      )}
                    </button>
                  </div>
                </div>

                <Link to={`/grupos/${grupo.id}`} className="block">
                  <h3 className="text-xl font-semibold mb-1">{grupo.nome}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Criado em {formatDate(grupo.criado_em)}
                  </p>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{grupo._count?.jogadores || 0} jogadores</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        Mensalidade:{' '}
                        {grupo.mensalidade
                          ? grupo.mensalidade.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>

                  {grupo.dias_jogo.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Dias de Jogo</h4>
                      <ul>
                        {grupo.dias_jogo.map((dia) => (
                          <li
                            key={dia.id}
                            className="flex items-center gap-4 mb-1"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>{formatDayOfWeek(dia.dia)}</span>

                            {dia.horario && (
                              <>
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{dia.horario}</span>
                              </>
                            )}

                            {dia.local && (
                              <>
                                <MapPin className="w-4 h-4 ml-2" />
                                <span>{dia.local}</span>
                              </>
                            )}

                            {dia.valor !== null && (
                              <>
                                <DollarSign className="w-4 h-4 ml-2" />
                                <span>
                                  {dia.valor.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;