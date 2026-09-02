
-- PostgreSQL does not support "IF EXISTS" on the RENAME COLUMN clause.
-- Use the plain form below when running in the Supabase SQL editor.

alter table profiles rename column id_family to family_id;
alter table profiles rename column name_full to full_name;

-- Update any dependent objects (policies/views) manually if needed.
