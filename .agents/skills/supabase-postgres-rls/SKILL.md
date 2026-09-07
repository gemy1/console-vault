---
name: supabase-postgres-rls
description: >-
  Database design, Row Level Security (RLS) policies, triggers, and migrations for Supabase in Console Vault. Use when designing schemas, writing SQL migrations, creating security policies, or setting up automated credential history triggers.
---

# Skill: Supabase PostgreSQL & Row Level Security (RLS)

This skill provides the production database schema, automated credential audit triggers, and strict RLS policies for **Console Vault**.

---

## 1. Production Database Schema

Run this migration in your Supabase SQL editor or via Supabase CLI migration:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Sellers Table
create table public.sellers (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    contact_platform text not null check (contact_platform in ('WhatsApp', 'Telegram', 'Discord', 'Other')),
    contact_link text not null,
    reputation_score numeric(3, 1) default 5.0 check (reputation_score between 1.0 and 5.0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Games Table
create type game_status as enum ('Active', 'Locked', 'In Resolution', 'Archived', 'Dead Loss');
create type account_type as enum ('Primary', 'Secondary');

create table public.games (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    seller_id uuid references public.sellers(id) on delete set null,
    title text not null,
    cover_image_url text,
    account_type account_type not null default 'Primary',
    status game_status not null default 'Active',
    purchase_date date not null default current_date,
    warranty_months integer not null default 6,
    -- Sensitive credential fields
    psn_email text not null,
    psn_password text not null,
    backup_codes text[], -- Array of 2FA backup codes
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Credential History Table (Audit Log for replacements)
create table public.credential_history (
    id uuid primary key default uuid_generate_v4(),
    game_id uuid not null references public.games(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    previous_email text not null,
    previous_password text not null,
    replaced_at timestamp with time zone default timezone('utc'::text, now()) not null,
    reason text default 'Seller warranty replacement'
);
```

---

## 2. Automated Credential Archive Trigger

Whenever a user updates `psn_email` or `psn_password`, PostgreSQL automatically saves the previous credentials to `credential_history`:

```sql
create or replace function public.handle_credential_replacement()
returns trigger as $$
begin
    if (old.psn_email is distinct from new.psn_email) or 
       (old.psn_password is distinct from new.psn_password) then
        insert into public.credential_history (game_id, user_id, previous_email, previous_password)
        values (old.id, old.user_id, old.psn_email, old.psn_password);
    end if;
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

create trigger on_game_credential_update
    before update on public.games
    for each row
    execute function public.handle_credential_replacement();
```

---

## 3. Strict Row Level Security (RLS) Policies

Every user can strictly only read and modify their own records:

```sql
-- Enable RLS on all tables
alter table public.sellers enable row level security;
alter table public.games enable row level security;
alter table public.credential_history enable row level security;

-- SELLERS POLICIES
create policy "Users can view own sellers" on public.sellers
    for select using (auth.uid() = user_id);
create policy "Users can insert own sellers" on public.sellers
    for insert with check (auth.uid() = user_id);
create policy "Users can update own sellers" on public.sellers
    for update using (auth.uid() = user_id);
create policy "Users can delete own sellers" on public.sellers
    for delete using (auth.uid() = user_id);

-- GAMES POLICIES
create policy "Users can view own games" on public.games
    for select using (auth.uid() = user_id);
create policy "Users can insert own games" on public.games
    for insert with check (auth.uid() = user_id);
create policy "Users can update own games" on public.games
    for update using (auth.uid() = user_id);
create policy "Users can delete own games" on public.games
    for delete using (auth.uid() = user_id);

-- CREDENTIAL HISTORY POLICIES
create policy "Users can view own credential history" on public.credential_history
    for select using (auth.uid() = user_id);
create policy "Users can insert own credential history" on public.credential_history
    for insert with check (auth.uid() = user_id);
```

---

## 4. Performance Indexes

```sql
create index idx_games_user_status on public.games (user_id, status);
create index idx_games_seller on public.games (seller_id);
create index idx_credential_history_game on public.credential_history (game_id);
```
