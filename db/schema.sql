-- Database schema for CarWise
-- Tables: families, profiles, cars, maintenance_records, chat_messages, car_documents

-- Enable uuid-ossp for uuid generation
create extension if not exists "uuid-ossp";

-- families
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  code_family text unique not null,
  at_created timestamptz default now()
);

-- profiles (linked to auth.users via id)
create table if not exists profiles (
  id uuid primary key,
  family_id uuid references families(id) on delete set null,
  full_name text,
  email text
);

-- cars
create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  id_family uuid references families(id) on delete cascade,
  make text,
  model text,
  year int,
  plate_license text,
  mileage int,
  status text default 'active',
  insurance_expiry_date date,
  test_expiry_date date,
  last_service_date date,
  at_created timestamptz default now()
);

-- maintenance_records
create table if not exists maintenance_records (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  type text not null,
  date date not null,
  name_garage text,
  cost numeric default 0,
  notes text
);

-- chat_messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  id_family uuid references families(id) on delete cascade,
  role text not null,
  content text not null,
  at_created timestamptz default now()
);

-- car_documents
create table if not exists car_documents (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars(id) on delete cascade,
  document_type text,
  expiry_date date,
  file_url text,
  at_uploaded timestamptz default now()
);

-- Row Level Security policies
-- Assumes authenticated users have jwt with sub as user id and app metadata contains family id

-- Enable RLS on tables that should be family-scoped
alter table profiles enable row level security;
alter table families enable row level security;
alter table cars enable row level security;
alter table maintenance_records enable row level security;
alter table chat_messages enable row level security;
alter table car_documents enable row level security;

-- RLS helper: policy that allows select/insert/update/delete only when the user's family matches
-- This requires that the JWT contains `family_id` in the claims (you need to set this in Supabase auth)

-- profiles: allow user to manage their own profile (id = auth.uid())
create policy "profiles_self_manage" on profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- families: allow authenticated users to create a new family and to look up by code
create policy "families_select_authenticated" on families
  for select
  to authenticated
  using (true);

create policy "families_insert_authenticated" on families
  for insert
  to authenticated
  with check (true);

-- cars: allow access if car.id_family = current_setting('jwt.claims.family_id')::uuid
create policy "cars_family_policy" on cars
  for all
  using (id_family = current_setting('jwt.claims.family_id')::uuid)
  with check (id_family = current_setting('jwt.claims.family_id')::uuid);

-- maintenance_records: join through cars
create policy "records_family_policy" on maintenance_records
  for all
  using (
    exists (
      select 1 from cars where cars.id = maintenance_records.car_id and cars.id_family = current_setting('jwt.claims.family_id')::uuid
    )
  )
  with check (
    exists (
      select 1 from cars where cars.id = maintenance_records.car_id and cars.id_family = current_setting('jwt.claims.family_id')::uuid
    )
  );

-- chat_messages: scoped by id_family column
create policy "messages_family_policy" on chat_messages
  for all
  using (id_family = current_setting('jwt.claims.family_id')::uuid)
  with check (id_family = current_setting('jwt.claims.family_id')::uuid);

-- car_documents: verify via cars
create policy "documents_family_policy" on car_documents
  for all
  using (
    exists (
      select 1 from cars where cars.id = car_documents.car_id and cars.id_family = current_setting('jwt.claims.family_id')::uuid
    )
  )
  with check (
    exists (
      select 1 from cars where cars.id = car_documents.car_id and cars.id_family = current_setting('jwt.claims.family_id')::uuid
    )
  );

-- Note: Supabase's JWT claims must be configured to include `family_id` for these policies to work.
