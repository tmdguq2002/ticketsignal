import {env} from 'cloudflare:workers';
import seed from './initial-snapshot.json';
import {enrichFirstSeen,carryFirstSeen} from './interest-store.mjs';
import {collectAll,collectFailed,retryAllowedNow,inWindow,windowKst} from './tickets.mjs';
import {withRefreshLease} from './refresh-lock.mjs';
const KEY='ticket-openings/v1/snapshot.json';
export async function readSnapshot(){
 const bucket=(env as any).BUCKET;
 if(!bucket)throw new Error('Ticket storage unavailable');
 const object=await bucket.get(KEY);
 return object?await object.json():seed;
}
export async function publicSnapshot(){const data=await enrichFirstSeen((env as any).DB,await readSnapshot());const window=windowKst();return {...data,window,events:data.events.filter((e:any)=>inWindow(e.opensAt,window)),stale:Date.now()-Date.parse(data.updatedAt)>26*3600000};}
export async function refreshSnapshot({retryOnly=false}={}){
 if(retryOnly&&!retryAllowedNow(new Date()))return {skipped:true,reason:'daily_refresh_priority_window'};
 return withRefreshLease((env as any).DB,async({assertHeld,fetcher}:any)=>{
 const previous=await readSnapshot();
 const collected=await (retryOnly?collectFailed:collectAll)(previous,new Date(),fetcher);
 if(collected===previous)return {skipped:true,reason:'no_failed_sources_due',sources:previous.sources};
 await enrichFirstSeen((env as any).DB,previous);
 const next=carryFirstSeen(previous,{...collected,updatedAt:retryOnly?collected.lastRetryAt:collected.updatedAt});
 next.updatedAt=collected.updatedAt;
 const enriched=await enrichFirstSeen((env as any).DB,next);
 if(enriched.firstSeenAvailable)next.events=enriched.events;
 await assertHeld();
 await (env as any).BUCKET.put(KEY,JSON.stringify(next),{httpMetadata:{contentType:'application/json'}});
 const stored=await readSnapshot();
 return {updatedAt:stored.updatedAt,lastRetryAt:stored.lastRetryAt||null,count:stored.events.length,sources:stored.sources,window:stored.window};
 });
}
export function isOwner(request:Request){const expected=(env as any).REFRESH_OWNER_EMAIL;const identity=request.headers.get('oai-authenticated-user-email');return !!expected&&!!identity&&identity.toLowerCase()===String(expected).toLowerCase();}
