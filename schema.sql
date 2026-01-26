-- Database Schema for Meeting Room Booking System

-- 1. Profiles Table (Extends Supabase Auth)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  full_name text null,
  role text not null check (role in ('user', 'admin')) default 'user',
  department text null,
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- 2. Rooms Table
create table public.rooms (
  id bigint generated always as identity primary key,
  name text not null,
  capacity int not null,
  facilities text[] null,
  is_vip boolean default false,
  status text check (status in ('active', 'maintenance')) default 'active',
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "Rooms are viewable by everyone."
  on public.rooms for select
  using ( true );

create policy "Admins can insert rooms."
  on public.rooms for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update rooms."
  on public.rooms for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete rooms."
  on public.rooms for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Bookings Table
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id bigint references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text check (status in ('confirmed', 'pending', 'checked-in', 'cancelled')) default 'confirmed',
  created_at timestamptz default now(),
  constraint valid_time_range check (end_time > start_time)
);

alter table public.bookings enable row level security;

create policy "Users can view all bookings."
  on public.bookings for select
  using ( true );

create policy "Users can insert their own bookings."
  on public.bookings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own bookings."
  on public.bookings for update
  using ( auth.uid() = user_id );

create policy "Admins can do everything on bookings."
  on public.bookings for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. RPC Function to Check Availability (Prevent Double Booking)
create or replace function check_availability(
  p_room_id bigint,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns boolean
language plpgsql
as $$
declare
  overlap_count int;
begin
  select count(*)
  into overlap_count
  from public.bookings
  where room_id = p_room_id
    and status not in ('cancelled')
    and (
      (start_time < p_end_time) and (end_time > p_start_time)
    );

  return overlap_count = 0;
end;
$$;
