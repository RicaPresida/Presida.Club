import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, DollarSign, MessageSquare, Heart, Crown, Star, ArrowUpCircle, Book } from 'lucide-react';
import OnboardingTour from '../components/onboarding/OnboardingTour';
import { products } from '../stripe-config';

const AboutPage: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Sobre o Presida.Club</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Conheça mais sobre a plataforma que está revolucionando a gestão de times amadores
        </p>
      </header>

      <div className="space-y-8">
        {/* Tour Button */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <Book className="w-12 h-12 text-primary-500" />
            <div>
              <h2 className="text-xl font-bold">Tour de Boas-vindas</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Conheça todas as funcionalidades do Presida.Club
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="btn-primary w-full"
          >
            Iniciar Tour
          </button>
        </div>

        {/* Introdução */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <Trophy className="w-12 h-12 text-primary-500" />
            <div>
              <h2 className="text-xl font-bold">Nossa Missão</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Simplificar a gestão de times amadores de futebol
              </p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            O Presida.Club nasceu da necessidade de organizar melhor os times amadores de futebol.
            Nossa plataforma oferece ferramentas intuitivas para gerenciar jogadores, finanças,
            sorteios de times e muito mais, tudo em um só lugar.
          </p>
        </div>

        {/* Planos de Assinatura */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <Crown className="w-12 h-12 text-primary-500" />
            <div>
              <h2 className="text-xl font-bold">Planos de Assinatura</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Escolha o plano ideal para o seu time
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {products.map((product) => (
              <div
                key={product.id}
                className={`p-6 border rounded-lg ${
                  product.name === 'Premium' ? 'border-2 border-primary-500 relative' : ''
                }`}
              >
                {product.name === 'Premium' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-secondary-900 px-3 py-1 rounded-full text-sm font-medium">
                    Recomendado
                  </div>
                )}
                <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                  {product.price}<span className="text-sm font-normal text-gray-500">/mês</span>
                </p>
                <ul className="space-y-2 mb-4">
                  {product.description.split(' / ').map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Você começa com 21 dias de avaliação gratuita. Após assinar, cancele a qualquer momento.
            </p>
            <Link to="/pricing" className="btn-primary inline-flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5" />
              Ver planos e preços
            </Link>
          </div>
        </div>

        {/* Recursos */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-6">Principais Recursos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg h-fit">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Gestão de Jogadores</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Cadastre jogadores, acompanhe presenças, avalie desempenho e mantenha um histórico completo.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg h-fit">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Controle Financeiro</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Gerencie mensalidades, despesas e receitas do time com facilidade e transparência.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg h-fit">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Sorteio Inteligente</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Monte times equilibrados automaticamente considerando nível e posição dos jogadores.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg h-fit">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Resenha Pós-Jogo</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Organize os gastos da resenha e divida as despesas entre os participantes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6">Informações Legais</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Termos de Uso</h3>
              <div className="prose dark:prose-invert max-h-[300px] overflow-y-auto p-4 bg-gray-50 dark:bg-dark-light rounded-lg">
                <h4>1. Aceitação dos Termos</h4>
                <p>
                  Ao acessar e usar o Presida.Club, você concorda em cumprir e estar vinculado aos seguintes termos e condições.
                  Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.
                </p>

                <h4>2. Uso do Serviço</h4>
                <p>
                  O Presida.Club é uma plataforma de gestão para times de futebol amador. Você concorda em:
                </p>
                <ul>
                  <li>Fornecer informações precisas e atualizadas</li>
                  <li>Manter a segurança de sua conta</li>
                  <li>Não usar o serviço para fins ilegais</li>
                  <li>Respeitar os direitos de outros usuários</li>
                </ul>

                <h4>3. Contas de Usuário</h4>
                <p>
                  Para usar o Presida.Club, você precisa criar uma conta. Você é responsável por:
                </p>
                <ul>
                  <li>Manter a confidencialidade de sua senha</li>
                  <li>Todas as atividades que ocorrem em sua conta</li>
                  <li>Notificar imediatamente sobre qualquer uso não autorizado</li>
                </ul>

                <h4>4. Conteúdo do Usuário</h4>
                <p>
                  Você mantém todos os direitos sobre o conteúdo que envia ao Presida.Club, mas concede uma licença não exclusiva
                  para usar, modificar e exibir o conteúdo para fornecer o serviço.
                </p>

                <h4>5. Limitação de Responsabilidade</h4>
                <p>
                  O Presida.Club é fornecido "como está" e não oferece garantias de qualquer tipo. Não somos responsáveis por:
                </p>
                <ul>
                  <li>Perda de dados</li>
                  <li>Danos indiretos</li>
                  <li>Interrupções do serviço</li>
                </ul>

                <h4>6. Modificações</h4>
                <p>
                  Reservamo-nos o direito de modificar ou descontinuar o serviço a qualquer momento, com ou sem aviso prévio.
                  Também podemos atualizar estes termos periodicamente.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Política de Privacidade</h3>
              <div className="prose dark:prose-invert max-h-[300px] overflow-y-auto p-4 bg-gray-50 dark:bg-dark-light rounded-lg">
                <h4>1. Dados Coletados</h4>
                <p>
                  Coletamos os seguintes tipos de informações:
                </p>
                <ul>
                  <li>Informações de cadastro (nome, email)</li>
                  <li>Dados de jogadores e times</li>
                  <li>Informações financeiras do time</li>
                  <li>Dados de uso do serviço</li>
                </ul>

                <h4>2. Uso dos Dados</h4>
                <p>
                  Utilizamos seus dados para:
                </p>
                <ul>
                  <li>Fornecer e melhorar nossos serviços</li>
                  <li>Processar pagamentos e transações</li>
                  <li>Enviar notificações importantes</li>
                  <li>Personalizar sua experiência</li>
                </ul>

                <h4>3. Base Legal para Processamento (GDPR)</h4>
                <p>
                  Processamos seus dados com base em:
                </p>
                <ul>
                  <li>Execução de contrato</li>
                  <li>Consentimento explícito</li>
                  <li>Interesses legítimos</li>
                  <li>Obrigações legais</li>
                </ul>

                <h4>4. Seus Direitos (GDPR)</h4>
                <p>
                  Você tem os seguintes direitos:
                </p>
                <ul>
                  <li>Acesso aos seus dados</li>
                  <li>Retificação de dados incorretos</li>
                  <li>Apagamento de dados ("direito ao esquecimento")</li>
                  <li>Portabilidade dos dados</li>
                  <li>Restrição de processamento</li>
                  <li>Oposição ao processamento</li>
                </ul>

                <h4>5. Compartilhamento de Dados</h4>
                <p>
                  Compartilhamos dados apenas com:
                </p>
                <ul>
                  <li>Provedores de serviço necessários</li>
                  <li>Autoridades quando legalmente exigido</li>
                </ul>

                <h4>6. Segurança dos Dados</h4>
                <p>
                  Implementamos medidas técnicas e organizacionais para proteger seus dados:
                </p>
                <ul>
                  <li>Criptografia em trânsito e em repouso</li>
                  <li>Controles de acesso rigorosos</li>
                  <li>Monitoramento de segurança</li>
                </ul>

                <h4>7. Retenção de Dados</h4>
                <p>
                  Mantemos seus dados apenas pelo tempo necessário para:
                </p>
                <ul>
                  <li>Fornecer nossos serviços</li>
                  <li>Cumprir obrigações legais</li>
                  <li>Resolver disputas</li>
                </ul>

                <h4>8. Cookies e Tecnologias Similares</h4>
                <p>
                  Usamos cookies para:
                </p>
                <ul>
                  <li>Manter sua sessão</li>
                  <li>Lembrar preferências</li>
                  <li>Melhorar a performance</li>
                </ul>

                <h4>9. Transferências Internacionais</h4>
                <p>
                  Quando transferimos dados para fora da UE/EEE, garantimos proteções adequadas através de:
                </p>
                <ul>
                  <li>Cláusulas contratuais padrão</li>
                  <li>Decisões de adequação</li>
                  <li>Outras salvaguardas legais</li>
                </ul>

                <h4>10. Contato</h4>
                <p>
                  Para exercer seus direitos ou tirar dúvidas sobre privacidade, contate:
                  <br />
                  Email: privacidade@presida.club
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary-100 dark:bg-primary-900/20 mb-4">
            <Heart className="w-6 h-6 text-primary-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Feito com amor para o futebol amador
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Estamos constantemente trabalhando para melhorar a plataforma e trazer
            novos recursos para facilitar ainda mais a gestão do seu time.
          </p>
        </div>
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
};

export default AboutPage;