export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'subscription' | 'payment';
  price: string;
  durationMonths: number;
}

export const products: Product[] = [
  {
    id: 'prod_basic',
    priceId: 'price_basic_monthly',
    name: 'Básico',
    description: 'Gerenciamento de 1 Grupo / Até 30 jogadores / Sorteio de times / Financeiro / Relatórios',
    mode: 'subscription',
    price: 'R$ 29,99',
    durationMonths: 1
  },
  {
    id: 'prod_professional',
    priceId: 'price_professional_monthly',
    name: 'Profissional',
    description: 'Até 50 jogadores por time / Sorteio de times / Financeiro / Relatórios / Resenha',
    mode: 'subscription',
    price: 'R$ 39,99',
    durationMonths: 12
  },
  {
    id: 'prod_premium',
    priceId: 'price_premium_monthly',
    name: 'Premium',
    description: 'Até 2 times / Até 100 jogadores por time / Sorteio de times / Financeiro / Relatórios / Resenha / Suporte prioritário',
    mode: 'subscription',
    price: 'R$ 59,99',
    durationMonths: 36
  }
];