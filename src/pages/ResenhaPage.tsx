import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { useActiveGroup } from '../hooks/useActiveGroup';
import { Plus, Calendar, DollarSign, User, FileText, Trash2, Pencil, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';

const ResenhaPage: React.FC = () => {
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [resenhas, setResenhas] = useState([]);
  const [finalizing, setFinalizing] = useState<string | null>(null);
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { activeGroupId } = useActiveGroup();

  useEffect(() => {
    const fetchResenhas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('resenhas')
        .select('*')
        .eq('grupo_id', activeGroupId)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar resenhas:', error);
      } else {
        setResenhas(data);
      }
      setLoading(false);
    };

    if (activeGroupId) {
      fetchResenhas();
    }
  }, [activeGroupId, filterMonth]);

  const handleFinalize = async (resenha) => {
    setFinalizing(resenha.id);
    // lógica de finalização aqui
    setFinalizing(null);
  };

  const handleDelete = async (id) => {
    // lógica de exclusão aqui
  };

  const generatePDF = (resenha) => {
    const doc = new jsPDF();
    doc.text(`Resenha - ${resenha.responsavel.nome}`, 10, 10);
    doc.save(`resenha-${resenha.id}.pdf`);
  };

  return (
    <div>
      <div className="flex flex-col mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Resenhas</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Gerencie as resenhas do seu grupo
          </p>
          <div className="block sm:hidden">
            <button
              onClick={() => navigate('/resenha/nova')}
              className="btn-primary w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Resenha
            </button>
          </div>
        </div>
        <div className="hidden sm:flex sm:justify-between sm:items-center">
          <div></div>
          <button
            onClick={() => navigate('/resenha/nova')}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Resenha
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="filterMonth" className="block text-sm font-medium mb-1">
              Mês
            </label>
            <input
              type="month"
              id="filterMonth"
              className="input py-1.5"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Carregando resenhas...</p>
        </div>
      ) : resenhas.length === 0 ? (
        <div className="card p-8 text-center">
          <Calendar className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhuma resenha encontrada</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Crie sua primeira resenha para começar a gerenciar os gastos do grupo
          </p>
          <button
            onClick={() => navigate('/resenha/nova')}
            className="btn-primary"
          >
            Criar primeira resenha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resenhas.map((resenha) => (
            <div
              key={resenha.id}
              onClick={() => navigate(`/resenha/${resenha.id}`)}
              className="card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="font-medium">
                      {new Date(resenha.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className={`text-sm px-2 py-0.5 rounded-full capitalize ${
                    resenha.status === 'finalizada'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {resenha.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Responsável: {resenha.responsavel.nome}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Total: {resenha.total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {resenha.jogadores.length} participantes •{' '}
                        {resenha.jogadores.filter(j => j.pago).length} pagos
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {resenha.status === 'pendente' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinalize(resenha);
                          }}
                          className="p-2 text-green-500 hover:text-green-700"
                          title="Finalizar"
                          disabled={finalizing === resenha.id}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resenha/${resenha.id}/editar`);
                        }}
                        className="p-2 text-blue-500 hover:text-blue-700"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePDF(resenha);
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        title="Gerar PDF"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(resenha.id);
                        }}
                        className="p-2 text-red-500 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResenhaPage;