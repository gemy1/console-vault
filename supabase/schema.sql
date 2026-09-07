-- ==============================================================================
-- CONSOLE VAULT - SUPABASE DATABASE INITIALIZATION SCHEMA
-- Tech Stack: PostgreSQL (Supabase), Row Level Security (RLS), Auto-Audit Triggers
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
do $$ begin
    create type game_status as enum ('Active', 'Locked', 'In Resolution', 'Archived', 'Dead Loss');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type account_type as enum ('Primary', 'Secondary');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type contact_platform as enum ('WhatsApp', 'Telegram', 'Discord', 'Other');
exception
    when duplicate_object then null;
end $$;

-- 3. SELLERS TABLE
create table if not exists public.sellers (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    contact_platform contact_platform not null default 'WhatsApp',
    contact_link text not null, -- Phone number (with country code) or handle/URL
    reputation_score numeric(3, 1) default 5.0 check (reputation_score between 1.0 and 5.0),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. GAMES TABLE
create table if not exists public.games (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    seller_id uuid references public.sellers(id) on delete set null,
    title text not null,
    cover_image_url text,
    account_type account_type not null default 'Primary',
    status game_status not null default 'Active',
    purchase_date date not null default current_date,
    warranty_months integer not null default 6 check (warranty_months >= 0),
    -- Sensitive PSN Credential Fields (Guarded behind UI biometrics)
    psn_email text not null,
    psn_password text not null,
    backup_codes text[] default '{}'::text[],
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CREDENTIAL HISTORY TABLE (Immutable Audit Log)
create table if not exists public.credential_history (
    id uuid primary key default uuid_generate_v4(),
    game_id uuid not null references public.games(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    previous_email text not null,
    previous_password text not null,
    previous_backup_codes text[] default '{}'::text[],
    replaced_at timestamp with time zone default timezone('utc'::text, now()) not null,
    reason text default 'Seller warranty replacement'
);

-- ==============================================================================
-- 6. AUTOMATED AUDIT TRIGGER FOR CREDENTIAL REPLACEMENTS
-- Automatically archives old credentials whenever psn_email or psn_password changes
-- ==============================================================================
create or replace function public.handle_credential_replacement()
returns trigger as $$
begin
    -- Check if sensitive credentials have changed
    if (old.psn_email is distinct from new.psn_email) or 
       (old.psn_password is distinct from new.psn_password) then
        insert into public.credential_history (
            game_id, 
            user_id, 
            previous_email, 
            previous_password,
            previous_backup_codes,
            replaced_at
        ) values (
            old.id, 
            old.user_id, 
            old.psn_email, 
            old.psn_password,
            old.backup_codes,
            timezone('utc'::text, now())
        );
    end if;

    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if already exists to allow re-running
drop trigger if exists on_game_credential_update on public.games;

create trigger on_game_credential_update
    before update on public.games
    for each row
    execute function public.handle_credential_replacement();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Zero-trust isolation: users can ONLY access and mutate their own records
-- ==============================================================================
alter table public.sellers enable row level security;
alter table public.games enable row level security;
alter table public.credential_history enable row level security;

-- SELLERS POLICIES
drop policy if exists "Users can view own sellers" on public.sellers;
create policy "Users can view own sellers" on public.sellers
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own sellers" on public.sellers;
create policy "Users can insert own sellers" on public.sellers
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own sellers" on public.sellers;
create policy "Users can update own sellers" on public.sellers
    for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own sellers" on public.sellers;
create policy "Users can delete own sellers" on public.sellers
    for delete using (auth.uid() = user_id);

-- GAMES POLICIES
drop policy if exists "Users can view own games" on public.games;
create policy "Users can view own games" on public.games
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own games" on public.games;
create policy "Users can insert own games" on public.games
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own games" on public.games;
create policy "Users can update own games" on public.games
    for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own games" on public.games;
create policy "Users can delete own games" on public.games
    for delete using (auth.uid() = user_id);

-- CREDENTIAL HISTORY POLICIES
drop policy if exists "Users can view own credential history" on public.credential_history;
create policy "Users can view own credential history" on public.credential_history
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own credential history" on public.credential_history;
create policy "Users can insert own credential history" on public.credential_history
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own credential history" on public.credential_history;
create policy "Users can delete own credential history" on public.credential_history
    for delete using (auth.uid() = user_id);

-- ==============================================================================
-- 8. HIGH PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_games_user_status on public.games (user_id, status);
create index if not exists idx_games_seller on public.games (seller_id);
create index if not exists idx_games_purchase_warranty on public.games (purchase_date, warranty_months);
create index if not exists idx_credential_history_game on public.credential_history (game_id);
create index if not exists idx_sellers_user on public.sellers (user_id);

-- ==============================================================================
-- 9. HELPER VIEW: GAMES WITH WARRANTY CALCULATION
-- Provides real-time computed warranty expiration date and days remaining
-- ==============================================================================
create or replace view public.v_games_dashboard as
select 
    g.*,
    s.name as seller_name,
    s.contact_platform as seller_platform,
    s.contact_link as seller_contact,
    s.reputation_score as seller_reputation,
    (g.purchase_date + (g.warranty_months || ' months')::interval)::date as warranty_expiry_date,
    greatest(0, ((g.purchase_date + (g.warranty_months || ' months')::interval)::date - current_date)) as warranty_days_remaining,
    case 
        when ((g.purchase_date + (g.warranty_months || ' months')::interval)::date >= current_date) then true
        else false
    end as is_warranty_active
from public.games g
left join public.sellers s on g.seller_id = s.id;
