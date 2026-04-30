-- Tabela de leads do formulário público de contato
CREATE TABLE public.contact_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  restaurante TEXT,
  cidade TEXT,
  faturamento TEXT,
  mensagem TEXT,
  origem TEXT NOT NULL DEFAULT 'landing-contato'
);

-- Constraints simples de tamanho para defesa em profundidade
ALTER TABLE public.contact_leads
  ADD CONSTRAINT contact_leads_nome_len CHECK (char_length(nome) BETWEEN 1 AND 120),
  ADD CONSTRAINT contact_leads_whatsapp_len CHECK (char_length(whatsapp) BETWEEN 8 AND 30),
  ADD CONSTRAINT contact_leads_email_len CHECK (char_length(email) BETWEEN 5 AND 255),
  ADD CONSTRAINT contact_leads_restaurante_len CHECK (restaurante IS NULL OR char_length(restaurante) <= 160),
  ADD CONSTRAINT contact_leads_cidade_len CHECK (cidade IS NULL OR char_length(cidade) <= 120),
  ADD CONSTRAINT contact_leads_faturamento_len CHECK (faturamento IS NULL OR char_length(faturamento) <= 60),
  ADD CONSTRAINT contact_leads_mensagem_len CHECK (mensagem IS NULL OR char_length(mensagem) <= 2000),
  ADD CONSTRAINT contact_leads_origem_len CHECK (char_length(origem) <= 60);

-- Índice por data para listagem em backoffice
CREATE INDEX idx_contact_leads_created_at ON public.contact_leads (created_at DESC);

-- RLS
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode enviar (formulário público)
CREATE POLICY contact_leads_insert_public
ON public.contact_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Leitura: por ora bloqueada para clientes (apenas service_role no backend acessa).
-- Nenhuma policy de SELECT/UPDATE/DELETE => negado para anon/authenticated.