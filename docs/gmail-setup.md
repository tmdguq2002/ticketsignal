# Gmail 계정 연결 준비

현재 구현: 서버 발송 어댑터와 소유자 전용 설정 상태 조회. 기본 발송 모드는 disabled이며 실제 메일을 아직 보내지 않았다. 공개 구독 폼은 여전히 브라우저 데모다.

## 사용자 준비

1. 발송용 Gmail 주소를 정한다. 비밀번호를 공유하지 않는다.
2. Google Cloud Console에서 프로젝트를 선택/생성하고 Gmail API를 활성화한다.
3. Google Auth Platform에서 앱 정보를 설정한다. 개인 Gmail은 External audience, 개발 중에는 발신 계정을 Test users에 추가한다.
4. 발송 권한 `https://www.googleapis.com/auth/gmail.send`만 요청한다. 메일 읽기/삭제 권한은 필요 없다.
5. OAuth 클라이언트를 생성하고 소유자 인증을 진행한다. 웹 클라이언트로 Google OAuth Playground를 사용한다면 승인된 리디렉션 URI는 `https://developers.google.com/oauthplayground`이고 Playground의 Use your own OAuth credentials를 켜서 본인 클라이언트를 사용한다.
6. 발신 Gmail 계정으로 승인해 offline refresh token을 얻는다. 클라이언트 시크릿과 refresh token은 채팅, Git, 브라우저 앱 코드에 넣지 않고 Sites 서버 비밀 환경 변수로 저장한다.

## 서버 변수

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET` (secret)
- `GMAIL_REFRESH_TOKEN` (secret)
- `GMAIL_SENDER_EMAIL`
- `GMAIL_MODE`: 설정 전 disabled, 본인에게만 테스트할 때 test

환경 변수를 적용하려면 Sites 저장 버전을 다시 배포한다. `get_gmail_setup_status`는 소유자만 호출하며 누락된 변수 이름과 준비 여부만 반환한다. 토큰/비밀 값은 반환하지 않는다.

## 활성화 전 남은 작업

발신자 설정과 본인 수신 테스트 후 서버 구독 DB, 이메일 확인/해지, 동의 기록, 요청 제한, 중복 방지 발송 큐를 구현하고 검증한다. 현재 daily 데이터 갱신 작업은 메일을 발송하지 않는다. 계정 연결만으로 공개 발송 완료라고 표시하지 않는다.

Google OAuth 앱이 External/Testing 상태이면 Gmail 범위 refresh token이 7일 뒤 만료될 수 있다. 지속 운영 전에 앱 게시 상태와 해당 계정의 Google 정책을 확인한다. Gmail API 쿼터와 메일 계정의 발송 제한은 서로 다르다.

참고:
- https://developers.google.com/workspace/gmail/api/auth/web-server
- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/identity/protocols/oauth2/
