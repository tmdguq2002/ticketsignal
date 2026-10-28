# 운영 이메일 알림 검증

검증일: 2026-10-28 (KST).

- 배포: 버전 7, 소스 `e53f28b9cee5769000f850429c29e908f0d191c7`, 환경 revision 4, 배포 succeeded.
- Gmail 상태: live, ready true, 누락 변수 없음, publicSubscriptionsEnabled true.
- 운영 소유자 도구 send_due_ticket_alerts 호출: sent 0, failed 0, skipped 0, stale false. 당시 활성 구독은 0개였다. 미확인 이메일에 발송하지 않음을 확인했다.
- 매시간 정각 Asia/Seoul 예약 저장 및 활성화. 첫 예약 시각 2026-10-28 11:00 KST. 예약 ID `Automation_dac4ab98c2748191a244e8ed1aa11a0c`. 예약 저장은 실제 미래 실행의 성공 증거와 구분한다.
- 기존 매일 06시 수집 예약은 유지. 공개 API의 최근 수집은 2026-10-28 06:00:35 KST였다.
- 사용자에게 검증 키워드 선택을 요청했고 “아무거나 너가 정해서 해줘”라는 답을 받았다. 오늘 14시 오픈 예정인 테이 콘서트에 맞춰 ‘테이’를 선택했다.
- 운영 구독 API로 기존 본인 Gmail 주소에 확인 메일 요청. HTTP 200과 요청 접수 응답 확인. 이메일 주소·토큰은 이 공개 문서에 기록하지 않는다.
- 사용자에게 이메일 링크의 ‘구독 확인하기’를 눌러달라고 요청했다. 실제 구독 활성화·공연 알림·해지의 운영 검증은 확인 완료 후 이어서 진행한다.

자동 테스트 46개, 로컬 HTTP 검사 9개 및 리뷰 결과는 [구현 기록](email-alerts.md)에 있다. [자동 테스트 실행 로그](evidence/email-alert-tests-2026-10-28.txt).
