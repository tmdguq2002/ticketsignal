import {env} from 'cloudflare:workers';
import {gmailStatus,sendEmail} from '../../server/gmail.mjs';
import {isOwner,publicSnapshot,refreshSnapshot} from '../../server/store';
import {runAlerts,mailStats} from '../../server/subscriptions.mjs';
const tools=[
 {name:'retry_failed_ticket_openings',description:'Owner-only: retry only failed ticket sources whose backoff has elapsed. Healthy sources are untouched. Delays are 30, 60, 120 minutes; at most three retries until daily full collection resets the budget. No emails are sent.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
 {name:'send_due_ticket_alerts',description:'Owner-only: send due opening reminder emails only to confirmed opt-in subscribers. Checks the next 24 hours, records deduplication, skips stale data, caps 25 sends per call and 200 emails per UTC day. Returns counts only.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}},
 {name:'get_email_alert_status',description:'Owner-only: inspect email alert counts and readiness without exposing recipients or tokens.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'get_gmail_setup_status',description:'Owner-only: inspect Gmail configuration readiness without exposing credentials. Does not send mail.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'get_ticket_openings_status',description:'Read ticket source health, last refresh and event count for Ticket Signal.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'refresh_ticket_openings',description:'Owner-only: collect four official ticket-opening notice sources for today through 13 days ahead in Asia/Seoul, save the snapshot and read back source status. Sends no email.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}}
];
export async function POST(request:Request){
 let message:any;try{message=await request.json();}catch{return Response.json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON'}},{status:400});}
 const reply=(result:unknown)=>Response.json({jsonrpc:'2.0',id:message.id??null,result});
 switch(message.method){
  case 'server/discover':return reply({supportedVersions:['2026-07-28','2025-03-26','2024-11-05'],capabilities:{tools:{}},serverInfo:{name:'ticket-signal',version:'2.0.0'}});
  case 'initialize':return reply({protocolVersion:message.params?.protocolVersion||'2026-07-28',capabilities:{tools:{}},serverInfo:{name:'ticket-signal',version:'2.0.0'}});
  case 'notifications/initialized':return new Response(null,{status:202});
  case 'ping':return reply({});
  case 'tools/list':return reply({tools});
  case 'tools/call':{
   const name=message.params?.name;
   if(['retry_failed_ticket_openings','refresh_ticket_openings','get_gmail_setup_status','send_due_ticket_alerts','get_email_alert_status'].includes(name)&&!isOwner(request))return reply({isError:true,content:[{type:'text',text:'Only the authenticated site owner can use this operation.'}]});
   try{let data;if(name==='retry_failed_ticket_openings')data=await refreshSnapshot({retryOnly:true});else if(name==='send_due_ticket_alerts')data=await runAlerts((env as any).DB,env,await publicSnapshot(),(message:any)=>sendEmail(env,message));else if(name==='get_email_alert_status')data={...gmailStatus(env),...await mailStats((env as any).DB)};else if(name==='get_gmail_setup_status')data=gmailStatus(env);else if(name==='refresh_ticket_openings')data=await refreshSnapshot();else if(name==='get_ticket_openings_status'){const s=await publicSnapshot();data={updatedAt:s.updatedAt,lastRetryAt:s.lastRetryAt||null,count:s.events.length,sources:s.sources,window:s.window,stale:s.stale};}else throw Error('Unknown tool');return reply({content:[{type:'text',text:JSON.stringify(data)}]});}catch(e){return reply({isError:true,content:[{type:'text',text:String((e as Error).message)}]});}
  }
  default:return Response.json({jsonrpc:'2.0',id:message.id??null,error:{code:-32601,message:'Method not found'}});
 }
}
