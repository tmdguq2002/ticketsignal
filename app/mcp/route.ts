import {env} from 'cloudflare:workers';
import {gmailStatus} from '../../server/gmail.mjs';
import {isOwner,publicSnapshot,refreshSnapshot} from '../../server/store';
const tools=[
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
   if(['refresh_ticket_openings','get_gmail_setup_status'].includes(name)&&!isOwner(request))return reply({isError:true,content:[{type:'text',text:'Only the authenticated site owner can use this operation.'}]});
   try{let data;if(name==='get_gmail_setup_status')data=gmailStatus(env);else if(name==='refresh_ticket_openings')data=await refreshSnapshot();else if(name==='get_ticket_openings_status'){const s=await publicSnapshot();data={updatedAt:s.updatedAt,count:s.events.length,sources:s.sources,window:s.window,stale:s.stale};}else throw Error('Unknown tool');return reply({content:[{type:'text',text:JSON.stringify(data)}]});}catch(e){return reply({isError:true,content:[{type:'text',text:String((e as Error).message)}]});}
  }
  default:return Response.json({jsonrpc:'2.0',id:message.id??null,error:{code:-32601,message:'Method not found'}});
 }
}
