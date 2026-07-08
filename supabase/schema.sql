-- Run this once in the Supabase SQL editor for your project.
-- It creates persistent, cloud-only storage for candidate records.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  original_url text,
  file_name text,
  storage_file_name text,
  mime_type text,
  status text not null default 'PENDING',
  extracted_data text,
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidates_created_at_idx on public.candidates (created_at desc);

-- The app talks to Postgres only through the service-role key (server-side),
-- so RLS stays enabled with no public policies -- no anon/browser access.
alter table public.candidates enable row level security;

-- Create a private storage bucket for the uploaded CV files.
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;
