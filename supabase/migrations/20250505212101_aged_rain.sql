/*
  # Add notifications system
  
  1. New Tables
    - `notificacoes`: Store user notifications
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, references auth.users)
      - `titulo` (text)
      - `mensagem` (text)
      - `lida` (boolean)
      - `criado_em` (timestamp)
      - `lida_em` (timestamp)
  
  2. Security
    - Enable RLS
    - Add policies for proper access control
*/

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  lida_em TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON notificacoes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar suas próprias notificações"
  ON notificacoes FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar suas próprias notificações"
  ON notificacoes FOR DELETE
  USING (auth.uid() = usuario_id);