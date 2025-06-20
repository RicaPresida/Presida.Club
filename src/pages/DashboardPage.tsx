import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  DollarSign, 
  FolderRoot as Football, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  Wallet, 
  Plus, 
  Clock, 
  MapPin, 
  ArrowUpCircle, 
  ArrowDownCircle 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import bannerApp from '../images/banner_app.jpg';
import bannerAppMobile from '../images/banner_app_mobile.gif';

interface DashboardStats {
  totalGrupos: number;
  totalJogadores: number;
  saldoAtual: number;
}

interface PlayerParticipation {
  id: string;
  nome: string;
  participacoes: number;
}

interface ChartData {
  data: string;
  participacoes: number;
}

interface FinancialMovement {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

const DashboardPage: React.FC = () => {
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalGrupos: 0,
    totalJogadores: 0,
    saldoAtual: 0,
  });
  const [loading, setLoading] = useState(true);
  const [grupoAtivo, setGrupoAtivo] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerParticipation[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [monthlyBalance, setMonthlyBalance] = useState<number>(0);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [financialData, setFinancialData] = useState<FinancialMovement[]>([]);
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // First, get active group from profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('grupo_ativo')
          .eq('id', user.id)
          .single();

        if (profileData?.grupo_ativo) {
          // Get current month's transactions
          const startDate = startOfMonth(new Date()).toISOString().split('T')[0];
          const endDate = endOfMonth(new Date()).toISOString().split('T')[0];

          const { data: financasData } = await supabase
            .from('financas')
            .select('tipo, valor')
            .eq('grupo_id', profileData.grupo_ativo)
            .gte('data', startDate)
            .lte('data', endDate);

          // Calculate current month's balance
          let monthBalance = 0;
          if (financasData) {
            monthBalance = financasData.reduce((acc, item) => {
              return item.tipo === 'receita' 
                ? acc + item.valor 
                : acc - item.valor;
            }, 0);
          }

          setMonthlyBalance(monthBalance);

          // Get cash balance from group settings
          const { data: configData } = await supabase
            .from('grupo_configuracoes')
            .select('caixa_atual')
            .eq('grupo_id', profileData.grupo_ativo)
            .single();

          const currentCashBalance = configData?.caixa_atual || 0;
          setCashBalance(currentCashBalance);
          
          // Calculate total balance
          setTotalBalance(currentCashBalance + monthBalance);

          // Fetch financial movements data
          await fetchFinancialData(profileData.grupo_ativo, selectedChartPeriod);

          setSelectedPeriod('month');
          await fetchParticipationData(profileData.grupo_ativo, 'month');
          await fetchTopPlayers(profileData.grupo_ativo);

          const { data: grupoData } = await supabase
            .from('grupos')
            .select('*')
            .eq('id', profileData.grupo_ativo)
            .single();

          setGrupoAtivo(grupoData);

          const { count: jogadoresCount } = await supabase
            .from('jogadores')
            .select('*', { count: 'exact', head: true })
            .eq('grupo_id', profileData.grupo_ativo)
            .eq('ativo', true);

          const { count: totalGrupos } = await supabase
            .from('grupos')
            .select('id', { count: 'exact', head: true })
            .eq('criado_por', user.id);

          setStats({
            totalGrupos: totalGrupos || 0,
            totalJogadores: jogadoresCount || 0,
            saldoAtual: totalBalance
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, user, selectedChartPeriod]);

  const fetchParticipationData = async (groupId: string, period: 'day' | 'month' | 'year') => {
    try {
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());

      const { data: jogos } = await supabase
        .from('jogos')
        .select(`
          data,
          jogos_jogadores(count)
        `)
        .eq('grupo_id', groupId)
        .gte('data', startDate.toISOString())
        .lte('data', endDate.toISOString())
        .order('data');

      if (jogos) {
        const formattedData = jogos.map(jogo => ({
          data: format(parseISO(jogo.data), 'dd/MM', { locale: ptBR }),
          participacoes: jogo.jogos_jogadores.length
        }));

        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de participação:', error);
    }
  };

  const fetchTopPlayers = async (groupId: string) => {
    try {
      const { data: participations } = await supabase
        .from('jogos_jogadores')
        .select(`
          jogador:jogadores(id, nome),
          jogo:jogos(data)
        `)
        .eq('jogos.grupo_id', groupId)
        .order('jogo(data)', { ascending: false });

      if (participations) {
        const playerStats = participations.reduce((acc: Record<string, PlayerParticipation>, curr) => {
          const playerId = curr.jogador.id;
          if (!acc[playerId]) {
            acc[playerId] = {
              id: playerId,
              nome: curr.jogador.nome,
              participacoes: 0
            };
          }
          acc[playerId].participacoes++;
          return acc;
        }, {});

        const topThree = Object.values(playerStats)
          .sort((a, b) => b.participacoes - a.participacoes)
          .slice(0, 3);

        setTopPlayers(topThree);
      }
    } catch (error) {
      console.error('Erro ao buscar top jogadores:', error);
    }
  };

  const fetchFinancialData = async (groupId: string, period: 'month' | 'year') => {
    try {
      let startDate: Date;
      let endDate: Date;
      let formatPattern: string;
      let months: number;

      if (period === 'month') {
        startDate = subMonths(startOfMonth(new Date()), 5); // Last 6 months
        endDate = endOfMonth(new Date());
        formatPattern = 'MMM';
        months = 6;
      } else {
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
        formatPattern = 'MMM';
        months = 12;
      }

      const { data: movements } = await supabase
        .from('financas')
        .select('tipo, valor, data')
        .eq('grupo_id', groupId)
        .gte('data', startDate.toISOString())
        .lte('data', endDate.toISOString())
        .order('data');

      if (movements) {
        const monthlyData: { [key: string]: FinancialMovement } = {};

        // Initialize all months
        for (let i = 0; i < months; i++) {
          const date = period === 'month' 
            ? subMonths(new Date(), months - 1 - i)
            : new Date(new Date().getFullYear(), i, 1);
          
          const monthKey = format(date, 'yyyy-MM');
          monthlyData[monthKey] = {
            mes: format(date, formatPattern, { locale: ptBR }),
            receitas: 0,
            despesas: 0,
            saldo: 0
          };
        }

        // Aggregate movements
        movements.forEach(movement => {
          const monthKey = format(new Date(movement.data), 'yyyy-MM');
          if (monthlyData[monthKey]) {
            if (movement.tipo === 'receita') {
              monthlyData[monthKey].receitas += movement.valor;
            } else {
              monthlyData[monthKey].despesas += movement.valor;
            }
            monthlyData[monthKey].saldo = 
              monthlyData[monthKey].receitas - monthlyData[monthKey].despesas;
          }
        });

        setFinancialData(Object.values(monthlyData));
      }
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    }
  };

  if (!grupoAtivo) {
    return (
      <div className="text-center py-12">
        <Football className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nenhum grupo selecionado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Selecione um grupo ativo para visualizar o dashboard
        </p>
        <Link to="/grupos" className="btn-primary">
          Ir para Grupos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Bem-vindo ao Presida.Club, seu gerenciador de times de futebol
        </p>
      </header>

      {/* Banner */}
      <div className="mb-8 overflow-hidden rounded-lg">
        <picture>
  <source 
    media="(min-width: 768px)" 
    srcSet={bannerApp}
  />
  <img
    src={bannerAppMobile}
    alt="Presida.Club Banner"
    className="w-full h-auto object-cover"
  />
</picture>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link 
          to="/financeiro"
          className="card p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo do Mês</p>
              <h3 className={`text-2xl font-bold mt-1 ${
                monthlyBalance >= 0 
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {monthlyBalance.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
            <div className="bg-primary-100 dark:bg-primary-900/20 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-500" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Ver financeiro →
            </span>
          </div>
        </Link>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Grupos</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalGrupos}</h3>
            </div>
            <div className="bg-primary-100 dark:bg-primary-900/20 p-3 rounded-lg">
              <Football className="w-6 h-6 text-primary-500" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/grupos" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Ver detalhes →
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Jogadores</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalJogadores}</h3>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/jogadores" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Gerenciar jogadores →
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dinheiro em Caixa</p>
              <h3 className={`text-2xl font-bold mt-1 ${
                totalBalance >= 0 
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {totalBalance.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </h3>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
              <Wallet className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/financeiro" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Ver financeiro →
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Movimentações Financeiras</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedChartPeriod('month');
                fetchFinancialData(grupoAtivo.id, 'month');
              }}
              className={`btn ${
                selectedChartPeriod === 'month' ? 'btn-primary' : 'btn-outline'
              }`}
            >
              Últimos 6 Meses
            </button>
            <button
              onClick={() => {
                setSelectedChartPeriod('year');
                fetchFinancialData(grupoAtivo.id, 'year');
              }}
              className={`btn ${
                selectedChartPeriod === 'year' ? 'btn-primary' : 'btn-outline'
              }`}
            >
              Ano Atual
            </button>
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => 
                  value.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })
                }
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="receitas" 
                name="Receitas"
                stroke="#00FF7F" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="despesas" 
                name="Despesas"
                stroke="#FF4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                name="Saldo"
                stroke="#4A90E2" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
            <ArrowUpCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Receitas</p>
              <p className="font-bold text-green-600 dark:text-green-400">
                {financialData.reduce((acc, item) => acc + item.receitas, 0)
                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
            <ArrowDownCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Despesas</p>
              <p className="font-bold text-red-600 dark:text-red-400">
                {financialData.reduce((acc, item) => acc + item.despesas, 0)
                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Período</p>
              <p className={`font-bold ${
                financialData.reduce((acc, item) => acc + item.saldo, 0) >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {financialData.reduce((acc, item) => acc + item.saldo, 0)
                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Participações em Jogos</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedPeriod('day');
                    fetchParticipationData(grupoAtivo.id, 'day');
                  }}
                  className={`btn ${
                    selectedPeriod === 'day' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  Dia
                </button>
                <button
                  onClick={() => {
                    setSelectedPeriod('month');
                    fetchParticipationData(grupoAtivo.id, 'month');
                  }}
                  className={`btn ${
                    selectedPeriod === 'month' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  Mês
                </button>
                <button
                  onClick={() => {
                    setSelectedPeriod('year');
                    fetchParticipationData(grupoAtivo.id, 'year');
                  }}
                  className={`btn ${
                    selectedPeriod === 'year' ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  Ano
                </button>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="participacoes" fill="#00FF7F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold mb-6">Top Jogadores</h2>
          <div className="space-y-4">
            {topPlayers.map((player, index) => (
              <div key={player.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-100 text-yellow-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{player.nome}</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-500">
                      {player.participacoes} participações
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/jogadores" className="btn-outline text-center">
            Adicionar jogador
          </Link>
          <Link to="/financeiro" className="btn-outline text-center">
            Registrar pagamento
          </Link>
          <Link to="/sorteio" className="btn-outline text-center">
            Sortear times
          </Link>
          <Link to="/resenha" className="btn-outline text-center">
            Nova resenha
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;