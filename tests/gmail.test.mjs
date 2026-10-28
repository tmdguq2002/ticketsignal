import test from 'node:test';
import assert from 'node:assert/strict';
import {gmailStatus,sendTestEmail} from '../server/gmail.mjs';
const config={GMAIL_CLIENT_ID:'client',GMAIL_CLIENT_SECRET:'secret',GMAIL_REFRESH_TOKEN:'refresh',GMAIL_SENDER_EMAIL:'sender@gmail.com',GMAIL_MODE:'test'};
test('disabled or incomplete credentials block all network requests',async()=>{
 assert.equal(gmailStatus({}).ready,false);
 for(const c of [{},{...config,GMAIL_MODE:'disabled'},{...config,GMAIL_REFRESH_TOKEN:''}])await assert.rejects(()=>sendTestEmail(c,{to:config.GMAIL_SENDER_EMAIL,subject:'test',text:'hello'},()=>{throw Error('network should not be reached');}),/GMAIL_NOT_READY/);
});
test('test mode only permits sender and rejects header injection',async()=>{
 for(const to of ['other@gmail.com','sender@gmail.com\r\nBcc: other@gmail.com'])await assert.rejects(()=>sendTestEmail(config,{to,subject:'test',text:'hello'}),/GMAIL_TEST_RECIPIENT/);
 await assert.rejects(()=>sendTestEmail(config,{to:config.GMAIL_SENDER_EMAIL,subject:'test\r\nBcc: victim',text:'hello'}),/INVALID_MESSAGE/);
});
test('refreshes token and encodes Korean message with one recipient',async()=>{
 const requests=[];const fetcher=async(url,opts)=>{requests.push({url,opts});return Response.json(requests.length===1?{access_token:'access'}:{id:'message-id'});};
 const result=await sendTestEmail(config,{to:config.GMAIL_SENDER_EMAIL,subject:'티켓시그널 연결 확인',text:'공연 오픈 알림 테스트'},fetcher);
 assert.equal(result.messageId,'message-id');assert.equal(requests.length,2);assert.equal(new URLSearchParams(requests[0].opts.body).get('grant_type'),'refresh_token');
 const mime=Buffer.from(JSON.parse(requests[1].opts.body).raw,'base64url').toString();assert.match(mime,/To: sender@gmail.com/);assert.match(mime,/Subject: =\?UTF-8\?B\?/);assert.ok(mime.includes(Buffer.from('공연 오픈 알림 테스트').toString('base64')));assert.ok(!mime.includes('refresh'));assert.equal(requests[1].opts.headers.Authorization,'Bearer access');
});
test('authentication failures are redacted and never send a message',async()=>{
 let calls=0;await assert.rejects(()=>sendTestEmail(config,{to:config.GMAIL_SENDER_EMAIL,subject:'test',text:'hello'},async()=>{calls++;return new Response('secret refresh token',{status:400});}),/^Error: GMAIL_AUTH_FAILED_400$/);assert.equal(calls,1);
});
test('ambiguous send failure is not retried',async()=>{
 let calls=0;await assert.rejects(()=>sendTestEmail(config,{to:config.GMAIL_SENDER_EMAIL,subject:'test',text:'hello'},async()=>{calls++;if(calls===1)return Response.json({access_token:'access'});throw Error('contains credentials');}),/^Error: GMAIL_DELIVERY_UNKNOWN$/);assert.equal(calls,2);
});

test('live transport permits recipients only in live mode; test transport remains sender-only',async()=>{
 const {sendEmail}=await import('../server/gmail.mjs');
 await assert.rejects(()=>sendEmail(config,{to:'other@example.com',subject:'a',text:'b'}),/GMAIL_NOT_LIVE/);
 const mock=async url=>Response.json(url.includes('oauth2')?{access_token:'fake'}:{id:'accepted'});
 assert.equal((await sendEmail({...config,GMAIL_MODE:'live'},{to:'other@example.com',subject:'a',text:'b'},mock)).status,'accepted');
 await assert.rejects(()=>sendTestEmail({...config,GMAIL_MODE:'live'},{to:'other@example.com',subject:'a',text:'b'},mock),/GMAIL_TEST_RECIPIENT/);
});
