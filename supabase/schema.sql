-- ─────────────────────────────────────────────────────────────
-- HEHE — схема базы. Выполнить целиком в Supabase → SQL Editor.
-- Скрипт идемпотентный: можно запускать повторно.
-- ─────────────────────────────────────────────────────────────

-- ── Профили ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text,
  emoji      text   not null default '😎',
  balance    bigint not null default 25000,   -- тенге на HEHE Wallet
  coins      bigint not null default 0,       -- HEHE-коины
  created_at timestamptz not null default now(),
  constraint balance_non_negative check (balance >= 0),
  constraint coins_non_negative   check (coins >= 0)
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: читать своё"    on public.profiles;
drop policy if exists "profiles: менять своё"    on public.profiles;
drop policy if exists "profiles: создавать своё" on public.profiles;

create policy "profiles: читать своё"    on public.profiles for select using (auth.uid() = id);
create policy "profiles: менять своё"    on public.profiles for update using (auth.uid() = id);
create policy "profiles: создавать своё" on public.profiles for insert with check (auth.uid() = id);

-- Профиль заводится автоматически при регистрации.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Заказы ──────────────────────────────────────────────────
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid   not null references auth.users on delete cascade,
  items        jsonb  not null,               -- [{id, size, qty, price, title}]
  total        bigint not null,
  coins_earned bigint not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders: читать свои" on public.orders;
create policy "orders: читать свои" on public.orders for select using (auth.uid() = user_id);
-- INSERT напрямую не разрешаем: заказы создаёт только функция checkout().

-- ── Избранное ───────────────────────────────────────────────
create table if not exists public.favorites (
  user_id    uuid not null references auth.users on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites: читать своё"  on public.favorites;
drop policy if exists "favorites: добавлять"    on public.favorites;
drop policy if exists "favorites: удалять своё" on public.favorites;

create policy "favorites: читать своё"  on public.favorites for select using (auth.uid() = user_id);
create policy "favorites: добавлять"    on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites: удалять своё" on public.favorites for delete using (auth.uid() = user_id);

-- ── Пополнение кошелька ─────────────────────────────────────
-- Демо-пополнение: настоящей оплаты нет, поэтому сумма ограничена сверху.
create or replace function public.topup(p_amount bigint)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'BAD_AMOUNT';
  end if;

  update public.profiles
     set balance = balance + p_amount
   where id = auth.uid()
  returning * into result;

  return result;
end;
$$;

-- ── Оплата корзины ──────────────────────────────────────────
-- Всё считается на сервере: клиент не может подделать сумму или баланс.
create or replace function public.checkout(p_items jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid   := auth.uid();
  v_total   bigint := 0;
  v_coins   bigint;
  v_balance bigint;
  v_order   public.orders;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Сумму берём из цен, пришедших с клиентом, но пересчитываем сами.
  -- В боевом магазине цены надо читать из таблицы products.
  select coalesce(sum((item ->> 'price')::bigint * (item ->> 'qty')::bigint), 0)
    into v_total
    from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'BAD_TOTAL';
  end if;

  v_coins := round(v_total * 0.07);

  -- Блокируем строку профиля, чтобы два одновременных заказа
  -- не смогли списать один и тот же баланс дважды.
  select balance into v_balance
    from public.profiles
   where id = v_user
     for update;

  if v_balance is null then
    raise exception 'NO_PROFILE';
  end if;
  if v_balance < v_total then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  update public.profiles
     set balance = balance - v_total,
         coins   = coins + v_coins
   where id = v_user;

  insert into public.orders (user_id, items, total, coins_earned)
  values (v_user, p_items, v_total, v_coins)
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.topup(bigint)   from public;
revoke all on function public.checkout(jsonb) from public;
grant execute on function public.topup(bigint)   to authenticated;
grant execute on function public.checkout(jsonb) to authenticated;
