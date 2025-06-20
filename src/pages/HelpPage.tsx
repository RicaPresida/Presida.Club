import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, HelpCircle, Mail, MessageSquare } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const HelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const faqItems: FAQItem[] = [
    // Geral
    {
      category: 'geral',
      question: 'Como começar a usar o Presida.Club?',
      answer: 'Para começar, crie sua conta e depois crie seu primeiro grupo. Você poderá adicionar jogadores, configurar dias de jogo e começar a gerenciar seu time.'
    },
    {
      category: 'geral',
      question: 'Posso gerenciar mais de um grupo?',
      answer: 'Sim! Você pode criar e gerenciar múltiplos grupos. Cada grupo terá suas próprias configurações, jogadores e histórico.'
    },
    {
      category: 'geral',
      question: 'Como alterar o grupo ativo?',
      answer: 'Na página de grupos, clique no grupo desejado e depois em "Tornar Ativo". O grupo ativo será exibido no topo da página.'
    },

    // Jogadores
    {
      category: 'jogadores',
      question: 'Como adicionar novos jogadores?',
      answer: 'Na página de jogadores, clique no botão "Novo Jogador" e preencha as informações necessárias como nome, idade, posição e nível.'
    },
    {
      category: 'jogadores',
      question: 'Como atualizar as características de um jogador?',
      answer: 'Acesse o perfil do jogador e clique no ícone de edição ao lado das características. Você pode avaliar velocidade, finalização, passe, drible, defesa e físico.'
    },
    {
      category: 'jogadores',
      question: 'Como registrar uma ocorrência para um jogador?',
      answer: 'No perfil do jogador, clique no botão de ocorrências, selecione o tipo e descreva o ocorrido. Você também pode envolver outros jogadores na ocorrência.'
    },

    // Financeiro
    {
      category: 'financeiro',
      question: 'Como registrar uma receita ou despesa?',
      answer: 'Na página financeira, clique em "Novo Registro", selecione o tipo (receita/despesa), informe o valor e demais detalhes como data e descrição.'
    },
    {
      category: 'financeiro',
      question: 'Como controlar pagamentos de mensalidade?',
      answer: 'Na página financeira, você pode registrar os pagamentos de mensalidade por jogador. O sistema mantém um histórico completo dos pagamentos.'
    },
    {
      category: 'financeiro',
      question: 'Como exportar relatórios financeiros?',
      answer: 'Na página financeira, use os filtros para selecionar o período desejado e clique em "Exportar". Você receberá um relatório detalhado em PDF.'
    },

    // Sorteio
    {
      category: 'sorteio',
      question: 'Como funciona o sorteio de times?',
      answer: 'O sistema considera o nível e posição dos jogadores para montar times equilibrados. Selecione os jogadores presentes e clique em "Sortear Times".'
    },
    {
      category: 'sorteio',
      question: 'Posso ajustar os times após o sorteio?',
      answer: 'Sim, após o sorteio você pode fazer ajustes manuais nos times caso necessário.'
    },
    {
      category: 'sorteio',
      question: 'Como o sistema equilibra os times?',
      answer: 'O algoritmo considera as características individuais dos jogadores, nível geral e posição para distribuí-los de forma equilibrada entre os times.'
    },

    // Resenha
    {
      category: 'resenha',
      question: 'Como criar uma nova resenha?',
      answer: 'Na página de resenhas, clique em "Nova Resenha", selecione a data, responsável e participantes. Você pode registrar os gastos individuais e o sistema calcula a divisão.'
    },
    {
      category: 'resenha',
      question: 'Como marcar um pagamento como realizado?',
      answer: 'Na página da resenha, localize o jogador e clique no botão de status do pagamento para alternar entre pago e pendente.'
    },
    {
      category: 'resenha',
      question: 'Como exportar os dados da resenha?',
      answer: 'Na página da resenha, clique no botão "Exportar" para gerar um PDF com todos os detalhes, incluindo participantes, valores e status de pagamento.'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'geral', name: 'Geral' },
    { id: 'jogadores', name: 'Jogadores' },
    { id: 'financeiro', name: 'Financeiro' },
    { id: 'sorteio', name: 'Sorteio' },
    { id: 'resenha', name: 'Resenha' }
  ];

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Central de Ajuda</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Encontre respostas para suas dúvidas sobre o Presida.Club
        </p>
      </header>

      <div className="card p-6 mb-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar ajuda..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Desktop Categories */}
        <div className="hidden md:flex gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`btn ${
                selectedCategory === category.id
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Mobile Category Dropdown */}
        <div className="md:hidden relative">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="w-full p-3 text-left bg-white dark:bg-dark-paper border dark:border-dark-border rounded-lg flex items-center justify-between"
          >
            <span>
              {categories.find(c => c.id === selectedCategory)?.name || 'Selecione uma categoria'}
            </span>
            {showCategoryDropdown ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {showCategoryDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-dark-paper border dark:border-dark-border rounded-lg shadow-lg">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowCategoryDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-light transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : ''
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="card p-8 text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Tente buscar com outros termos ou selecione uma categoria diferente
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div key={index} className="card">
              <button
                onClick={() => setExpandedItem(expandedItem === item.question ? null : item.question)}
                className="w-full p-6 text-left flex items-center justify-between"
              >
                <span className="font-medium">{item.question}</span>
                {expandedItem === item.question ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              {expandedItem === item.question && (
                <div className="px-6 pb-6">
                  <div className="pt-4 border-t dark:border-dark-border">
                    <p className="text-gray-600 dark:text-gray-300">{item.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Contato */}
      <div className="mt-12 card p-6">
        <div className="text-center mb-8">
          <HelpCircle className="w-12 h-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Ainda precisa de ajuda?</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Entre em contato conosco que teremos prazer em ajudar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://wa.me/5511916158282"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            Contato via WhatsApp
          </a>

          <a
            href="mailto:suporte@presida.club"
            className="btn-outline flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Enviar email
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;