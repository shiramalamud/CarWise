-- Migration: replace jwt.claims.family_id usage with profiles lookup (auth.uid())
-- Run these statements in Supabase SQL editor to update RLS policies

-- Cars policy
DROP POLICY IF EXISTS "cars_family_policy" ON cars;
CREATE POLICY "cars_family_policy" ON cars
  FOR ALL
  USING (id_family = (select family_id from profiles where id = auth.uid()))
  WITH CHECK (id_family = (select family_id from profiles where id = auth.uid()));

-- Maintenance records policy
DROP POLICY IF EXISTS "records_family_policy" ON maintenance_records;
CREATE POLICY "records_family_policy" ON maintenance_records
  FOR ALL
  USING (
    exists (
      select 1 from cars where cars.id = maintenance_records.car_id and cars.id_family = (select family_id from profiles where id = auth.uid())
    )
  )
  WITH CHECK (
    exists (
      select 1 from cars where cars.id = maintenance_records.car_id and cars.id_family = (select family_id from profiles where id = auth.uid())
    )
  );

-- Chat messages policy
DROP POLICY IF EXISTS "messages_family_policy" ON chat_messages;
CREATE POLICY "messages_family_policy" ON chat_messages
  FOR ALL
  USING (id_family = (select family_id from profiles where id = auth.uid()))
  WITH CHECK (id_family = (select family_id from profiles where id = auth.uid()));

-- Car documents policy
DROP POLICY IF EXISTS "documents_family_policy" ON car_documents;
CREATE POLICY "documents_family_policy" ON car_documents
  FOR ALL
  USING (
    exists (
      select 1 from cars where cars.id = car_documents.car_id and cars.id_family = (select family_id from profiles where id = auth.uid())
    )
  )
  WITH CHECK (
    exists (
      select 1 from cars where cars.id = car_documents.car_id and cars.id_family = (select family_id from profiles where id = auth.uid())
    )
  );
