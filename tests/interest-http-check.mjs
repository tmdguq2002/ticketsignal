// Run against a local preview after applying D1 migrations. Cleans up its own votes.
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:5173';
async function browser(){const r=await fetch(base+'/api/interests');assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],data:await r.json()};}
const a=await browser(),b=await browser();
const snapshot=await (await fetch(base+'/api/events')).json();const {groupEvents}=await import('../public/grouping.mjs');const group=groupEvents(snapshot.events)[0];const id=group.schedules[0].id;const initial=a.data.counts[group.id]||0;
const req=(visitor,method,body,origin=base)=>fetch(base+'/api/interests',{method,headers:{cookie:visitor.cookie,origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
const save=async(visitor,saved)=>{const r=await req(visitor,'POST',{eventId:id,saved});assert.equal(r.status,200);return r.json();};
try{
 assert.equal((await save(a,true)).counts[group.id],initial+1);
 assert.equal((await save(a,true)).counts[group.id],initial+1);
 assert.equal((await save(b,true)).counts[group.id],initial+2);
 const reload=await (await fetch(base+'/api/interests',{headers:{cookie:a.cookie}})).json();assert.ok(reload.favorites.includes(id));
 assert.equal((await save(a,false)).counts[group.id],initial+1);
 assert.equal((await req(a,'POST',{eventId:id,saved:true},'https://untrusted.example')).status,403);
 assert.equal((await req(a,'POST',{eventId:'not-a-real-event',saved:true})).status,404);
 console.log(JSON.stringify({passed:7,checks:['first registration +1','repeat stays +1','second browser +2','reload persists','remove decrements','cross-origin rejected','unknown event rejected'],initialCount:initial,firstSeenAt:snapshot.events[0].firstSeenAt}));
}finally{await req(a,'DELETE');await req(b,'DELETE');}
