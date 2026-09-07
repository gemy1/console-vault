-- ==============================================================================
-- CONSOLE VAULT - SCHEMA MIGRATION PATCH
-- Run this in your Supabase Dashboard -> SQL Editor to update your database
-- ==============================================================================

-- 1. Add 'Full' account type to the existing enum
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'Full';

-- 2. Add contact_methods to sellers for multi-channel support (WhatsApp, Telegram, etc.)
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS contact_methods jsonb DEFAULT '[]'::jsonb;

-- 3. Create Clients table for the Seller/Distributor hub
CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_platform contact_platform NOT NULL DEFAULT 'WhatsApp',
    contact_link text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Client Allocations table for slot sales (Primary, Secondary, Full)
CREATE TABLE IF NOT EXISTS public.client_allocations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    slot_type account_type NOT NULL DEFAULT 'Primary',
    sale_price numeric(10, 2) DEFAULT 0.00,
    sale_date date NOT NULL DEFAULT current_date,
    warranty_months integer NOT NULL DEFAULT 6,
    status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Revoked', 'Replaced', 'Expired')),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security for Clients and Allocations
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_allocations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
    CREATE POLICY "Users can manage own clients" ON public.clients
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own allocations" ON public.client_allocations;
    CREATE POLICY "Users can manage own allocations" ON public.client_allocations
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_user_game ON public.client_allocations (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_allocations_client ON public.client_allocations (client_id);
