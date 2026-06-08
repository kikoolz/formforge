-- =============================================
-- ENUMS
-- =============================================
create type plan_type as enum ('free', 'solo', 'professional', 'team');
create type form_status as enum ('processing', 'ready', 'error');
create type field_type as enum (
  'text', 'email', 'phone', 'date', 'number',
  'textarea', 'checkbox', 'radio', 'select', 'signature', 'file'
);

-- =============================================
-- USERS TABLE
-- extends Supabase's built-in auth.users
-- =============================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  plan plan_type default 'free' not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  submission_count integer default 0 not null,
  submission_limit integer default 10 not null,
  form_count integer default 0 not null,
  form_limit integer default 3 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- =============================================
-- FORMS TABLE
-- =============================================
create table public.forms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  original_pdf_url text,
  status form_status default 'processing' not null,
  is_published boolean default false not null,
  public_slug text unique not null,
  branding_color text default '#6366F1',
  logo_url text,
  redirect_url text,
  notification_email text,
  submission_count integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- =============================================
-- FORM FIELDS TABLE
-- =============================================
create table public.form_fields (
  id uuid default gen_random_uuid() primary key,
  form_id uuid references public.forms(id) on delete cascade not null,
  label text not null,
  field_type field_type default 'text' not null,
  placeholder text,
  required boolean default false not null,
  options jsonb,         -- for radio and select fields: ["Option A", "Option B"]
  position integer default 0 not null,
  page integer default 1 not null,
  created_at timestamptz default now() not null
);

-- =============================================
-- SUBMISSIONS TABLE
-- =============================================
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  form_id uuid references public.forms(id) on delete cascade not null,
  respondent_email text,
  data jsonb not null,   -- { "Full Name": "John Smith", "Date": "2026-01-01" }
  pdf_url text,
  ip_address text,
  submitted_at timestamptz default now() not null
);

-- =============================================
-- ROW LEVEL SECURITY — USERS
-- =============================================
alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- =============================================
-- ROW LEVEL SECURITY — FORMS
-- =============================================
alter table public.forms enable row level security;

create policy "Users can view own forms"
  on public.forms for select
  using (auth.uid() = user_id);

create policy "Users can insert own forms"
  on public.forms for insert
  with check (auth.uid() = user_id);

create policy "Users can update own forms"
  on public.forms for update
  using (auth.uid() = user_id);

create policy "Users can delete own forms"
  on public.forms for delete
  using (auth.uid() = user_id);

-- Public can view published forms (for /f/[slug] page)
create policy "Public can view published forms"
  on public.forms for select
  using (is_published = true);

-- =============================================
-- ROW LEVEL SECURITY — FORM FIELDS
-- =============================================
alter table public.form_fields enable row level security;

create policy "Users can manage fields of own forms"
  on public.form_fields for all
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_fields.form_id
      and forms.user_id = auth.uid()
    )
  );

-- Public can view fields of published forms
create policy "Public can view fields of published forms"
  on public.form_fields for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_fields.form_id
      and forms.is_published = true
    )
  );

-- =============================================
-- ROW LEVEL SECURITY — SUBMISSIONS
-- =============================================
alter table public.submissions enable row level security;

-- Form owners can view their submissions
create policy "Form owners can view submissions"
  on public.submissions for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = submissions.form_id
      and forms.user_id = auth.uid()
    )
  );

-- Anyone can submit to a published form
create policy "Anyone can submit to published forms"
  on public.submissions for insert
  with check (
    exists (
      select 1 from public.forms
      where forms.id = submissions.form_id
      and forms.is_published = true
    )
  );

-- Form owners can delete submissions
create policy "Form owners can delete submissions"
  on public.submissions for delete
  using (
    exists (
      select 1 from public.forms
      where forms.id = submissions.form_id
      and forms.user_id = auth.uid()
    )
  );

-- =============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- AUTO-UPDATE updated_at TIMESTAMPS
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure update_updated_at();

create trigger update_forms_updated_at
  before update on public.forms
  for each row execute procedure update_updated_at();
