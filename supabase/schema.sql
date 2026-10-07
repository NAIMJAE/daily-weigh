-- =========================================================
-- Daily Weigh (매일재라) Supabase 전체 스키마 & 정책 (SQL Editor 실행용)
-- 마지막 업데이트: Supabase 연동 완료본
-- =========================================================

-- 1. 사용자 프로필 테이블 (auth.users와 1:1 매핑)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  nickname text not null,
  avatar_url text,
  height numeric(5, 1),
  start_weight numeric(5, 2),
  target_weight numeric(5, 2),
  created_at timestamp with time zone default now()
);

-- 2. 그룹 테이블
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  penalty_rule text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- 3. 그룹 멤버십 테이블
create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- 'owner' | 'member'
  streak_days integer default 0,
  weekly_points integer default 0,
  joined_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

-- 4. 데일리 기록 테이블 (모듈형: 체중, 눈바디, 운동 중 최소 1개 이상)
create table if not exists public.daily_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  record_date date not null default current_date,
  weight numeric(5, 2),
  photo_url text,
  workout_tags text[],
  workout_minutes integer,
  memo text,
  points_earned integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, group_id, record_date),
  constraint at_least_one_check check (
    weight is not null or photo_url is not null or workout_tags is not null or memo is not null
  )
);

-- 5. 친구 찌르기 & 독설 로그 테이블
--    ⚠️  테이블명은 'pokes' (poke_messages 아님)
create table if not exists public.pokes (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  record_id uuid references public.daily_records(id) on delete cascade,
  message text not null,
  created_at timestamp with time zone default now()
);

-- =========================================================
-- 신규 가입 시 자동으로 profiles 레코드 생성하는 trigger
-- (Supabase Dashboard > Authentication > Confirm Email: OFF 필수)
-- =========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- trigger가 이미 있으면 삭제 후 재생성
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- RLS (Row Level Security) 설정
-- =========================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.daily_records enable row level security;
alter table public.pokes enable row level security;

-- 방장 여부 판별 헬퍼 함수 (RLS 무한 재귀 방지)
create or replace function public.is_group_owner(check_group_id uuid, check_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members
    where group_id = check_group_id
      and user_id = check_user_id
      and role = 'owner'
  );
end;
$$ language plpgsql security definer;

-- Profiles: 누구나 조회 가능, 본인 레코드만 수정
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Groups: 가입 멤버 또는 초대 코드로 조회 가능
create policy "Groups viewable by everyone" on public.groups
  for select using (true);

create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.role() = 'authenticated');

-- Group Members: 누구나 조회 가능, 가입/수정/삭제 정책
create policy "Members can view members of all groups" on public.group_members
  for select using (true);

create policy "Users can join groups" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "Users and owners can update group members" on public.group_members
  for update using (
    auth.uid() = user_id or public.is_group_owner(group_id, auth.uid())
  );

create policy "Users and owners can delete group members" on public.group_members
  for delete using (
    auth.uid() = user_id or public.is_group_owner(group_id, auth.uid())
  );

-- Daily Records: 동일 그룹 내 열람 및 본인/방장 관리
create policy "Daily records viewable by everyone" on public.daily_records
  for select using (true);

create policy "Users can insert own daily records" on public.daily_records
  for insert with check (auth.uid() = user_id);

create policy "Users can update own daily records" on public.daily_records
  for update using (auth.uid() = user_id);

create policy "Users and owners can delete daily records" on public.daily_records
  for delete using (
    auth.uid() = user_id or public.is_group_owner(group_id, auth.uid())
  );

-- Pokes: 그룹 내 열람 및 전송/삭제
create policy "Pokes viewable by everyone" on public.pokes
  for select using (true);

create policy "Authenticated users can send pokes" on public.pokes
  for insert with check (auth.uid() = sender_id);

create policy "Users and owners can delete pokes" on public.pokes
  for delete using (
    auth.uid() = sender_id or auth.uid() = receiver_id or public.is_group_owner(group_id, auth.uid())
  );

-- =========================================================
-- Storage (눈바디 사진 저장 버킷)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', true)
on conflict (id) do nothing;

create policy "Public Access to Body Photos" on storage.objects
  for select using (bucket_id = 'body-photos');

create policy "Authenticated users can upload Body Photos" on storage.objects
  for insert with check (bucket_id = 'body-photos' and auth.role() = 'authenticated');

create policy "Users can update their own Body Photos" on storage.objects
  for update using (bucket_id = 'body-photos' and auth.uid()::text = (storage.foldername(name))[1]);
