alter table if exists public.certificates
  add column if not exists transaction_hash text;

create index if not exists idx_certificates_transaction_hash
  on public.certificates (transaction_hash);
