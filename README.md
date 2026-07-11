# Re:Zero

Transformer를 벡터부터 직접 움직이고 실행하며 배우는 인터랙티브 교과서입니다.
현재 앱은 TanStack Start 위에서 React로 렌더링되고 Cloudflare Workers에서
실행되도록 구성되어 있습니다.

## Stack

- TanStack Start + TanStack Router
- React 19 + Vite 8
- Cloudflare Workers + Cloudflare Vite plugin
- Clerk TanStack Start SDK (선택적 인증)
- CodeMirror 6 (Python 편집과 syntax highlighting)
- Pyodide + NumPy (브라우저 안에서 코드 실행)
- Drizzle ORM + Cloudflare D1 (다음 단계의 진도·질문 데이터)

## Local development

Node.js `>=22.13.0`이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.
Clerk 키가 없어도 모든 공개 학습 콘텐츠와 브라우저 Python 실습은 동작하며,
헤더에는 `로그인 준비 중`이 표시됩니다.

## Clerk 연결

Clerk 대시보드의 `rezero` 애플리케이션에서 Google, GitHub, 이메일 OTP를
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
따라서 읽기는 계속 공개하고, 향후 진도 저장·질문 작성·관리자 답변 같은 쓰기
작업에서만 서버 측 `auth()` 검사를 적용합니다.

운영 환경에서는 실제 값을 Git에 넣지 말고 Cloudflare secret으로 등록합니다.

```bash
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
```

## Cloudflare deploy

현재 [`wrangler.jsonc`](./wrangler.jsonc)가 Workers 설정의 단일 원본입니다.

```bash
npm run build
npm run deploy
```

배포가 만들어지면 Cloudflare 대시보드에서 `rezero.taeyun.me` custom domain을
Worker에 연결합니다.

D1은 실제 데이터베이스를 생성한 뒤 `DB` binding을 추가합니다. 첫 데이터
모델은 사용자, 챕터 진도, 질문, 답변으로 구성하고 Clerk `userId`는 서버에서만
확정합니다. Durable Objects는 실시간 presence나 질문방 WebSocket이 실제로
필요해질 때 추가하며, 현재 CRUD에는 D1만 사용합니다.

## Commands

```bash
npm run dev        # Workers 로컬 런타임 + Vite HMR
npm run check      # TypeScript 검사
npm run build      # 프로덕션 client/SSR Worker 빌드
npm test           # 빌드 후 홈·챕터 SSR 계약 테스트
npm run deploy     # 검증 후 Cloudflare Workers 배포
npm run cf-typegen # wrangler binding 타입 생성
```

## Source layout

- `src/routes/`: TanStack file-based routes
- `src/components/`: 학습 UI, 인증 셸, 인터랙티브 실습
- `src/data/`: 커리큘럼 카탈로그
- `src/styles/`: 전역 디자인 시스템
- `public/pyodide-worker.js`: 브라우저 Python worker
- `db/`: Drizzle/D1 진입점
- `tests/`: Workers SSR 렌더링 테스트
