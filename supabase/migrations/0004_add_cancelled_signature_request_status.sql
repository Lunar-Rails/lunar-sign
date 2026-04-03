-- Allow signature_requests.status = 'cancelled' when owner revokes signing.

alter table public.signature_requests
  drop constraint if exists signature_requests_status_check;

alter table public.signature_requests
  add constraint signature_requests_status_check
  check (status in ('pending', 'signed', 'declined', 'cancelled'));
