create type condition_operator as enum (
  'equals', 'not_equals', 'contains',
  'greater_than', 'less_than',
  'is_empty', 'is_not_empty'
);

create type logic_action as enum ('show', 'hide', 'require', 'make_readonly');

create table public.form_conditions (
  id uuid default gen_random_uuid() primary key,
  form_id uuid references public.forms(id) on delete cascade not null,
  target_field_id uuid references public.form_fields(id) on delete cascade not null,
  action logic_action default 'show' not null,
  operator condition_operator default 'equals' not null,
  source_field_id uuid references public.form_fields(id) on delete cascade not null,
  value text not null,
  created_at timestamptz default now() not null
);

alter table public.form_conditions enable row level security;

create policy "Users can manage conditions of own forms"
  on public.form_conditions for all
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_conditions.form_id
      and forms.user_id = auth.uid()
    )
  );

create policy "Public can view conditions of published forms"
  on public.form_conditions for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_conditions.form_id
      and forms.is_published = true
    )
  );
