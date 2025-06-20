import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  Trash2, 
  Pencil, 
  Check,
  X,
  Clock,
  MapPin,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  Save,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Wallet,
  CalendarDays
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Player {
  id: string;
  nome: string;
  tipo: string;
  payment_status?: {
    paid: boolean;
    last_payment?: string;
  };
}

const FinancesPage: React.FC = () => {
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { activeGroup } = useActiveGroup();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [defaultValue, setDefaultValue] = useState<number | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [monthlyBalance, setMonthlyBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  // Players state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [futureMonths, setFutureMonths] = useState<number>(1);

  // Form states
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [categoria, setCategoria] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter states
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [finances, setFinances] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeGroup) return;

      try {
        // Get default value and cash balance from group settings
        const { data: configData } = await supabase
          .from('grupo_configuracoes')
          .select('valor_padrao, caixa_atual')
          .eq('grupo_id', activeGroup.id)
          .single();

        if (configData) {
          setDefaultValue(configData.valor_padrao);
          setCashBalance(configData.caixa_atual || 0);
          if (!valor && configData.valor_padrao) {
            setValor(configData.valor_padrao.toString());
          }
        }

        // Get current month range
        const startDate = `${filterMonth}-01`;
        const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().split('T')[0];

        // Fetch finances
        const { data: financesData } = await supabase
          .from('financas')
          .select(`
            *,
            jogador:jogadores(id, nome, tipo)
          `)
          .eq('grupo_id', activeGroup.id)
          .gte('data', startDate)
          .lt('data', endDate)
          .order('data', { ascending: false });

        // Fetch players
        const { data: playersData } = await supabase
          .from('jogadores')
          .select('id, nome, tipo')
          .eq('grupo_id', activeGroup.id)
          .eq('ativo', true)
          .order('nome');

        if (playersData) {
          // Get payments for current month
          const payments = financesData?.filter(f => 
            f.tipo === 'receita' && f.jogador
          ) || [];

          // Add payment status to players
          const playersWithStatus = playersData.map(player => ({
            ...player,
            payment_status: {
              paid: payments.some(p => p.jogador.id === player.id),
              last_payment: payments.find(p => p.jogador.id === player.id)?.data
            }
          }));

          setPlayers(playersWithStatus);
        }

        if (financesData) {
          setFinances(financesData);

          // Calculate monthly balance
          const monthBalance = financesData.reduce((acc, item) => {
            return item.tipo === 'receita' 
              ? acc + item.valor 
              : acc - item.valor;
          }, 0);

          setMonthlyBalance(monthBalance);

          // Calculate total balance
          const currentCashBalance = configData?.caixa_atual || 0;
          setTotalBalance(currentCashBalance + monthBalance);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados financeiros');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, activeGroup, filterMonth, valor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !user) return;

    setSaving(true);
    setError(null);

    try {
      const transactionValue = parseFloat(valor);

      // For player payments, check if they've already paid this month
      if (tipo === 'receita' && selectedPlayer) {
        const currentDate = new Date(data);
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Check for existing payments in the current month
        const { data: existingPayments, error: paymentsError } = await supabase
          .from('financas')
          .select('id, data')
          .eq('grupo_id', activeGroup.id)
          .eq('jogador_id', selectedPlayer)
          .eq('tipo', 'receita')
          .gte('data', startOfMonth.toISOString().split('T')[0])
          .lte('data', endOfMonth.toISOString().split('T')[0]);

        if (paymentsError) throw paymentsError;

        if (existingPayments && existingPayments.length > 0) {
          setError('Este jogador já realizou o pagamento mensal neste mês.');
          setSaving(false);
          return;
        }
      }

      // For future payments, create multiple transactions
      if (tipo === 'receita' && selectedPlayer && futureMonths > 1) {
        const transactions = Array.from({ length: futureMonths }).map((_, index) => {
          const paymentDate = new Date(data);
          paymentDate.setMonth(paymentDate.getMonth() + index);
          
          return {
            grupo_id: activeGroup.id,
            descricao: `${descricao} - Mês ${index + 1}/${futureMonths}`,
            valor: transactionValue,
            data: paymentDate.toISOString().split('T')[0],
            tipo,
            categoria: categoria || null,
            jogador_id: selectedPlayer
          };
        });

        const { error: batchError } = await supabase
          .from('financas')
          .insert(transactions);

        if (batchError) throw batchError;
      } else {
        // Single transaction
        const { error: insertError } = await supabase
          .from('financas')
          .insert({
            grupo_id: activeGroup.id,
            descricao: descricao.trim(),
            valor: transactionValue,
            data,
            tipo,
            categoria: categoria || null,
            jogador_id: selectedPlayer || null
          });

        if (insertError) throw insertError;
      }

      // Update cash balance
      const newBalance = tipo === 'receita' 
        ? cashBalance + transactionValue
        : cashBalance - transactionValue;

      const { error: configError } = await supabase
        .from('grupo_configuracoes')
        .update({ caixa_atual: newBalance })
        .eq('grupo_id', activeGroup.id);

      if (configError) throw configError;

      // Reset form
      setDescricao('');
      setValor(defaultValue?.toString() || '');
      setData(new Date().toISOString().split('T')[0]);
      setTipo('receita');
      setCategoria('');
      setSelectedPlayer('');
      setFutureMonths(1);
      setShowForm(false);

      // Update cash balance state
      setCashBalance(newBalance);

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setError('Erro ao salvar registro financeiro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase
        .from('financas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFinances(finances.filter(f => f.id !== id));
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      alert('Erro ao excluir registro');
    }
  };

  const filteredFinances = finances.filter(finance => {
    const matchesType = filterType === 'todos' || finance.tipo === filterType;
    const matchesSearch = finance.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         finance.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         finance.jogador?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Relatório Financeiro', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Period
    doc.setFontSize(12);
    doc.text(`Período: ${new Date(filterMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 20, yPos);
    yPos += 10;

    // Summary
    const totalReceitas = filteredFinances
      .filter(f => f.tipo === 'receita')
      .reduce((acc, f) => acc + f.valor, 0);
    
    const totalDespesas = filteredFinances
      .filter(f => f.tipo === 'despesa')
      .reduce((acc, f) => acc + f.valor, 0);

    const saldo = totalReceitas - totalDespesas;

    doc.text('Resumo:', 20, yPos);
    yPos += 7;
    doc.text(`Receitas: ${totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 30, yPos);
    yPos += 7;
    doc.text(`Despesas: ${totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 30, yPos);
    yPos += 7;
    doc.text(`Saldo: ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 30, yPos);
    yPos += 7;
    doc.text(`Dinheiro em Caixa: ${totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 30, yPos);
    yPos += 15;

    // Transactions table
    const headers = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']];
    const data = filteredFinances.map(finance => [
      new Date(finance.data).toLocaleDateString('pt-BR'),
      finance.descricao,
      finance.categoria || '-',
      finance.tipo === 'receita' ? 'Receita' : 'Despesa',
      finance.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: yPos,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 255, 127] }
    });

    // Save the PDF
    doc.save(`relatorio-financeiro-${filterMonth}.pdf`);
  };

  if (!activeGroup) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nenhum grupo selecionado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Selecione um grupo ativo para gerenciar finanças
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Financeiro</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Gerencie as finanças do seu grupo
          </p>
          <div className="flex flex-row gap-2 w-full sm:hidden">
            <button
              onClick={generatePDF}
              className="btn-outline flex-1"
              title="Exportar relatório"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar
            </button>
            <button 
              onClick={() => setShowForm(true)} 
              className="btn-primary flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </button>
          </div>
        </div>
        <div className="hidden sm:flex sm:flex-row sm:justify-between sm:items-center">
          <div></div>
          <div className="flex gap-2">
            <button
              onClick={generatePDF}
              className="btn-outline"
              title="Exportar relatório"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar
            </button>
            <button 
              onClick={() => setShowForm(true)} 
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dinheiro em Caixa</p>
              <p className={`text-2xl font-bold ${
                totalBalance >= 0 
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {totalBalance.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              totalBalance >= 0
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <Wallet className={`w-6 h-6 ${
                totalBalance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo do Mês</p>
              <p className={`text-2xl font-bold ${
                monthlyBalance >= 0 
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {monthlyBalance.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              monthlyBalance >= 0
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                monthlyBalance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receitas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {filteredFinances
                  .filter(f => f.tipo === 'receita')
                  .reduce((acc, f) => acc + f.valor, 0)
                  .toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
              <ArrowUpCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Despesas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {filteredFinances
                  .filter(f => f.tipo === 'despesa')
                  .reduce((acc, f) => acc + f.valor, 0)
                  .toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
              <ArrowDownCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Status de Pagamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-4 border rounded-lg transition-colors ${
                player.payment_status?.paid
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-paper flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{player.nome}</span>
                </div>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  player.payment_status?.paid
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                }`}>
                  {player.payment_status?.paid ? 'Pago' : 'Pendente'}
                </span>
              </div>
              {player.payment_status?.last_payment && (
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Último pagamento: {new Date(player.payment_status.last_payment).toLocaleDateString()}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedPlayer(player.id);
                  setTipo('receita');
                  setDescricao('Mensalidade');
                  setValor(defaultValue?.toString() || '');
                  setShowForm(true);
                }}
                className="mt-2 w-full btn-outline text-sm"
              >
                {player.payment_status?.paid ? 'Registrar Novo' : 'Registrar Pagamento'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filterMonth" className="block text-sm font-medium mb-1">
              Mês
            </label>
            <input
              type="month"
              id="filterMonth"
              className="input py-1.5 w-full"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="filterType" className="block text-sm font-medium mb-1">
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('todos')}
                className={`flex-1 btn ${
                  filterType === 'todos' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('receita')}
                className={`flex-1 btn ${
                  filterType === 'receita' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilterType('despesa')}
                className={`flex-1 btn ${
                  filterType === 'despesa' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                Despesas
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="searchTerm" className="block text-sm font-medium mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="searchTerm"
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por descrição, categoria..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
          <h2 className="text-lg font-bold">Transações</h2>
        </div>

        {/* Mobile View - Cards */}
        <div className="lg:hidden">
          {filteredFinances.map((finance) => (
            <div key={finance.id} className="p-4 border-b dark:border-dark-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    finance.tipo === 'receita'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`} />
                  <span className="font-medium">{finance.descricao}</span>
                </div>
                <button
                  onClick={() => handleDelete(finance.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Data</span>
                  <span>{new Date(finance.data).toLocaleDateString('pt-BR')}</span>
                </div>

                {finance.categoria && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categoria</span>
                    <span>{finance.categoria}</span>
                  </div>
                )}

                {finance.jogador && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Jogador</span>
                    <span>{finance.jogador.nome}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-500">Valor</span>
                  <span className={finance.tipo === 'receita' 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                  }>
                    {finance.tipo === 'despesa' ? '- ' : ''}
                    {finance.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-light">
                <th className="text-left p-4 font-medium">Data</th>
                <th className="text-left p-4 font-medium">Descrição</th>
                <th className="text-left p-4 font-medium">Categoria</th>
                <th className="text-left p-4 font-medium">Jogador</th>
                <th className="text-right p-4 font-medium">Valor</th>
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-dark-border">
              {filteredFinances.map((finance) => (
                <tr key={finance.id} className="hover:bg-gray-50 dark:hover:bg-dark-light">
                  <td className="p-4 whitespace-nowrap">
                    {new Date(finance.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        finance.tipo === 'receita'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`} />
                      {finance.descricao}
                    </div>
                  </td>
                  <td className="p-4">
                    {finance.categoria || '-'}
                  </td>
                  <td className="p-4">
                    {finance.jogador ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{finance.jogador.nome}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <span className={finance.tipo === 'receita' 
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                    }>
                      {finance.tipo === 'despesa' ? '- ' : ''}
                      {finance.valor.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(finance.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Record Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-dark-paper rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b dark:border-dark-border">
              <h2 className="text-xl font-bold">Novo Registro Financeiro</h2>
              <button
                onClick={()=> setShowForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 p-3 rounded-lg border dark:border-dark-border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-dark-light">
                      <input
                        type="radio"
                        className="hidden"
                        checked={tipo === 'receita'}
                        onChange={() => setTipo('receita')}
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        tipo === 'receita'
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {tipo === 'receita' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span>Receita</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border dark:border-dark-border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-dark-light">
                      <input
                        type="radio"
                        className="hidden"
                        checked={tipo === 'despesa'}
                        onChange={() => setTipo('despesa')}
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        tipo === 'despesa'
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {tipo === 'despesa' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span>Despesa</span>
                    </label>
                  </div>
                </div>

                {tipo === 'receita' && (
                  <div>
                    <label htmlFor="jogador" className="block text-sm font-medium mb-1">
                      Jogador
                    </label>
                    <select
                      id="jogador"
                      className="input"
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                    >
                      <option value="">Selecione um jogador</option>
                      {players.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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

                {tipo === 'receita' && selectedPlayer && (
                  <div>
                    <label htmlFor="futureMonths" className="block text-sm font-medium mb-1">
                      Meses a pagar
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id="futureMonths"
                        className="input w-24"
                        min="1"
                        max="12"
                        value={futureMonths}
                        onChange={(e) => setFutureMonths(parseInt(e.target.value))}
                      />
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <CalendarDays className="w-4 h-4" />
                        <span>
                          {futureMonths > 1 
                            ? `Pagamento para os próximos ${futureMonths} meses`
                            : 'Pagamento único'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="valor" className="block text-sm font-medium mb-1">
                    Valor *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      R$
                    </span>
                    <input
                      type="number"
                      id="valor"
                      step="0.01"
                      min="0"
                      className="input pl-10"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    id="categoria"
                    className="input"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ex: Mensalidade, Aluguel, etc."
                  />
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    id="descricao"
                    className="input"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      <span>Salvar</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancesPage;