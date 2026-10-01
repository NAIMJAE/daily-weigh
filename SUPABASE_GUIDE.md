# 매일재라 (Daily Weigh) — Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → 로그인 → **New project** 클릭
2. 프로젝트명: `daily-weigh` (또는 원하는 이름)
3. 데이터베이스 비밀번호 설정 후 **Create new project** 클릭

---

## 2. 환경 변수 설정

**Project Settings → API** 탭에서 아래 두 가지 값을 복사합니다:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`.env.local` 파일 (이미 생성되어 있음):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 3. 이메일 인증 비활성화 (⚠️ 필수)

**Authentication → Settings → Email Auth**:
- `Confirm email` → **OFF** 로 설정

> 이 앱은 가상 이메일(`아이디@dailyweigh.local`) 방식을 사용합니다.
> 이메일 인증을 끄지 않으면 회원가입 후 로그인이 되지 않습니다.

---

## 4. 데이터베이스 스키마 실행

**SQL Editor → New query** 에서 `supabase/schema.sql` 파일 전체 내용을 붙여넣고 **Run** 클릭.

생성되는 테이블:
| 테이블 | 설명 |
|---|---|
| `profiles` | 사용자 프로필 (auth.users와 1:1) |
| `groups` | 다이어트 그룹 |
| `group_members` | 그룹 멤버십 (스트릭/포인트 포함) |
| `daily_records` | 일일 기록 (체중/눈바디/운동) |
| `pokes` | 친구 찌르기 독설 메시지 |

---

## 5. 스토리지 버킷 확인

SQL 실행 후 **Storage** 탭으로 가서 `body-photos` 버킷이 생성되었는지 확인합니다.
없다면 **New bucket** → `body-photos` → **Public bucket** 체크 후 생성.

---

## 6. 테스트 계획 (회원가입 → 그룹 생성 플로우)

1. `http://localhost:3000/auth/register` 접속
2. 아이디/닉네임/비밀번호 입력 후 가입
3. 메인으로 이동 → **"소속된 그룹이 없습니다"** 화면 확인 ✅
4. **새 그룹 만들기** 클릭 → 그룹 이름 입력 후 생성
5. 대시보드가 표시되면 정상 연동 ✅
6. 그룹 초대 링크를 복사하여 다른 계정으로 참여 테스트

---

## 7. 자주 발생하는 오류

| 증상 | 원인 | 해결 |
|---|---|---|
| 로그인 후 대시보드가 안 뜸 | profiles 레코드 없음 | schema.sql 의 trigger 재실행 |
| "Invalid login credentials" | 이메일 인증 활성화 상태 | Auth Settings에서 Confirm email OFF |
| 그룹 생성 후 바로 빈 화면 | RLS policy 미적용 | schema.sql 전체 재실행 |
| 사진 업로드 실패 | body-photos 버킷 없음 | Storage에서 버킷 수동 생성 |

---

## 구조 요약

```
사용자 가입 → auth.users 생성 → trigger → profiles 자동 생성
                                              ↓
사용자 로그인 → fetchProfile() → 그룹 없으면 NoGroupView 표시
                                              ↓
그룹 생성 → groups 테이블 insert → group_members(owner) 추가
                                              ↓
대시보드 → fetchGroupMembers/Records/Pokes → Supabase 실시간 표시
```
