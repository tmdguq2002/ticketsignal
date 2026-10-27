# 7번 · 공개 소스와 재현 검증

검증일: 2026-10-27. 환경: Linux, Node.js v22.22.1, npm 9.2.0. 기존 운영 앱의 소스 커밋 `6989d5f49be91b5f61748e6fb5fcb8e61023bc80`에서 추적된 소스를 가져오고 제출 문서를 유지했다. 운영 프로젝트는 변경·재배포하지 않았다.

## 공개 파일

- README: 해결하려는 문제, 실행 명령, 운영·로컬 차이, 알려진 제한.
- LICENSE: 프로젝트 코드 MIT, 제삼자 라이선스 보존 및 로고·포스터 권리 구분.
- .gitignore: 환경 파일, 키, 로컬 DB, 의존성, 빌드 산출물 제외.
- .env.example: 빈 인증값과 `GMAIL_MODE=disabled` 제공.
- 앱·수집기·DB 마이그레이션·테스트·고정 수집 스냅샷 포함.

## 깨끗한 폴더에서 실행

공개할 파일만 별도 임시 폴더로 복사했다. 기존 node_modules, 운영 비밀변수, .wrangler, .sites-runtime, Git 이력은 복사하지 않았다. README의 명령 순서대로 실행했다. 운영 Gmail·Cloudflare 계정 인증은 사용하지 않았다.

| 확인 | 실제 결과 |
|---|---|
| `npm ci` | 종료 코드 0, 706개 패키지 설치 |
| `npm test` | 35개 통과, 실패·건너뜀 0 |
| `npm run build` | 종료 코드 0, 네 서버 경로 빌드 완료 |
| 로컬 D1 마이그레이션 | 종료 코드 0, 스키마 생성 성공 |
| `npm start -- --port 4173` | 로컬 Worker 시작 |
| `/`, `/api/events`, `/api/interests` | 각각 HTTP 200 |
| 초기 스냅샷 조회 | 현재 날짜 범위에 남은 121개 일정, firstSeenAvailable true |
| 관심 HTTP 검사 | 7개 통과, 검사 등록 정리 |

[설치·테스트·빌드·DB·HTTP 실행 로그](evidence/reproduction-2026-10-27.txt).

121개는 과거 수집 스냅샷을 검증 당시 날짜로 필터한 로컬 일정 수다. 운영의 170개 일정이나 공연 통합 카드 수와 혼동하지 않는다. 향후 같은 스냅샷이 만료되면 일정이 없어질 수 있으며, 고정 데이터 단위 테스트는 계속 실행할 수 있다. 실제 외부 수집과 예약 실행, 메일 수신은 이번 재현 검증에 포함하지 않았다.

## 공개 전 점검

공개 후보 텍스트에서 개인 키, GitHub 토큰, Google API 키·OAuth 비밀값·리프레시 토큰, AWS 키의 알려진 패턴을 검색했고 일치 파일은 0개였다. 인증 관련 코드·문서의 값도 확인했으며 테스트의 `client`, `secret`, `refresh` 등은 모의 값이다. package-lock의 다운로드 호스트는 registry.npmjs.org였다. 이는 모든 비밀정보 형태를 탐지하는 보증은 아니며, 운영 환경 파일과 로컬 상태 자체를 복사하지 않는 방식도 함께 적용했다.

`git check-ignore`로 .env, .dev.vars, .env.local, 키 파일, .wrangler, .sites-runtime, node_modules, dist 제외를 확인했고 .env.example은 공개 대상임을 확인했다. 원본 앱의 Git 이력은 가져오지 않고 제출 저장소에 소스 스냅샷을 추가했다.
