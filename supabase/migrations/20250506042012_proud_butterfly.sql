/*
  # Add reminders functionality

  1. New Tables
    - `lembretes`: Store user reminders
      - `id` (uuid, primary key)
      - `usuario_id` (uuid, references auth.users)
      - `titulo` (text)
      - `descricao` (text)
      - `dia` (text, day of week)
      - `horario` (time)
      - `ativo` (boolean)
      - `criado_em` (timestamp)
      - `ultima_execucao` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for proper access control
*/

CREATE TABLE IF NOT EXISTS lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  dia TEXT NOT NULL CHECK (dia IN ('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado')),
  horario TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ultima_execucao TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários podem ver seus próprios lembretes"
  ON lembretes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem gerenciar seus próprios lembretes"
  ON lembretes FOR ALL
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);