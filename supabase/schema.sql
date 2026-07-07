-- ILAAMA Music Player — Supabase Storage Setup
-- Run in Supabase Dashboard → SQL Editor

-- Private bucket (no public access; no SELECT policies for anon/authenticated)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ilaama-tracks',
  'ilaama-tracks',
  false,
  104857600,
  array['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/flac']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Upload audio via Dashboard → Storage → ilaama-tracks
-- Example: I mean hello.wav
