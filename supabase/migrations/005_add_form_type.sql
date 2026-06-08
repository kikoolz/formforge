alter table public.forms
  add column form_type text default 'pdf_overlay' not null
  check (form_type in ('pdf_overlay', 'web_form'));
