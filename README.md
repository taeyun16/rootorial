# Rootorial

Technology, understood from the root.

복잡한 기술을 바닥부터.

직접 움직이고 실행하며 어려운 기술을 이해하는 인터랙티브 커리큘럼 플랫폼입니다.
Transformer 시리즈는 Rootorial이 제공하는 첫 번째 커리큘럼이며, Linux 시스템,
인프라 설계, 디자인 패턴 등 독립적인 학습 여정을 같은 구조에서 제공하도록 설계되어 있습니다.
현재 앱은 TanStack Start 위에서 React로 렌더링되고 Cloudflare Workers에서
실행되도록 구성되어 있습니다.

## Stack

- TanStack Start + TanStack Router
- React 19 + Vite 8
- Cloudflare Workers + Cloudflare Vite plugin
- Clerk TanStack Start SDK (선택적 인증)
- CodeMirror 6 (Python 편집과 syntax highlighting)
- Pyodide + NumPy + Matplotlib (브라우저 안에서 코드 실행·차트 렌더링)
- Drizzle ORM + Cloudflare D1 (컴포넌트별 질문·답변·좋아요·차단)

## Local development

Node.js `>=22.13.0`이 필요합니다.

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.
로컬 D1 데이터는 `.wrangler/` 아래에 저장되며 Cloudflare 로그인이나 원격
데이터베이스 없이도 질문·답변 기능을 검증할 수 있습니다. 스키마가 변경되면
개발 서버를 시작하기 전에 `npm run db:migrate:local`을 다시 실행하세요.
`npm run db:seed:local`은 벡터 챕터에 질문 2개, 답변 3개, 좋아요와 세 명의
fallback 아바타를 idempotent하게 추가해 커뮤니티 UI를 바로 확인하게 합니다.
브라우저 E2E는 `rootorial-e2e-local` 데이터베이스를 별도로 사용하므로 개발 중인
로컬 질문 데이터를 수정하지 않습니다. 실행 중 Clerk 개발 인스턴스에 테스트
사용자와 임시 관리자를 만들지만 테스트 종료 시 계정과 D1 데이터를 모두
정리합니다. Python 실행, 익명·계정 진도 병합, 가입, 질문 수정·삭제, 두 사용자
답변·좋아요·차단, 관리자 숨김·복구를 Chromium에서 검증합니다.
Clerk 키가 없어도 모든 공개 학습 콘텐츠와 브라우저 Python 실습은 동작하며,
헤더에는 `로그인 준비 중`이 표시됩니다.

벡터 챕터의 코드 셀은 하나의 브라우저 Python 커널을 공유합니다. Jupyter처럼
셀을 직접 수정해 실행할 수 있고, 텍스트 출력과 Matplotlib 차트가 셀 바로 아래에
표시됩니다. 각 셀은 단독 실행도 가능하도록 기본 코드를 포함합니다.

## Clerk 연결

Clerk 대시보드의 `rootorial` 애플리케이션에서 Google, GitHub, 이메일 OTP를
활성화하고 API 키 두 개를 로컬 `.env`에 넣습니다.

```bash
cp .env.example .env
```

```dotenv
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

서버를 다시 시작하면 헤더가 로그인·가입 버튼 또는 사용자 메뉴로 전환됩니다.
`clerkMiddleware()`는 인증 상태만 주입하며 페이지를 자동으로 잠그지 않습니다.
따라서 읽기는 계속 공개합니다. 로그아웃 상태의 챕터 진도는 브라우저에 저장되고,
로그인하면 기존 브라우저 진도와 Clerk 계정의 진도를 병합합니다. 계정 진도는
서버 함수가 `auth()`로 사용자 ID를 확정한 뒤 Clerk `privateMetadata`에만 씁니다.
질문 작성·관리자 답변처럼 별도 데이터가 필요한 쓰기 작업도 같은 서버 인증
경계를 사용합니다.

관리자 답변과 숨김·복구 권한은 서버 전용 allowlist로 부여합니다. Clerk
Dashboard의 사용자 ID를 쉼표로 구분해 추가하세요. 값이 비어 있으면 누구에게도
관리자 권한을 주지 않습니다.

```dotenv
ROOTORIAL_ADMIN_USER_IDS=user_abc123,user_def456
```

운영 환경에서는 실제 값을 Git에 넣지 말고 Cloudflare secret으로 등록합니다.

첫 Worker 배포 전에는 아직 `wrangler secret put`을 사용할 대상이 없으므로 아래
템플릿을 복사하고 Clerk production instance의 `pk_live_...`, `sk_live_...`와
프로덕션 관리자 사용자 ID를 입력합니다. `.dev.vars.production`은 Git에서
제외됩니다.

```bash
cp .dev.vars.production.example .dev.vars.production
npm run deploy -- --secrets-file .dev.vars.production
```

첫 배포 이후 키를 교체하거나 추가할 때는 다음 명령을 사용합니다.

```bash
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put ROOTORIAL_ADMIN_USER_IDS
```

## Cloudflare deploy

현재 [`wrangler.jsonc`](./wrangler.jsonc)가 Workers 설정의 단일 원본입니다.

```bash
npm run build
npm run deploy:check
npm run deploy
```

배포가 만들어지면 `wrangler.jsonc`에 선언된 `rootorial.com` custom domain이
Worker에 연결됩니다.

D1은 질문·답변, 좋아요, 사용자별 차단, 관리자 감사 기록을 저장합니다. 현재
저장소에는 토론·관리·rate limit용 7개 테이블의 Drizzle migration이 포함되어
있습니다. 로컬용 `DB` binding은 이미 구성되어 있습니다. 배포 전에는
Cloudflare에서 데이터베이스를 만든 뒤 출력된 `database_id`를 기존 binding에
추가하고 이름을 운영 데이터베이스에 맞게 바꿔야 합니다.

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "rootorial",
    "database_id": "<wrangler d1 create가 출력한 ID>",
    "migrations_dir": "drizzle"
  }
]
```

```bash
npx wrangler d1 create rootorial
npm run db:migrate:remote
```

`npm run deploy:check`는 코드를 업로드하지 않고 Worker 번들, 정적 자산과 binding을
검증합니다. 실제 배포는 원격 설정 충돌을 덮어쓰지 않도록 Wrangler strict mode로
실행됩니다. 원격 D1과 secret 상태를 확인하려면 먼저 `npx wrangler login`으로
Cloudflare 인증을 갱신한 뒤 아래 명령을 실행하세요.

```bash
npm run db:status:remote
```

`DB` binding이 없으면 공개 학습과 코드 실행은 그대로 동작하고, 토론 패널에는
연결 안내가 표시됩니다. Clerk `userId`와 관리자 여부는 항상 서버에서만
확정합니다. Durable Objects는 실시간 presence나 질문방 WebSocket이 실제로
필요해질 때 추가합니다.

## Commands

```bash
npm run dev        # Workers 로컬 런타임 + Vite HMR
npm run check      # TypeScript 검사
npm run build      # 프로덕션 client/SSR Worker 빌드
npm test           # 빌드 후 홈·챕터 SSR 계약 테스트
npm run deploy:check # 업로드 없이 Worker 배포 번들과 binding 검증
npm run test:e2e   # Clerk 테스트 가입 + 로컬 D1 질문 저장 브라우저 E2E
npm run db:migrate:local # 로컬 D1 migration 적용
npm run db:seed:local    # 커뮤니티 UI 확인용 로컬 데모 데이터 적용
npm run db:migrate:e2e   # 격리된 E2E D1 migration 적용
npm run db:status:local  # 로컬 D1 migration 상태 확인
npm run db:migrate:remote # 프로덕션 D1 migration 적용
npm run db:status:remote # 프로덕션 D1 migration 상태 확인
npm run deploy     # 검증 후 Cloudflare Workers 배포
npm run cf-typegen # wrangler binding 타입 생성
```

## Linux systems sample curriculum

`/curricula/linux-systems`는 “Linux 시스템을 바닥부터”의 8개 챕터 로드맵과
완성된 첫 샘플 챕터를 제공합니다. `/curricula/linux-systems/chapters/shell-and-filesystem`의
완료 조건은 다음 두 가지입니다.

- 교육용 셸에서 현재 위치, 배포판 정보, 디렉터리·메모 생성과 보호된 파일의
  권한 오류까지 다섯 과제를 실제 상태로 확인
- 절대·상대 경로와 쓰기 권한에 관한 이해 확인 세 문제 통과

필수 경로는 외부 VM 자산을 내려받지 않습니다. 실제 커널 부팅은 샘플 챕터의
선택 심화 링크에서 `/experiments/linux#real-linux`로 분리했습니다.

```bash
npx playwright test e2e/linux-curriculum.spec.ts --project=chromium --no-deps
```

## Linux browser runtime experiment

`/experiments/linux`는 Linux 시스템 커리큘럼을 정식 챕터로 승격하기 전에 실행
환경을 검증하는 실험 페이지입니다. 두 런타임을 의도적으로 구분합니다.

- 교육용 셸: 인메모리 파일시스템 위에서 `pwd`, `ls`, `cd`, `cat`, `mkdir`,
  `touch`, `echo >`, `rm`, `tree`를 즉시 실행하고 파일 트리와 과제 상태를 함께
  보여줍니다. 실제 Linux 커널은 아닙니다.
- 실제 커널: 사용자가 시작 버튼을 누를 때만 BSD-2-Clause의
  [`v86`](https://github.com/copy/v86)을 동적 로드하고, 32비트 x86 PC와
  Buildroot Linux를 직렬 콘솔까지 부팅합니다.

v86 WASM, SeaBIOS와 Buildroot 이미지는 allowlist된 동일 출처 Worker 경로를
통해 공식 upstream에서 실험용으로 전달합니다. 정식 커리큘럼으로 전환하기 전에는
재현 가능한 자체 Buildroot 이미지, 체크섬 고정, R2 또는 정적 자산 호스팅,
SeaBIOS/Linux/BusyBox의 라이선스 고지와 대응 소스 제공 방식을 결정해야 합니다.

빠른 브라우저 셸 E2E는 외부 커널을 받지 않습니다. 실제 부팅 E2E는 약 14MB의
외부 자산을 받으므로 명시적으로 opt-in합니다.

```bash
npx playwright test e2e/linux-experiment.spec.ts --project=chromium --no-deps
RUN_V86_E2E=1 npx playwright test e2e/linux-experiment.spec.ts --project=chromium --no-deps --grep "boots Buildroot"
```

## Source layout

- `src/routes/`: TanStack file-based routes
- `src/components/`: 학습 UI, 인증 셸, 노트북 셀, 컴포넌트별 토론 패널
- `src/data/curriculum.ts`: 플랫폼 커리큘럼 registry와 챕터 메타데이터
- `src/data/`: 커리큘럼 카탈로그와 챕터별 실행 코드
- `src/styles/`: 전역 디자인 시스템
- `public/pyodide-worker.js`: 브라우저 Python worker
- `db/`, `drizzle/`: 토론 스키마와 D1 migration
- `tests/`: Workers SSR 렌더링 테스트
