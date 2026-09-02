-- Migration: rename tables and columns to match CLAUDE.md naming
-- Run this in Supabase SQL editor

-- Rename tables
alter table if exists records_maintenance rename to maintenance_records;
alter table if exists messages_chat rename to chat_messages;
alter table if exists documents_car rename to car_documents;

-- Rename columns referencing cars
-- maintenance_records: id_car -> car_id
alter table if exists maintenance_records rename column if exists id_car to car_id;

-- car_documents: id_car -> car_id
alter table if exists car_documents rename column if exists id_car to car_id;

-- If you have any functions, views, or policies referencing the old names, update them accordingly.
