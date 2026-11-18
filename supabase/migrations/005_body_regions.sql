-- Create body_regions table
create table if not exists public.body_regions (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.body_regions enable row level security;

create policy "Enable read access for all authenticated users" on public.body_regions
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on public.body_regions
  for insert with check (auth.role() = 'authenticated');

-- Insert common physiotherapy regions
insert into public.body_regions (name) values
  ('Knee'),
  ('Spine (Cervical)'),
  ('Spine (Thoracic)'),
  ('Spine (Lumbar)'),
  ('Shoulder'),
  ('Hip'),
  ('Ankle'),
  ('Neck'),
  ('Elbow'),
  ('Wrist'),
  ('Hand / Fingers'),
  ('Foot / Toes'),
  ('Pelvis / SIJ'),
  ('Multi-region')
on conflict (name) do nothing;
