-- ==========================================================================
-- SETUP DATABASE SUPABASE UNTUK POS (jalankan sekali di SQL Editor Supabase)
-- ==========================================================================

-- Data utama (menu, transaksi, stok, pengaturan, dll). Satu baris per kunci.
create table if not exists public.kv_store (
  key        text primary key,
  value      text not null,
  client_id  text,
  updated_at timestamptz not null default now()
);

-- Data yang ditambah banyak orang sekaligus (pesanan online, ulasan).
-- Satu baris per item supaya tidak saling menimpa.
create table if not exists public.kv_items (
  key        text not null,
  item_id    text not null,
  value      text not null,
  client_id  text,
  created_at timestamptz not null default now(),
  primary key (key, item_id)
);

create index if not exists kv_store_updated_idx on public.kv_store (updated_at);
create index if not exists kv_items_created_idx on public.kv_items (created_at);

-- Waktu update selalu diisi server (bukan jam perangkat).
create or replace function public.kv_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists kv_store_touch on public.kv_store;
create trigger kv_store_touch before insert or update on public.kv_store
for each row execute function public.kv_touch();

-- Hak akses. Aplikasi ini belum punya login server, jadi role "anon"
-- (key publik) diberi akses baca/tulis. Cukup untuk tugas & demo.
alter table public.kv_store enable row level security;
alter table public.kv_items enable row level security;

drop policy if exists "kv_store anon all" on public.kv_store;
create policy "kv_store anon all" on public.kv_store
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kv_items anon read" on public.kv_items;
create policy "kv_items anon read" on public.kv_items
  for select to anon, authenticated using (true);

drop policy if exists "kv_items anon insert" on public.kv_items;
create policy "kv_items anon insert" on public.kv_items
  for insert to anon, authenticated with check (true);

grant select, insert, update, delete on public.kv_store to anon, authenticated;
grant select, insert on public.kv_items to anon, authenticated;

-- Aktifkan Realtime untuk kedua tabel.
do $$
begin
  begin
    alter publication supabase_realtime add table public.kv_store;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.kv_items;
  exception when duplicate_object then null;
  end;
end $$;

-- (Opsional) Hapus semua data untuk mulai dari awal:
-- truncate public.kv_store, public.kv_items;
