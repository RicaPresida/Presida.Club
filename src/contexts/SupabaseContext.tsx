import React, { createContext, useContext, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// ⚠️ Variáveis de ambiente — configure no Netlify
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ Inicializa o cliente Supabase com as variáveis corretas
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SupabaseContextProps {
  supabase: typeof supabase;
  invokeFunction: <T = any>(
    functionName: string,
    payload?: Record<string, any>
  ) => Promise<{
    data: T | null;
    error: Error | null;
  }>;
}

const SupabaseContext = createContext<SupabaseContextProps | undefined>(undefined);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  // ✅ Função para invocar Edge Functions com payload opcional
  const invokeFunction = async <T = any>(
    functionName: string,
    payload?: Record<string, any>
  ) => {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body: payload,
    });
    return { data, error };
  };

  return (
    <SupabaseContext.Provider value={{ supabase, invokeFunction }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase deve ser usado dentro de um SupabaseProvider');
  }
  return context;
};
