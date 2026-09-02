-- Migration: enable RLS on families and add policies to allow authenticated users to select and insert

-- Enable RLS on families
alter table families enable row level security;

-- Allow authenticated users to select families (needed to find by code)
create policy "families_select_authenticated" on families
  for select
  to authenticated
  using (true);

-- Allow authenticated users to insert new families
create policy "families_insert_authenticated" on families
  for insert
  to authenticated
  with check (true);
