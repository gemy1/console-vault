-- ==============================================================================
-- CONSOLE VAULT - OPTIONAL SEED DATA FOR TESTING
-- Note: Replace '00000000-0000-0000-0000-000000000000' with your actual Supabase auth.users ID
-- or run this after signing up your first user in the app.
-- ==============================================================================

do $$
declare
    v_user_id uuid;
    v_seller_1 uuid;
    v_seller_2 uuid;
begin
    -- Grab the first registered user ID, or replace with your test user ID
    select id into v_user_id from auth.users limit 1;

    if v_user_id is not null then
        -- Insert Test Sellers
        insert into public.sellers (user_id, name, contact_platform, contact_link, reputation_score, notes)
        values 
            (v_user_id, 'PSN Master Store', 'WhatsApp', '+12025550192', 4.9, 'Fast replacement on warranty claims'),
            (v_user_id, 'Digital Vault Keys', 'Telegram', 'digitalvault_support', 4.2, 'Requires order invoice screenshot')
        returning id into v_seller_1;

        select id into v_seller_2 from public.sellers where user_id = v_user_id and contact_platform = 'Telegram' limit 1;

        -- Insert Test Games
        insert into public.games (
            user_id, seller_id, title, cover_image_url, account_type, status,
            purchase_date, warranty_months, psn_email, psn_password, backup_codes
        ) values 
            (
                v_user_id, 
                v_seller_1, 
                'Marvel''s Spider-Man 2', 
                'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c7b75d8ed9271516546560d219ad0b22ee0a263b4537bd8.png', 
                'Primary', 
                'Active', 
                current_date - interval '30 days', 
                12, 
                'spidey.vault.buyer@gmail.com', 
                'WebSlinger#2024!', 
                array['12345678', '87654321']
            ),
            (
                v_user_id, 
                v_seller_1, 
                'God of War Ragnarök', 
                'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png', 
                'Secondary', 
                'Locked', 
                current_date - interval '60 days', 
                6, 
                'kratos.norse.games@gmail.com', 
                'BoyLeviathan#99', 
                array['44556677']
            ),
            (
                v_user_id, 
                v_seller_2, 
                'Elden Ring: Shadow of the Erdtree', 
                'https://image.api.playstation.com/vulcan/ap/rnd/202402/1911/c90e66bc28c9b357608ce0eaecadbeae9e29f8f41399ea5c.png', 
                'Primary', 
                'Active', 
                current_date - interval '10 days', 
                6, 
                'tarnished.erdtree@outlook.com', 
                'GraceFound#777', 
                array['99887766']
            );

        raise notice 'Seed data inserted successfully for user %', v_user_id;
    else
        raise notice 'No user found in auth.users. Sign up a user first, then re-run seed.sql!';
    end if;
end $$;
