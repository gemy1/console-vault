-- ==============================================================================
-- CONSOLE VAULT - SCHEMA SYNCHRONIZATION MIGRATION PATCH
-- Run this in your Supabase Dashboard -> SQL Editor to bring Supabase into
-- 100% synchronization with the local SQLite & TypeScript schema.
-- ==============================================================================

-- 1. ADD MISSING COLUMNS TO 'GAMES' TABLE
ALTER TABLE public.games 
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'PS5',
  ADD COLUMN IF NOT EXISTS cost_price numeric(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS is_inventory boolean DEFAULT false;

-- 2. ADD 'FULL' ACCOUNT TYPE ENUM (if not already added)
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'Full';

-- 3. ADD CONTACT_METHODS TO SELLERS (if not already added)
ALTER TABLE public.sellers 
  ADD COLUMN IF NOT EXISTS contact_methods jsonb DEFAULT '[]'::jsonb;

-- 4. ENSURE CLIENTS TABLE EXISTS
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

-- 5. ENSURE CLIENT ALLOCATIONS TABLE EXISTS & HAS ALL COLUMNS
CREATE TABLE IF NOT EXISTS public.client_allocations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    slot_type text NOT NULL DEFAULT 'Primary',
    sale_price numeric(10, 2) DEFAULT 0.00,
    currency text NOT NULL DEFAULT 'USD',
    sale_date date NOT NULL DEFAULT current_date,
    warranty_months integer NOT NULL DEFAULT 6,
    status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Revoked', 'Replaced', 'Expired')),
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ADD MISSING CURRENCY COLUMN TO 'CLIENT_ALLOCATIONS' (if table already existed)
ALTER TABLE public.client_allocations 
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- 7. CONVERT 'SLOT_TYPE' FROM ENUM TO TEXT IN 'CLIENT_ALLOCATIONS'
-- Allows flexible slot types: 'Primary_PS5', 'Primary_PS4', 'Secondary_PS5', 'Secondary_PS4', etc.
ALTER TABLE public.client_allocations 
  ALTER COLUMN slot_type TYPE text USING slot_type::text;

-- 8. ROW LEVEL SECURITY POLICIES
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

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_games_platform ON public.games (platform);
CREATE INDEX IF NOT EXISTS idx_games_is_inventory ON public.games (is_inventory);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_user_game ON public.client_allocations (user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_allocations_client ON public.client_allocations (client_id);
