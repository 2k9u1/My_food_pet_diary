# 밥친구 (가칭)

카메라 기반 AI 식단 인증 + 펫 육성 웹앱입니다. 학생은 끼니마다 사진을 올려 미션을 인증하고, 성공하면 경험치를 얻어 펫을 키웁니다. 교사는 대시보드에서 학생 현황을 보고, 미션 규칙(채소/단백질 기준, 잔반 제로 기준, 보너스, 고난도 조건)을 화면에서 직접 바꿀 수 있습니다.

**여러 교사가 함께 쓸 수 있습니다.** 교사마다 자기만의 **학급 코드**가 생기고, 학생은 그 코드로 자기 선생님 학급에 가입합니다. 교사는 자기 학급 학생과 자기가 만든 미션 규칙만 보고 고칠 수 있고, 다른 반 데이터는 보이지 않습니다.

자세한 요구사항은 [docs/requirements.html](docs/requirements.html)에 있습니다.

## 두 가지 모드

이 프로젝트는 **`.env.local` 파일에 Firebase 설정이 있는지**로 자동으로 모드를 바꿉니다. 코드를 따로 고칠 필요가 없습니다.

| | 설정 없음 (기본) | `.env.local`에 Firebase 설정 있음 |
|---|---|---|
| 로그인 | 이름/학번만 입력하는 간편 로그인 | 실제 **Google 로그인** |
| 저장 | 이 브라우저의 `localStorage`만 (혼자 테스트용) | **Firestore + Storage** (여러 학생·기기가 함께 씀) |
| 용도 | 화면/기능을 빠르게 체험 | 실제 학급 운영 |

## 실행 방법

```bash
npm install
npm run dev
```

터미널에 나오는 주소(기본 http://localhost:5173 )를 브라우저로 열면 됩니다. `.env.local`이 없으면 자동으로 간편 로그인 모드로 켜지고, 처음 화면에서 "학생으로 시작" 또는 "교사로 시작"을 고르면 바로 체험할 수 있습니다. 교사로 들어가면 "김민준", "이서연" 두 명의 예시 학생이 보이는데, 화면 확인용 샘플 데이터입니다.

빌드 확인:

```bash
npm run build
```

## 아직 대체된 부분

- **AI 판정**: 실제 이미지 인식 대신, 사진 데이터로 만든 임시 점수로 판정합니다(`src/lib/judge.ts`의 `scoreImage` 함수). 실제 채소/단백질/잔반 인식 AI로 바꿔 끼우는 자리를 미리 마련해 두었습니다.
- **오늘의 미션 인증**: 사진 판정이 아니라 학생이 스스로 "실천했어요"를 눌러 인증하는 자기 점검형입니다(의도된 설계입니다. README "지금 버전이 할 수 있는 것" 참고).
- **간편 로그인(데모) 모드의 다중 교사**: 데모 모드는 브라우저 하나당 교사 계정이 하나뿐이라고 가정합니다(학급 코드 입력 화면 없음). 여러 교사가 각자 학급을 운영하는 진짜 다중 교사 구조는 Google 로그인 모드(Firebase)에서만 동작합니다.

## 폴더 구조

```
src/
  types.ts                데이터 모델 (User, MissionSetting, PetState, MealSubmission, DailyProgress ...)
  lib/
    auth.ts                로그인 파사드 — Google 로그인 / 간편 로그인 중 하나를 자동 선택
    firebase.ts             Firebase 초기화(.env.local 값을 읽음)
    teacherEmails.ts         교사로 인식할 구글 이메일 목록 (firestore.rules와 짝을 이룸)
    id.ts                    학급 코드 생성(generateClassCode) 등 공용 유틸
    store.ts                데이터 파사드 — firebaseStore.ts / localStore.ts 중 하나를 자동 선택
    localStore.ts            localStorage 기반 구현 (데모 모드)
    firebaseStore.ts         Firestore/Storage 기반 구현 (실제 서비스 모드)
    judge.ts                판정 로직(세 끼 판정, 잔반 제로 판정, 고난도 보너스) — AI 연동 지점 포함
    dailyMission.ts          오늘의 미션을 날짜 기준으로 결정론적으로 뽑는 함수
    pet.ts                   경험치 → 레벨 → 성장 단계 계산 (결정론적)
    image.ts                사진 업로드 검증/압축
    seed.ts / labels.ts / id.ts   기본값, 화면 라벨, 공용 유틸
  components/
    LoginScreen.tsx         로그인 화면 (모드에 따라 Google 버튼 또는 간편 로그인 폼)
    GoogleOnboardingForm.tsx Google 로그인 후 처음 한 번만 나오는 학번 입력 화면
    Footer.tsx / PolicyModal.tsx   개인정보 처리방침·이용약관 초안, 푸터
  features/
    student/                 학생 화면(오늘 요약, 인증 입력, 결과 화면)
    teacher/                  교사 화면(학생 현황, 규칙 설정, 오늘의 미션 관리, 학생 상세)
  App.tsx                    로그인 상태에 따라 화면을 연결
docs/
  requirements.html          전체 요구사항 정의서
firestore.rules              Firestore 보안 규칙 (Firebase 콘솔에 붙여넣기)
storage.rules                Storage 보안 규칙 (Firebase 콘솔에 붙여넣기)
```

화면(UI) · 판정 로직 · 데이터 저장이 파일별로 분리되어 있어서, 한 부분을 바꿔도 다른 부분에 영향이 적습니다. 예를 들어 실제 AI 인식을 붙일 때는 `src/lib/judge.ts`의 `scoreImage` 함수만 바꾸면 됩니다.

## 실제 서비스로 켜기 (Google 로그인 + 공용 저장)

아래는 개발자가 아니어도 따라 할 수 있는 순서입니다. 처음 한 번만 하면 됩니다.

### 1. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com)에 구글 계정으로 로그인 → "프로젝트 추가" → 이름 입력(예: 밥친구) → 만들기.
2. 왼쪽 메뉴 **Authentication** → "시작하기" → 로그인 방법 탭에서 **Google** 사용 설정.
3. 왼쪽 메뉴 **Firestore Database** → "데이터베이스 만들기" → (지역은 `asia-northeast3`(서울) 추천) → 우선 "테스트 모드"로 시작해도 되지만, 아래 3단계에서 규칙을 반드시 우리 파일로 교체하세요.
4. 왼쪽 메뉴 **Storage** → "시작하기" → 기본값으로 만들기.
5. 프로젝트 설정(⚙️ 아이콘) → "내 앱" → 웹 아이콘(`</>`) 클릭 → 앱 등록 → 화면에 나오는 `firebaseConfig` 값을 복사해 둡니다.

### 2. 이 프로젝트에 연결하기

1. 프로젝트 루트의 `.env.example` 파일을 복사해서 `.env.local`이라는 이름으로 저장합니다.
2. 방금 복사한 `firebaseConfig` 값을 `.env.local`에 채웁니다.

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. `src/lib/teacherEmails.ts` 파일을 열어 배열에 **교사로 등록할 구글 이메일**을 넣습니다. 여러 명이면 쉼표로 이어서 추가하면 됩니다.

   ```ts
   export const TEACHER_EMAILS: string[] = [
     "padsa15@gmail.com",
     "다른선생님@gmail.com", // 필요하면 계속 추가
   ];
   ```

4. `npm run dev`로 다시 실행하면 로그인 화면이 자동으로 "🔐 Google로 로그인" 버튼으로 바뀝니다.

### 3. 보안 규칙 붙여넣기 (꼭 해야 함)

이 단계를 건너뛰면 아무나 다른 학생의 데이터를 보거나 고칠 수 있습니다.

1. Firebase 콘솔 → Firestore Database → **규칙** 탭 → 이 프로젝트의 [`firestore.rules`](firestore.rules) 파일 내용을 그대로 복사해 붙여넣고 **게시**.
   - 이때 파일 안의 `teacherEmails()` 목록도 `src/lib/teacherEmails.ts`와 똑같이 바꿔주세요. (교사를 추가/삭제할 때마다 두 파일을 항상 같이 고쳐야 합니다.)
2. Firebase 콘솔 → Storage → **규칙** 탭 → 이 프로젝트의 [`storage.rules`](storage.rules) 파일 내용을 그대로 붙여넣고 **게시**.

### 4. 확인

1. 브라우저에서 앱을 열고 "Google로 로그인"을 눌러 선생님 이메일로 로그인 → 바로 교사 대시보드로 들어가면 성공입니다. 화면 오른쪽 위에 **학급 코드**(예: `AB12CD`)가 자동으로 생성되어 보입니다 — 이 코드를 학생들에게 알려주세요.
2. 다른 구글 계정(또는 시크릿 창)으로 로그인하면 학급 코드 + 이름/학번을 입력하는 화면이 나옵니다. 방금 확인한 학급 코드를 입력하고 제출하면 그 교사의 학급 학생으로 등록됩니다.
3. 교사 대시보드에서 방금 로그인한 학생이 목록에 보이는지 확인합니다.
4. 여러 교사가 있다면, 각 교사는 로그인할 때마다 자기 학급 코드와 자기 학생만 보입니다 — 다른 교사의 학급 코드로 가입한 학생은 보이지 않습니다.

배포(다른 사람도 인터넷 주소로 접속하게 하기)는 Firebase Hosting, Vercel, Netlify 등에 `npm run build`로 만든 `dist` 폴더를 올리면 됩니다. 이 부분은 요청하시면 이어서 도와드릴게요.

대안으로 **Supabase**(PostgreSQL 기반)도 가능합니다. 데이터를 SQL 표처럼 다루고 싶거나 Row Level Security로 권한을 SQL 조건문으로 명확히 선언하고 싶다면 더 잘 맞을 수 있지만, 이 프로젝트의 코드는 Firebase 기준으로 맞춰져 있습니다.

## 보안 체크리스트

- [x] API 키/DB 비밀번호는 `.env.local`에만 두고 커밋하지 않기 (`.gitignore` 확인됨)
- [x] 서버(Firestore/Storage 보안 규칙)에서 "학생 본인/교사만 접근" 강제하기 — `firestore.rules`, `storage.rules`
- [x] 업로드 파일 형식/크기 서버에서도 다시 검증하기 — `storage.rules`에서 이미지 형식·15MB 제한 재검증
- [ ] 배포 시 HTTPS로만 접속되게 하기 (Firebase Hosting/Vercel/Netlify는 기본 제공)
- [ ] Firestore 콘솔의 자동 백업(예약 내보내기) 기능 켜두기
- [ ] 교사의 학생 기록 조회 로그 남기기 (지금은 Firestore 기본 접근 로그만 있음, 별도 감사 로그는 추후 필요 시 추가)
