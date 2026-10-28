import {env} from 'cloudflare:workers';
import {requestSubscription,confirmSubscription,unsubscribe,mailEnabled} from '../../../server/subscriptions.mjs';
import {sendEmail} from '../../../server/gmail.mjs';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer'}});
export async function GET(){return reply({enabled:mailEnabled(env)});}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'허용되지 않은 요청입니다.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON 요청이 필요합니다.'},415);
 try{
  const raw=await request.text();if(raw.length>4096)return reply({error:'요청이 너무 큽니다.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'잘못된 요청입니다.'},400);}
  const db=(env as any).DB;
  if(body?.action==='confirm')return reply(await confirmSubscription(db,env,body.token));
  if(body?.action==='unsubscribe')return reply(await unsubscribe(db,env,body.token));
  if(body?.action!=='subscribe')return reply({error:'잘못된 요청입니다.'},400);
  const result=await requestSubscription(db,env,body,request.headers.get('cf-connecting-ip')||'unknown',(message:any)=>sendEmail(env,message));
  return reply(result);
 }catch(e){const code=(e as Error).message;return reply({error:code==='INVALID_SUBSCRIPTION'?'이메일, 관심 키워드(각 2~40자, 최대 10개), 동의를 확인해 주세요.':code==='MAIL_DISABLED'?'이메일 알림을 준비 중입니다. 잠시 후 다시 시도해 주세요.':'메일 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},code==='INVALID_SUBSCRIPTION'?400:503);}
}
