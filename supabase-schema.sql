-- ============================================================
--  ארנק דיגיטלי — סכימת Supabase
--  הריצו קובץ זה ב־Supabase SQL Editor
-- ============================================================

-- טבלת כרטיסים
create table if not exists public.cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null default 'membership',   -- id | license | membership | credit | transit | health | other
  title        text not null,
  issuer       text,
  holder_name  text,
  card_number  text,
  barcode_data text,
  barcode_format text default 'CODE128',             -- CODE128 | EAN13 | QR
  front_color  text default '#595f63',
  image_data   text,                                 -- תמונת חזית הכרטיס לאחר צילום וחיתוך (data URL)
  image_back_data text,                               -- תמונת גב הכרטיס לאחר צילום וחיתוך (data URL)
  details      jsonb not null default '{}'::jsonb,    -- שדות ייעודיים (ת.ז, רשיון וכו')
  notes        text,
  is_favorite  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);

-- אם הטבלה כבר קיימת מגרסה קודמת — הוסיפו את עמודות התמונה:
alter table public.cards add column if not exists image_data text;
alter table public.cards add column if not exists image_back_data text;

-- עדכון אוטומטי של updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ============================================================
--  אבטחת שורות (RLS) — כל משתמש רואה רק את הכרטיסים שלו
-- ============================================================
alter table public.cards enable row level security;

drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own" on public.cards
  for select using (auth.uid() = user_id);

drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own" on public.cards
  for insert with check (auth.uid() = user_id);

drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own" on public.cards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cards_delete_own" on public.cards;
create policy "cards_delete_own" on public.cards
  for delete using (auth.uid() = user_id);
