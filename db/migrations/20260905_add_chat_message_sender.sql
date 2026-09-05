
-- Recommended follow-up (not yet applied — run manually in the Supabase SQL
-- editor, same as the other files in this folder): chat_messages currently
-- has no column identifying which family member sent a given "user" row, so
-- a shared family chat thread can never attribute a past message to a real
-- person. Once this is applied, app/api/chat/route.ts can label each history
-- line with the actual sender's name instead of the generic "a family
-- member" placeholder it currently uses.

alter table chat_messages add column if not exists sender_id uuid references profiles(id) on delete set null;
alter table chat_messages add column if not exists sender_name text;

-- Existing rows predate this column and will have sender_id/sender_name
-- null — the app already treats a null sender_name as "unattributed" and
-- must keep doing so for these rows.
