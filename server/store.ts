import {env} from 'cloudflare:workers';
import seed from './initial-snapshot.json';
import {enrichFirstSeen,carryFirstSeen} from './interest-store.mjs';
import {collectAll,inWindow,windowKst} from './tickets.mjs';
const KEY='ticket-openings/v1/snapshot.json';
export async function readSnapshot(){
 const bucket=(env as any).BUCKET;
 if(!bucket)throw new Error('Ticket storage unavailable');
 const object=await bucket.get(KEY);
 return object?await object.json():seed;
}
export async function publicSnapshot(){const data=await enrichFirstSeen((env as any).DB,await readSnapshot());const window=windowKst();return {...data,window,events:data.events.filter((e:any)=>inWindow(e.opensAt,window)),stale:Date.now()-Date.parse(data.updatedAt)>26*3600000};}
export async function refreshSnapshot(){
 const previous=await readSnapshot();
 await enrichFirstSeen((env as any).DB,previous);
 const next=carryFirstSeen(previous,await collectAll(previous));
 const enriched=await enrichFirstSeen((env as any).DB,next);
 if(enriched.firstSeenAvailable)next.events=enriched.events;
 await (env as any).BUCKET.put(KEY,JSON.stringify(next),{httpMetadata:{contentType:'application/json'}});
 const stored=await readSnapshot();
 return {updatedAt:stored.updatedAt,count:stored.events.length,sources:stored.sources,window:stored.window};
}
export function isOwner(request:Request){const expected=(env as any).REFRESH_OWNER_EMAIL;const identity=request.headers.get('oai-authenticated-user-email');return !!expected&&!!identity&&identity.toLowerCase()===String(expected).toLowerCase();}
