import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  Pencil,
  Check,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface Resenha {
  id: string;
  data: string;
  total: number;
  status: string;
  responsavel: {
    nome: string;
  };
  jogadores: {
    jogador: {
      id: string;
      nome: string;
    };
    valor_gasto: number;
    valor_devido: number;
    pago: boolean;
    descricao?: string;
  }[];
}

const ResenhaDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [resenha, setResenha] = useState<Resenha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchResenha = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('resenhas')
          .select(`
            *,
            responsavel:jogadores!resenhas_responsavel_id_fkey(nome),
            jogadores:resenhas_jogadores(
              jogador:jogadores(id, nome),
              valor_gasto,
              valor_devido,
              pago,
              descricao
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setResenha(data);
      } catch (error) {
        console.error('Erro ao carregar resenha:', error);
        setError('Erro ao carregar dados da resenha');
      } finally {
        setLoading(false);
      }
    };

    fetchResenha();
  }, [id, supabase]);

  const handleTogglePayment = async (jogadorId: string, currentStatus: boolean) => {
    if (!resenha) return;

    setUpdatingPayment(jogadorId);
    try {
      const { error } = await supabase
        .from('resenhas_jogadores')
        .update({ pago: !currentStatus })
        .eq('resenha_id', resenha.id)
        .eq('jogador_id', jogadorId);

      if (error) throw error;

      // Update local state
      setResenha(prev => {
        if (!prev) return null;
        return {
          ...prev,
          jogadores: prev.jogadores.map(j => 
            j.jogador.id === jogadorId ? { ...j, pago: !currentStatus } : j
          )
        };
      });

      // Check if all players have paid and update resenha status
      const allPaid = resenha.jogadores.every(j => 
        j.jogador.id === jogadorId ? !currentStatus : j.pago
      );

      if (allPaid && resenha.status !== 'finalizada') {
        await handleUpdateStatus('finalizada');
      } else if (!allPaid && resenha.status === 'finalizada') {
        await handleUpdateStatus('pendente');
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      setError('Erro ao atualizar pagamento');
    } finally {
      setUpdatingPayment(null);
    }
  };

  const handleUpdateStatus = async (newStatus: 'pendente' | 'finalizada') => {
    if (!resenha) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('resenhas')
        .update({ status: newStatus })
        .eq('id', resenha.id);

      if (error) throw error;

      setResenha(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setError('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const generatePDF = () => {
    if (!resenha) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Resenha', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Date and Responsible
    doc.setFontSize(12);
    doc.text(`Data: ${new Date(resenha.data).toLocaleDateString('pt-BR')}`, 20, yPos);
    yPos += 7;
    doc.text(`Responsável: ${resenha.responsavel.nome}`, 20, yPos);
    yPos += 7;
    doc.text(`Total: ${resenha.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPos);
    yPos += 15;

    // Summary
    doc.setFontSize(14);
    doc.text('Resumo', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    const totalGasto = resenha.jogadores.reduce((sum, j) => sum + j.valor_gasto, 0);
    const valorPorPessoa = totalGasto / resenha.jogadores.length;

    doc.text(`Total gasto: ${totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPos);
    yPos += 7;
    doc.text(`Valor por pessoa: ${valorPorPessoa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPos);
    yPos += 15;

    // Participants table
    doc.setFontSize(14);
    doc.text('Participantes', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    const headers = ['Nome', 'Gastou', 'Deve Pagar', 'Diferença', 'Status'];
    const rows = resenha.jogadores.map(j => {
      const diferenca = j.valor_gasto - valorPorPessoa;
      return [
        j.jogador.nome,
        j.valor_gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        valorPorPessoa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        j.pago ? 'Pago' : 'Pendente'
      ];
    });

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
      margin: { left: 20 },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 255, 127] }
    });

    doc.save(`resenha-${resenha.data}.pdf`);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Carregando resenha...</p>
      </div>
    );
  }

  if (!resenha) {
    return (
      <div className="text-center py-8">
        <p>Resenha não encontrada</p>
      </div>
    );
  }

  const totalGasto = resenha.jogadores.reduce((sum, j) => sum + j.valor_gasto, 0);
  const valorPorPessoa = totalGasto / resenha.jogadores.length;

  return (
    <div>
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/resenha')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-light rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">Detalhes da Resenha</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {new Date(resenha.data).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/resenha/${resenha.id}/editar`)}
            className="btn-outline"
            title="Editar"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </button>
          <button
            onClick={generatePDF}
            className="btn-primary"
            title="Exportar PDF"
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Participantes</h2>
              <span className={`text-sm px-2 py-0.5 rounded-full capitalize ${
                resenha.status === 'finalizada'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
              }`}>
                {resenha.status === 'finalizada' ? 'Pago' : 'Pendente'}
              </span>
            </div>

            <div className="space-y-4">
              {resenha.jogadores.map((jogador) => {
                const diferenca = jogador.valor_gasto - valorPorPessoa;
                
                return (
                  <div
                    key={jogador.jogador.id}
                    className="p-4 border dark:border-dark-border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-sm font-medium">
                          {jogador.jogador.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{jogador.jogador.nome}</span>
                      </div>
                      <button
                        onClick={() => handleTogglePayment(jogador.jogador.id, jogador.pago)}
                        disabled={updatingPayment === jogador.jogador.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          jogador.pago
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {updatingPayment === jogador.jogador.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        {jogador.pago ? 'Pago' : 'Pendente'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Valor Gasto
                        </p>
                        <p className="font-medium">
                          {jogador.valor_gasto.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Valor Devido
                        </p>
                        <p className="font-medium">
                          {valorPorPessoa.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {diferenca >= 0 ? 'Deve Receber' : 'Deve Pagar'}
                        </p>
                        <div className="flex items-center gap-1">
                          {diferenca >= 0 ? (
                            <ArrowUpCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-red-500" />
                          )}
                          <p className={`font-medium ${
                            diferenca >= 0 
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {Math.abs(diferenca).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {jogador.descricao && (
                      <div className="mt-2 text-sm text-gray-500">
                        {jogador.descricao}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Informações</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Data</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="font-medium">
                    {new Date(resenha.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Responsável
                </p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <p className="font-medium">{resenha.responsavel.nome}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <p className="font-medium">
                    {resenha.total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-dark-border">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Status de Pagamento
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total de participantes</span>
                    <span className="font-medium">{resenha.jogadores.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagamentos realizados</span>
                    <span className="font-medium text-green-600">
                      {resenha.jogadores.filter(j => j.pago).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pagamentos pendentes</span>
                    <span className="font-medium text-red-600">
                      {resenha.jogadores.filter(j => !j.pago).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-dark-border">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Resumo Financeiro
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total gasto</span>
                    <span className="font-medium">
                      {totalGasto.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor por pessoa</span>
                    <span className="font-medium">
                      {valorPorPessoa.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResenhaDetailsPage;