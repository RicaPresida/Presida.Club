import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSupabase } from '../contexts/SupabaseContext';

const SuccessPage: React.FC = () => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productName = searchParams.get('product');
  const durationMonths = searchParams.get('duration') || '1';
  const isMock = searchParams.get('mock') === 'true';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Criar notificação de boas-vindas ao plano
    const createWelcomeNotification = async () => {
      try {
        await supabase
          .from('notificacoes')
          .insert({
            usuario_id: user.id,
            titulo: 'Assinatura confirmada!',
            mensagem: `Bem-vindo ao Presida.Club! ${isMock ? '(MODO TESTE) ' : ''}Sua assinatura${productName ? ` do plano ${productName}` : ''} foi ativada com sucesso por ${durationMonths} ${parseInt(durationMonths) === 1 ? 'mês' : 'meses'}. Aproveite todos os recursos disponíveis para o seu plano.`,
          });
      } catch (error) {
        console.error('Erro ao criar notificação:', error);
      }
    };

    // Atualizar perfil do usuário para simular assinatura ativa
    const updateUserProfile = async () => {
      if (isMock) {
        try {
          // Em modo de teste, simular uma assinatura ativa definindo trial_ends_at para um futuro distante
          await supabase
            .from('profiles')
            .update({
              trial_ends_at: new Date(Date.now() + parseInt(durationMonths) * 30 * 24 * 60 * 60 * 1000).toISOString(), // Duração baseada no plano
            })
            .eq('id', user.id);
            
          console.log('User profile updated with extended trial period');
        } catch (error) {
          console.error('Error updating user profile:', error);
        }
      }
    };

    createWelcomeNotification();
    updateUserProfile();
  }, [user, supabase, navigate, productName, durationMonths, isMock]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100 dark:bg-green-900/20">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Pagamento Confirmado!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
          {isMock ? (
            <>
              <span className="text-yellow-500 font-bold">[MODO TESTE] </span>
              Esta é uma simulação de pagamento para fins de desenvolvimento.
            </>
          ) : (
            <>
              Obrigado por assinar o Presida.Club! Seu pagamento foi processado com sucesso e sua assinatura está ativa.
            </>
          )}
          {productName && (
            <span className="block mt-2">
              Plano: <strong>{productName}</strong> - Duração: <strong>{durationMonths} {parseInt(durationMonths) === 1 ? 'mês' : 'meses'}</strong>
            </span>
          )}
        </p>
        <Link to="/" className="btn-primary">
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
};

export default SuccessPage;