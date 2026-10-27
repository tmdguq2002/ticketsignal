import {env} from 'cloudflare:workers';
import {publicSnapshot} from '../../../server/store';
import {groupEvents} from '../../../public/grouping.mjs';
import {readInterests,setInterest} from '../../../server/interest-store.mjs';
const COOKIE='ticket_browser';
function identity(request:Request){const v=request.headers.get('cookie')?.match(/(?:^|;\s*)ticket_browser=([a-f0-9-]{36})(?:;|$)/)?.[1];return v||crypto.randomUUID();}
function reply(request:Request,visitor:string,data:unknown,status=200){return Response.json(data,{status,headers:{'cache-control':'private, no-store','set-cookie':`${COOKIE}=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`}});}
const allowed=(r:Request)=>r.headers.get('origin')===new URL(r.url).origin;
export async function GET(request:Request){const visitor=identity(request);try{const groups=groupEvents((await publicSnapshot()).events);return reply(request,visitor,await readInterests((env as any).DB,groups,visitor));}catch{return reply(request,visitor,{error:'관심 수를 불러오지 못했습니다.'},503);}}
export async function POST(request:Request){const visitor=identity(request);if(!allowed(request))return reply(request,visitor,{error:'허용되지 않은 요청입니다.'},403);
 try{if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(request,visitor,{error:'JSON 요청이 필요합니다.'},415);
 const text=await request.text();if(text.length>2048)return reply(request,visitor,{error:'요청이 너무 큽니다.'},413);const body=JSON.parse(text);
 if(typeof body.eventId!=='string'||typeof body.saved!=='boolean')return reply(request,visitor,{error:'잘못된 관심 요청입니다.'},400);
 const groups=groupEvents((await publicSnapshot()).events);const group=groups.find(g=>g.schedules.some(e=>e.id===body.eventId));if(!group)return reply(request,visitor,{error:'현재 목록에서 공연을 찾을 수 없습니다.'},404);
 await setInterest((env as any).DB,group,visitor,body.saved);return reply(request,visitor,await readInterests((env as any).DB,groups,visitor));
 }catch{return reply(request,visitor,{error:'관심 저장에 실패했습니다. 다시 시도해 주세요.'},503);}}
export async function DELETE(request:Request){const visitor=identity(request);if(!allowed(request))return reply(request,visitor,{error:'허용되지 않은 요청입니다.'},403);try{await (env as any).DB.prepare('DELETE FROM ticket_interests WHERE visitor_id = ?').bind(visitor).run();return reply(request,visitor,{ok:true});}catch{return reply(request,visitor,{error:'관심 삭제에 실패했습니다.'},503);}}
