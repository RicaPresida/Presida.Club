import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Gift, Share2 } from 'lucide-react';

const RewardsPage: React.FC = () => {
  const { user } = useAuth();
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    if (user) {
      // Create referral link with user ID
      const baseUrl = window.location.origin;
      const referralCode = btoa(user.id); // Simple encoding of user ID
      setReferralLink(`${baseUrl}/cadastro?ref=${referralCode}`);
    }
  }, [user]);

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `🎯 Eai?! Conhece o Presida.Club? É uma plataforma incrível para gerenciar times de futebol amador!\n\n` +
      `Estou usandoe recomendo. Lembrei de você. Se você se cadastrar pelo meu link, e começa a usar pra me dar uma força. TMJ!\n\n` +
      `👉 ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Programa de Recompensas</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Indique amigos e ganhe benefícios exclusivos
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rewards Info */}
        <div className="card p-6">
          <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400 mb-4">
            <Gift className="w-8 h-8" />
            <h2 className="text-xl font-bold">Como Funciona</h2>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Compartilhe seu link exclusivo com amigos que gerenciam times de futebol amador.
              Quando alguém se cadastrar usando seu link, e começar a usar você ganha automaticamente:
            </p>

            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
              <h3 className="font-bold text-primary-600 dark:text-primary-400 mb-2">
                🎁 Sua Recompensa
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Upgrade automático para o <span className="font-bold">Plano Básico</span> por 30 dias!
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-dark-light p-4 rounded-lg">
              <h3 className="font-bold mb-2">Benefícios do Plano Básico:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• 1 time</li>
                <li>• Até 30 jogadores</li>
                <li>• Sorteio de times</li>
                <li>• Financeiro</li>
                <li>• Relatórios essenciais</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400 mb-4">
            <Share2 className="w-8 h-8" />
            <h2 className="text-xl font-bold">Compartilhe</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Seu Link Exclusivo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="input flex-1"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(referralLink)}
                  className="btn-outline"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={handleWhatsAppShare}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartilhar no WhatsApp
              </button>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Quanto mais amigos você indicar, mais tempo de benefícios você ganha!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;