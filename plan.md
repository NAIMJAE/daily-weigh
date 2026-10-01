# 📱 서비스 기획 및 설계서: Daily Weigh (매일재라)

> **"매일 재고, 매일 자극받아 살 뺀다!"**  
> 친구들과 그룹을 만들어 체중, 눈바디 사진, 운동 중 **원하는 것 딱 1개만 올려도 출석 인정!**  
> 부담 없이 시작하고, 친구들과 겹쳐보는 체중 변화 그래프와 주간 열정 랭킹, 매콤한 독설(Tough Love)로 함께 완주하는 친목형 다이어트 웹 서비스

---

## 1. 회원가입 & 인증 시스템 (초간단 5초 가입/로그인)

복잡한 이메일 인증 절차 없이, 모바일/웹에서 5초 만에 가입하고 바로 체중계에 올라갈 수 있는 초간단 인증 체계를 구축합니다.

### 1.1 입력 필드
* **아이디 (Username)**: 영문/숫자 4~20자 (중복 불가)
* **닉네임 (Nickname)**: 한글/영문 2~10자 (그룹 내 표시용)
* **비밀번호 (Password)**: 6자 이상

### 1.2 Supabase 연동 아키텍처
* **가상 이메일(Virtual Email) 매핑**:  
  사용자에게는 이메일을 묻지 않고, 백엔드에서 `{username}@dailyweigh.local` 형태로 `auth.signUp` / `auth.signInWithPassword` 호출
* **이메일 컨펌 비활성화**:  
  Supabase 대시보드에서 `Confirm Email` 옵션을 꺼서 가입 즉시 토큰 발급 및 자동 로그인 처리
* **`profiles` 테이블 자동 연동**:  
  `auth.users`와 1:1 매핑되는 프로필 테이블 생성 (`username`, `nickname`, `target_weight`, `start_weight` 등)

---

## 2. 그룹(Group) 시스템 및 초대 메커니즘

체중과 눈바디 사진은 민감한 개인정보이므로, **승인된 친구들끼리의 폐쇄형 그룹** 단위로 피드와 리더보드를 공유합니다.

### 2.1 그룹 생성 및 참여 흐름
1. **그룹 생성 (Host)**
   * 그룹명 입력 (예: "30일 안에 -5kg 방", "동창회 다이어트단")
   * 벌칙 규칙 설정 (예: "주간 꼴찌가 단톡방 커피 쏘기")
   * 고유 초대 코드 자동 발급 (예: `DW-8K2M1P` 및 8자리 NanoID)
2. **원클릭 초대 링크 공유 (Invite Link)**
   * `https://dailyweigh.app/invite/{invite_code}` 링크 복사/공유
3. **초대 수락 및 간편 입장**
   * 링크 접속 시 그룹명 및 현재 참여 중인 친구 목록 미리보기
   * 로그인 회원은 **[그룹 참여하기]** 버튼 클릭 즉시 멤버 등록
   * 비회원은 초간단 가입 후 해당 그룹으로 자동 합류
4. **데이터 프라이버시 격리**
   * 모든 체중 기록, 눈바디 사진, 운동 기록은 해당 그룹 멤버들에게만 열람 허용 (Supabase RLS)

---

## 3. 부담 없는 데일리 기록 UX (Zero-Friction Logging)

> **핵심 철학: "전부 다 쓸 필요 없습니다. 딱 1개만 올려도 성공!"**  
> 다이어트 기록 앱의 최대 적인 '기록 피로감'을 없애기 위해, 모든 항목을 강제하지 않고 모듈형으로 자유롭게 기록합니다.

### 3.1 3대 모듈형 기록 항목 (원하는 것만 선택 입력)

| 항목 | 입력 방식 | 설명 |
| :--- | :--- | :--- |
| **⚖️ 체중 (Weight)** | 숫자 키패드 (0.1kg 단위) | 아침 공복 1초 입력 |
| **📸 눈바디 (Body Photo)** | 카메라 / 갤러리 업로드 | • 브라우저 자동 WebP 압축 (1.5MB 내외)<br>• 투명도 슬라이더 비교용 |
| **🏃 운동 (Workout)** | 원터치 칩 선택 + 시간(분) | • 태그: 헬스/웨이트, 러닝, 홈트, 수영, 구기/유산소, 휴식<br>• 운동 시간 및 한 줄 메모 |
| **🥗 메모/식단 (선택)** | 한 줄 텍스트 / 상태 칩 | 클린식단, 치팅, 금주성공, 핑계 등 |

* **타임라인 누적 지원**:
  * 아침에 일어나서 [체중]만 1초 만에 등록 -> 저녁 퇴근 후 [운동]만 추가 등록 가능!

---

## 4. 리더보드 & 비교 시각화 (새로운 설계)

불공정할 수 있는 백분율(%) 줄세우기를 탈피하고, **비주얼 비교 차트**와 **순수 노력 기반 포인트 랭킹**으로 설계합니다.

### 4.1 📈 그룹 체중 변화 겹침 그래프 (Group Overlay Trend Chart)
* **변화량 레이스 모드 (Δkg 모드 - 기본값 🔥)**:
  * 모든 멤버의 시작점을 **`0.0kg` 기준선(Baseline)**으로 일치시킴!
  * 누가 아래로 꺾이고 있는지(-1.5kg, -0.7kg, +0.5kg 등) 마치 주식/레이스 차트처럼 한눈에 직관적으로 비교
  * 체격이나 체중 절대값과 무관하게 실제 감량 추세를 공정하게 겹쳐서 비교
* **절대 체중 모드 (옵션)**:
  * 멤버별 실제 체중(kg) 추세선 보기 (원할 경우 On/Off 토글)
* **인터랙티브 툴팁**:
  * 특정 날짜의 포인트를 터치하면 해당 멤버의 **[몸무게, 운동 태그, 눈바디 썸네일]** 팝업 카드 노출

### 4.2 🎖️ 부담 없는 연속 스트릭 (Streak System)
* **데일리 출석 스트릭 (Daily Active Streak)**:
  * **[체중, 눈바디, 운동] 중 단 1개만 올려도 당일 스트릭 +1일 유지!**
  * 바쁜 날에도 체중만 띡 찍거나 운동 태그 하나만 탭해도 연속 기록이 끊기지 않음
* **보너스 배지 (취향별 특화)**:
  * ⚖️ **체중 마스터**: 체중 연속 7일/30일 기록 시 배지
  * 📸 **눈바디 러버**: 눈바디 연속 인증 배지
  * 🏃 **운동 러너**: 운동 연속 기록 배지
  * 👑 **트리플 올클리어(All-Clear)**: 하루에 3개를 모두 기록한 날 특별 골든 크라운 뱃지 부여

### 4.3 ⚡ 주간 랭킹: 주간 열정 포인트 (Weekly Activity Score)
몸무게 정체기인 사람도 땀 흘리고 기록한 만큼 정당하게 1등을 할 수 있는 포인트 시스템:
* **포인트 적립 룰**:
  * ⚖️ 체중 입력: **+10점** (하루 1회)
  * 📸 눈바디 업로드: **+15점** (하루 1회)
  * 🏃 운동 기록: **+20점** (하루 1회, 30분 이상 시 +5점 추가)
  * 👑 올클리어 보너스: 하루 3개 모두 완료 시 **+15점 추가 보너스**
* **주간 리셋 & 시상**:
  * 매주 월요일 00:00에 주간 랭킹 리셋
  * 1등: **[🔥 이번 주 버닝왕]** 칭호
  * 꼴찌(포인트 최하위 or 주간 미기록 최다): **[☠️ 주간 벌칙 타겟]** 선정 (단톡방 벌칙 수행)

### 4.4 🌶️ 친구 찌르기 & 독설 시스템 (Tough Love)
* 당일 밤 9시까지 아무것도 기록하지 않은(3개 모두 0개) 멤버에게 **[🔥 완전 미기록 경보]** 발령
* 멤버 프로필 옆 **[콕 찌르기 👉]** 클릭 시 매콤한 독설 알림 즉시 전송:
  * *"오늘 체중계 먼지 쌓이는 중이다"*
  * *"운동도 안 하고 눈바디도 안 찍고 뭐하냐?"*
  * *"너 지금 손에 야식 들려있는 거 다 안다"*

---

## 5. 킬러 기능: 👁️ 겹쳐보기 (Ghost Overlay Viewer)

서비스에 기록용으로 올린 눈바디 사진들 중 **사용자가 직접 2장의 사진을 선택하여 한 화면에 겹쳐놓고, 불투명도(Opacity)를 조절하며 미세한 체형 변화를 직접 확인**하는 핵심 차별화 기능입니다.

### 5.1 사진 선택 UX (2-Photo Picker)
* **내 눈바디 갤러리 피커**:
  * 서비스에 업로드했던 눈바디 사진들을 날짜 역순(최신순) 썸네일 그리드로 제공
  * 사용자가 직관적으로 **[기준 사진 A (과거)]**와 **[비교 사진 B (현재/최근)]** 2장을 선택
  * 빠른 프리셋 제공: "시작일 vs 오늘", "7일 전 vs 오늘", "전주 같은 요일 vs 오늘" 등 원클릭 선택 지원

### 5.2 겹쳐보기 뷰어 작동 방식 (불투명도 조절 인터랙션)
* **상/하 레이어 오버레이 구조**:
  * 하단 레이어: 기준 사진 A
  * 상단 레이어: 비교 사진 B (불투명도 조절 대상)
* **실시간 불투명도 슬라이더 (0% ~ 100%)**:
  * 슬라이더를 **0%** 쪽으로 당기면: 기준 사진 A만 선명하게 표시
  * 슬라이더를 **100%** 쪽으로 밀면: 비교 사진 B만 선명하게 표시
  * 슬라이더를 **50%** 중앙에 두면: 두 사진이 반투명하게 겹쳐져 **어깨 너비, 복부/옆구리 라인, 턱선, 허벅지 틈 등의 변화가 즉시 육안으로 식별**됨
* **추가 편의 기능**:
  * 🔄 **원터치 깜빡임(Blink) 토글**: 버튼을 누르는 동안만 사진 B가 보이고 떼면 사진 A가 보여 잔상 효과로 변화 확인
  * 📏 **정렬 보정 가이드**: 촬영 각도 차이를 보정할 수 있는 간단한 미세 위치 이동(Pan) & 확대(Zoom) 제어
  * 📸 **비교 인증샷 저장/공유**: 겹쳐진 모습이나 분할 비교샷을 캡처하여 그룹 피드나 단톡방에 자랑할 수 있는 내보내기 기능

---

## 6. 데이터베이스 스키마 설계 (PostgreSQL / Supabase)

```sql
-- 1. 사용자 프로필
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  nickname text not null,
  start_weight numeric(5, 2),
  target_weight numeric(5, 2),
  created_at timestamp with time zone default now()
);

-- 2. 그룹
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  invite_code text unique not null,
  penalty_rule text, -- 예: "주간 꼴찌 커피 쏘기"
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- 3. 그룹 멤버십
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- 'owner' | 'member'
  streak_days integer default 0,
  weekly_points integer default 0,
  joined_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

-- 4. 데일리 기록 (모듈형: 체중, 사진, 운동 중 1개만 있어도 유효)
create table public.daily_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  record_date date not null default current_date,
  weight numeric(5, 2),                   -- 선택: 체중 (kg)
  photo_url text,                         -- 선택: 눈바디 사진 URL
  workout_tags text[],                    -- 선택: 운동 태그 (['웨이트', '러닝'])
  workout_minutes integer,                -- 선택: 운동 시간 (분)
  memo text,                              -- 선택: 메모/식단
  points_earned integer default 0,        -- 당일 획득 열정 포인트
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, group_id, record_date),
  constraint at_least_one_check check (
    weight is not null or photo_url is not null or workout_tags is not null or memo is not null
  )
);

-- 5. 찌르기 & 독설 로그
create table public.pokes (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamp with time zone default now()
);
```

---

## 7. 단계별 개발 로드맵

```
[Phase 1: 기반 세팅 & 초간단 회원가입]
- Next.js (App Router) + Supabase 클라이언트 환경 구성
- Username 기반 초간단 회원가입 & 로그인 (가상 이메일 연동)
- 프로필 설정 (닉네임, 시작 체중, 목표 체중)

[Phase 2: 그룹 및 초대 링크 시스템]
- 그룹 생성 & 6자리 고유 초대 링크/코드 발급
- 초대 링크 접속 시 원클릭 그룹 가입 로직
- 그룹 RLS(Row Level Security) 접근 제어

[Phase 3: 무부담 데일리 기록 & '겹쳐보기']
- 모듈형 데일리 기록 UI (체중 / 눈바디 / 운동 개별 또는 동시 입력)
- 클라이언트 WebP 이미지 자동 리사이징 & Supabase Storage 업로드
- 눈바디 사진 2장 선택 및 불투명도 조절 '겹쳐보기(Ghost Overlay)' 뷰어

[Phase 4: 그룹 체중 겹침 차트 & 주간 열정 리더보드]
- 멤버별 시작일 기준 변화량(Δkg) 오버레이 차트
- 단 1개만 써도 유지되는 데일리 스트릭 로직
- 주간 열정 포인트 산정 및 리더보드 순위표
- 미기록자 찌르기 & 매콤한 독설 프리셋 발송 및 벌칙 현황판
```