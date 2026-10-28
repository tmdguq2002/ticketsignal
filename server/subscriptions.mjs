import {normalizeKeywords,validateSubscription} from '../public/core.mjs';
import {groupEvents,performanceTitle} from '../public/grouping.mjs';
const HOUR=3600000,DAY=24*HOUR,CONSENT='2026-10-27-v1';
const iso=n=>new Date(n).toISOString();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export const hash=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
export function mailEnabled(c){return c.GMAIL_MODE==='live'&&c.SUBSCRIPTIONS_ENABLED==='true'&&typeof c.SUBSCRIPTION_SECRET==='string'&&c.SUBSCRIPTION_SECRET.length>=32&&/^https:\/\//.test(c.SITE_ORIGIN||'');}
function requireEnabled(c){if(!mailEnabled(c))throw Error('MAIL_DISABLED');}
async function hmac(c,value){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(c.SUBSCRIPTION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));}
export async function signUnsubscribe(c,id){return id+'.'+await hmac(c,'unsubscribe:'+id);}
async function limit(db,key,max,expires){return !!await db.prepare('INSERT INTO email_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count < ? RETURNING key').bind(key,expires,max).first();}
async function budget(db,now){return limit(db,'daily:'+iso(now).slice(0,10),200,iso(now+2*DAY));}
async function cleanup(db,now){await db.prepare('DELETE FROM email_pending WHERE expires_at < ?').bind(iso(now)).run();await db.prepare('DELETE FROM email_limits WHERE expires_at < ?').bind(iso(now)).run();await db.prepare('DELETE FROM email_deliveries WHERE created_at < ?').bind(iso(now-30*DAY)).run();}
export async function requestSubscription(db,c,body,ip,send,now=Date.now()){
 requireEnabled(c);
 if(typeof body?.email!=='string'||!Array.isArray(body.keywords)||body.keywords.some(k=>typeof k!=='string'))throw Error('INVALID_SUBSCRIPTION');
 const email=body.email.trim().toLowerCase(),keywords=normalizeKeywords(body.keywords.join(','));
 if(validateSubscription({email,keywords,consent:body.consent===true})||keywords.some(k=>k.length<2)||/[\r\n]/.test(email))throw Error('INVALID_SUBSCRIPTION');
 await cleanup(db,now);
 const generic={ok:true,message:'입력하신 주소로 확인 메일을 요청했습니다. 도착한 메일에서 확인을 완료해 주세요. 재요청은 10분 뒤 가능합니다.'};
 if(!await limit(db,'ip:'+await hash(ip)+':'+Math.floor(now/HOUR),5,iso(now+2*HOUR)))return generic;
 const cooldown=await db.prepare('INSERT INTO email_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE email_limits.expires_at<=? RETURNING key').bind('email:'+await hash(email),iso(now+600000),iso(now)).first();
 if(!cooldown)return generic;
 if(!await budget(db,now))return generic;
 const token=hex(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await hash(token);
 const row=await db.prepare('INSERT INTO email_pending (email,keywords,token_hash,expires_at,requested_at,consent_version) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET keywords=excluded.keywords,token_hash=excluded.token_hash,expires_at=excluded.expires_at,requested_at=excluded.requested_at,consent_version=excluded.consent_version WHERE email_pending.requested_at <= ? RETURNING email').bind(email,JSON.stringify(keywords),tokenHash,iso(now+DAY),iso(now),CONSENT,iso(now-600000)).first();
 if(!row)return generic;
 try{await send({to:email,subject:'[티켓시그널] 이메일 알림 구독을 확인해 주세요',text:`티켓시그널 이메일 알림 신청을 확인해 주세요.\n\n관심 키워드: ${keywords.join(', ')}\n\n다음 링크를 열고 확인 버튼을 누르면 구독이 활성화됩니다. (24시간 유효)\n${c.SITE_ORIGIN}/email/confirm#token=${token}\n\n기존 구독 변경도 확인 후 반영됩니다. 직접 신청하지 않았다면 이 메일을 무시하세요. 확인 전에는 공연 알림을 보내지 않습니다.\n알림은 오픈 24시간 전부터 매시간 확인하며, 늦게 발견된 일정은 오픈 전 다음 확인 때 발송됩니다. 각 알림 메일에서 구독을 해지할 수 있습니다.`});}catch{throw Error('CONFIRMATION_SEND_FAILED');}
 return generic;
}
export async function confirmSubscription(db,c,token,now=Date.now()){
 requireEnabled(c);if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return {active:false};
 // One atomic INSERT..SELECT applies a pending revision; replay does not create another subscriber.
 const pending=await db.prepare('SELECT * FROM email_pending WHERE token_hash=? AND expires_at>?').bind(await hash(token),iso(now)).first();
 if(!pending)return {active:false};
 const id=crypto.randomUUID();
 const row=await db.prepare('INSERT INTO email_subscriptions (id,email,keywords,verified_at,consent_version) SELECT ?,email,keywords,?,consent_version FROM email_pending WHERE token_hash=? AND expires_at>? ON CONFLICT(email) DO UPDATE SET keywords=excluded.keywords,verified_at=excluded.verified_at,consent_version=excluded.consent_version RETURNING id').bind(id,iso(now),await hash(token),iso(now)).first();
 if(!row)return {active:false};
 await db.prepare('DELETE FROM email_pending WHERE token_hash=?').bind(await hash(token)).run();
 return {active:true,unsubscribeToken:await signUnsubscribe(c,row.id)};
}
export async function unsubscribe(db,c,token){
 if(typeof token!=='string'||!/^[-a-f0-9]{36}\.[a-f0-9]{64}$/.test(token)||!c.SUBSCRIPTION_SECRET)return {removed:false};
 const [id,sig]=token.split('.');const expected=await hmac(c,'unsubscribe:'+id);let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^sig.charCodeAt(i);if(diff)return {removed:false};
 await db.prepare('DELETE FROM email_pending WHERE email IN (SELECT email FROM email_subscriptions WHERE id=?)').bind(id).run();
 await db.prepare('DELETE FROM email_subscriptions WHERE id=?').bind(id).run();
 await db.prepare('DELETE FROM email_deliveries WHERE subscription_id=?').bind(id).run();
 return {removed:true};
}
export async function runAlerts(db,c,snapshot,send,now=Date.now()){
 requireEnabled(c);await cleanup(db,now);const result={sent:0,failed:0,skipped:0,stale:false};
 if(!Number.isFinite(Date.parse(snapshot.updatedAt))||now-Date.parse(snapshot.updatedAt)>26*HOUR){result.stale=true;return result;}
 const subscribers=(await db.prepare('SELECT * FROM email_subscriptions ORDER BY verified_at').bind().all()).results;
 const groups=groupEvents(snapshot.events);let attempts=0;
 for(const sub of subscribers){
  const keywords=JSON.parse(sub.keywords).map(x=>x.normalize('NFKC').toLowerCase());
  for(const g of groups){
   const hay=(g.title+' '+g.schedules.map(x=>x.artist||'').join(' ')).normalize('NFKC').toLowerCase();if(!keywords.some(k=>hay.includes(k)))continue;
   const times=[...new Set(g.schedules.map(x=>x.opensAt))];
   for(const time of times){
    const opening=Date.parse(time);if(!Number.isFinite(opening)||opening<=now||opening>now+DAY)continue;
    if(attempts>=25)return result;
    const rows=g.schedules.filter(x=>x.opensAt===time);
    const key=await hash(performanceTitle(g.title).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')+'|'+(g.venue||'')+'|'+(g.performanceStart||'')+'|'+(g.performanceEnd||'')+'|'+time);
    const aliases=await Promise.all(rows.map(async e=>'source:'+await hash(e.platform+'|'+e.url+'|'+new Date(Date.parse(e.opensAt)).toISOString())));
    const keys=JSON.stringify([...new Set([key,...aliases])]);
    const prior=await db.prepare('SELECT event_key FROM email_deliveries WHERE subscription_id=? AND event_key IN (SELECT value FROM json_each(?)) LIMIT 1').bind(sub.id,keys).first();
    if(!prior&&!await budget(db,now))return result;
    // Claim the group and all immutable seller/opening aliases in one SQL statement.
    // Overlapping runs can only claim once, even when venue metadata is enriched later.
    const claim=(await db.prepare("INSERT OR IGNORE INTO email_deliveries (subscription_id,event_key,status,created_at) SELECT ?,value,CASE WHEN value=? THEN 'claimed' ELSE 'alias' END,? FROM json_each(?) WHERE EXISTS (SELECT 1 FROM email_subscriptions WHERE id=?) AND NOT EXISTS (SELECT 1 FROM email_deliveries WHERE subscription_id=? AND event_key IN (SELECT value FROM json_each(?))) RETURNING event_key").bind(sub.id,key,iso(now),keys,sub.id,sub.id,keys).all()).results;
    if(!claim.length){
     // Remember new seller aliases without resending the previously notified performance.
     await db.prepare("INSERT OR IGNORE INTO email_deliveries (subscription_id,event_key,status,created_at) SELECT ?,value,'alias',? FROM json_each(?) WHERE EXISTS (SELECT 1 FROM email_subscriptions WHERE id=?)").bind(sub.id,iso(now),keys,sub.id).run();
     result.skipped++;continue;
    }
    // Check again just before the external effect. An already in-flight message cannot be recalled.
    if(!await db.prepare('SELECT id FROM email_subscriptions WHERE id=?').bind(sub.id).first())continue;
    attempts++;
    const sellers={nol:'NOL 티켓',link:'티켓링크',melon:'멜론티켓',yes24:'YES24'};
    const text=`관심 키워드와 일치하는 공연의 티켓이 곧 열립니다.\n\n${g.title}\n오픈: ${new Date(opening).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})} KST\n\n${rows.map(e=>`${sellers[e.platform]||e.platform} · ${e.sale||'티켓 오픈'}\n${e.url}`).join('\n\n')}\n\n공식 공지에서 변경·취소와 예매 조건을 확인해 주세요. 늦게 발견하거나 등록한 일정은 24시간보다 가까운 시점에 안내될 수 있습니다.\n\n구독 해지 및 저장 정보 삭제:\n${c.SITE_ORIGIN}/email/unsubscribe#token=${await signUnsubscribe(c,sub.id)}\n\n티켓시그널: ${c.SITE_ORIGIN}`;
    try{await send({to:sub.email,subject:`[티켓시그널] ${g.title}`.slice(0,190).replace(/[\r\n]/g,' '),text});await db.prepare("UPDATE email_deliveries SET status='accepted' WHERE subscription_id=? AND event_key=?").bind(sub.id,key).run();result.sent++;}
    catch(e){await db.prepare("UPDATE email_deliveries SET status='failed',error=? WHERE subscription_id=? AND event_key=?").bind(/^GMAIL_[A-Z_0-9]+$/.test(e.message)?e.message:'SEND_FAILED',sub.id,key).run();result.failed++;}
   }
  }
 }
 return result;
}
export async function mailStats(db){const subscriptions=await db.prepare('SELECT COUNT(*) n FROM email_subscriptions').bind().first();const deliveries=(await db.prepare("SELECT status,COUNT(*) n FROM email_deliveries WHERE status!='alias' GROUP BY status").bind().all()).results;return {activeSubscriptions:subscriptions.n,deliveries};}
