import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  Trash2, 
  Users, 
  DollarSign, 
  Crown, 
  AlertCircle,
  Save,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type UserProfile = {
  id: string;
  email: string;
  nome: string;
  nome_completo?: string;
  created_at?: string;
  subscription?: {
    subscription_status: string;
    price_id: string;
    current_period_end: string;
  };
};

interface SubscriptionTrend {
  month: string;
  basic: number;
  professional: number;
  premium: number;
  lifetime: number;
  trial: number;
}

export default function AdminDashboardPage() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [subscriptionTrends, setSubscriptionTrends] = useState<SubscriptionTrend[]>([]);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired'>('all');

  const fetchSubscriptionTrends = async () => {
    try {
      const trends: SubscriptionTrend[] = [];
      
      // Get data for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);

        const { data: monthUsers } = await supabase
          .from('profiles')
          .select(`
            id,
            role,
            email,
            trial_ends_at,
            subscription:stripe_user_subscriptions!fk_customer_profile(
              subscription_status,
              price_id
            )
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (monthUsers) {
          const monthData: SubscriptionTrend = {
            month: format(date, 'MMM yyyy', { locale: ptBR }),
            basic: 0,
            professional: 0,
            premium: 0,
            lifetime: 0,
            trial: 0
          };

          monthUsers.forEach(user => {
            if (user.role === 'admin' || user.email === 'rica@agsupernova.com') {
              monthData.lifetime++;
            } else if (user.subscription?.subscription_status === 'trialing' || 
                     (user.trial_ends_at && new Date(user.trial_ends_at) > new Date())) {
              monthData.trial++;
            } else if (user.subscription?.price_id === 'price_1RHolMB0B3nriuwYinEKtACX') {
              monthData.basic++;
            } else if (user.subscription?.price_id === 'price_1RHoosB0B3nriuwYflpemSiN') {
              monthData.professional++;
            } else if (user.subscription?.price_id === 'price_1RHouUB0B3nriuwYWZibkTjF') {
              monthData.premium++;
            }
          });

          trends.push(monthData);
        }
      }

      setSubscriptionTrends(trends);
    } catch (error) {
      console.error('Error fetching subscription trends:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          nome_completo,
          email,
          created_at,
          role,
          subscription:stripe_user_subscriptions!fk_customer_profile(
            subscription_status,
            price_id,
            current_period_end
          )
        `);

      if (error) throw error;
      setUsers(data || []);
      
      // Fetch subscription trends after users are loaded
      await fetchSubscriptionTrends();
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stripe_user_subscriptions'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleUpgrade = async (userId: string) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase.rpc('admin_update_subscription', {
        user_id: userId,
        new_price_id: 'price_1RHouUB0B3nriuwYWZibkTjF', // Premium plan
        new_status: 'active'
      });

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error upgrading user:', error);
      setError('Error upgrading user subscription');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setDeletingUser(userId);
    try {
      const { error } = await supabase.rpc('admin_delete_user', { uid: userId });

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Error deleting user');
    } finally {
      setDeletingUser(null);
    }
  };

  const getPlanName = (user: UserProfile) => {
    if (user.role === 'admin' || user.email === 'rica@agsupernova.com') {
      return 'Lifetime Premium';
    }

    switch (user.subscription?.price_id) {
      case 'price_1RHouUB0B3nriuwYWZibkTjF':
        return 'Premium';
      case 'price_1RHoosB0B3nriuwYflpemSiN':
        return 'Professional';
      case 'price_1RHolMB0B3nriuwYinEKtACX':
        return 'Basic';
      default:
        return 'No Plan';
    }
  };

  const filteredUsers = users.filter(user => {
    // Search term filter
    const matchesSearch = 
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const plan = getPlanName(user);
      const status = user.subscription?.subscription_status;

      switch (statusFilter) {
        case 'active':
          matchesStatus = status === 'active' || plan === 'Lifetime Premium';
          break;
        case 'trial':
          matchesStatus = status === 'trialing';
          break;
        case 'expired':
          matchesStatus = status === 'canceled' || status === 'incomplete_expired';
          break;
      }
    }

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const mrr = users.reduce((total, user) => {
    if (user.role === 'admin' || user.email === 'rica@agsupernova.com') {
      return total;
    }

    if (user.subscription?.subscription_status === 'active') {
      switch (user.subscription.price_id) {
        case 'price_1RHouUB0B3nriuwYWZibkTjF':
          return total + 59.99;
        case 'price_1RHoosB0B3nriuwYflpemSiN':
          return total + 29.99;
        case 'price_1RHolMB0B3nriuwYinEKtACX':
          return total + 19.99;
        default:
          return total;
      }
    }
    return total;
  }, 0);

  const activeUsers = users.filter(u => 
    u.role === 'admin' || 
    u.email === 'rica@agsupernova.com' || 
    u.subscription?.subscription_status === 'active'
  ).length;
  
  const trialUsers = users.filter(u => 
    u.role !== 'admin' && 
    u.email !== 'rica@agsupernova.com' && 
    u.subscription?.subscription_status === 'trialing'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage users and subscriptions
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">MRR</p>
              <p className="text-2xl font-bold">
                {mrr.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold">{activeUsers}</p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
              <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Trial Users</p>
              <p className="text-2xl font-bold">{trialUsers}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Crown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Trends Chart */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-bold mb-6">Subscription Trends</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={subscriptionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="trial" 
                name="Trial" 
                stroke="#EAB308" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="basic" 
                name="Basic" 
                stroke="#4B5563" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="professional" 
                name="Professional" 
                stroke="#2563EB" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="premium" 
                name="Premium" 
                stroke="#00FF7F" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="lifetime" 
                name="Lifetime" 
                stroke="#9333EA" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b dark:border-dark-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Users</h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-light">
                <th className="text-left p-4 font-medium">User</th>
                <th className="text-left p-4 font-medium">Plan</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-dark-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-light">
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{user.nome || user.email}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(user.created_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span>{getPlanName(user)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' || user.email === 'rica@agsupernova.com'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        : user.subscription?.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {user.role === 'admin' || user.email === 'rica@agsupernova.com'
                        ? 'Lifetime'
                        : user.subscription?.subscription_status || 'Trial'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {user.role !== 'admin' && user.email !== 'rica@agsupernova.com' && (
                        <button
                          onClick={() => handleUpgrade(user.id)}
                          disabled={updatingUser === user.id}
                          className="btn-primary text-sm"
                        >
                          {updatingUser === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Upgrade to Premium'
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingUser === user.id || user.role === 'admin' || user.email === 'rica@agsupernova.com'}
                        className={`text-red-500 hover:text-red-700 p-2 ${
                          user.role === 'admin' || user.email === 'rica@agsupernova.com'
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        title={user.role === 'admin' || user.email === 'rica@agsupernova.com' 
                          ? 'Cannot delete admin users' 
                          : 'Delete user'}
                      >
                        {deletingUser === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}