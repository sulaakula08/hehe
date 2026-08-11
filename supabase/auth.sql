-- ─────────────────────────────────────────────────────────────────────────
-- funymems.cc — регистрация по почте.
-- Выполнить в Supabase → SQL Editor ПОСЛЕ schema.sql. Скрипт идемпотентный.
--
-- Сами аккаунты (почта, пароль, подтверждение) Supabase хранит у себя,
-- в схеме auth. Трогать её нельзя, поэтому всё своё — имя, телефон,
-- контакты для доставки — держим в отдельной таблице profiles,
-- связанной с auth.users один к одному.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  -- id тот же, что у аккаунта: одна строка на пользователя, без дублей.
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  phone      text,
  whatsapp   text,
  telegram   text,
  city       text,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── профиль заводится сам при регистрации ─────────────────────────────
-- Иначе после подтверждения почты человек остался бы без строки в profiles,
-- и первый же запрос вернул бы пусто.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    -- Имя берём из метаданных формы регистрации, иначе из почты до «@».
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;   -- повторный вызов ничего не сломает
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS: каждый видит только свой профиль ─────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles: читать своё"   on public.profiles;
drop policy if exists "profiles: менять своё"   on public.profiles;
drop policy if exists "profiles: создавать своё" on public.profiles;

create policy "profiles: читать своё"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: менять своё"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Строку создаёт триггер, но политика нужна на случай ручной вставки
-- из клиента — чужой id вставить всё равно не дадут.
create policy "profiles: создавать своё"
  on public.profiles for insert with check (auth.uid() = id);

-- ── связь заказов с аккаунтом ─────────────────────────────────────────
-- В schema.sql orders.user_id ссылается на свою таблицу users. Раз появилась
-- настоящая авторизация, привязываем заказы к ней и разрешаем человеку
-- видеть свои заказы. Заказы без user_id (оформленные без входа) остаются
-- доступными только по секретной ссылке.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'orders_user_id_fkey' and table_name = 'orders'
  ) then
    alter table public.orders drop constraint orders_user_id_fkey;
  end if;
end $$;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

drop policy if exists "orders: читать свои" on public.orders;
create policy "orders: читать свои"
  on public.orders for select using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "order_items: читать свои" on public.order_items;
create policy "order_items: читать свои"
  on public.order_items for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and auth.uid() is not null
        and o.user_id = auth.uid()
    )
  );

-- Писать заказы по-прежнему может только backend под service_role:
-- политик insert/update тут намеренно нет, иначе сумму и статус оплаты
-- можно было бы подделать из браузера.
