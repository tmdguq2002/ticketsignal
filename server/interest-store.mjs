// Stable per-seller product identity: ticket-opening round IDs may change.
export const productKey=e=>e.platform+'|'+(e.url||e.id);
const keys=g=>[...new Set(g.schedules.map(productKey))];
export async function annotateFirstSeen(db,events,observedAt){
 const unique=[...new Set(events.map(productKey))];if(!unique.length)return events;
 const existing=await db.prepare('SELECT source_key, first_seen_at FROM product_first_seen WHERE source_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(unique)).all();
 const known=new Map(existing.results.map(r=>[r.source_key,r.first_seen_at]));
 const observed=new Map();for(const e of events){const k=productKey(e);const time=e.firstSeenAt||observedAt;if(!observed.has(k)||time<observed.get(k))observed.set(k,time);}
 const missing=unique.filter(k=>!known.has(k));
 for(let i=0;i<missing.length;i+=80)await db.batch(missing.slice(i,i+80).map(k=>db.prepare('INSERT OR IGNORE INTO product_first_seen (source_key, first_seen_at) VALUES (?, ?)').bind(k,observed.get(k))));
 // Read stored winners after concurrent inserts; never overwrite the first observation.
 const saved=await db.prepare('SELECT source_key, first_seen_at FROM product_first_seen WHERE source_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(unique)).all();
 const times=new Map(saved.results.map(r=>[r.source_key,r.first_seen_at]));return events.map(e=>({...e,firstSeenAt:times.get(productKey(e))}));
}
export async function readInterests(db,groups,visitor){
 const mapping=groups.flatMap(g=>keys(g).map(sourceKey=>({groupId:g.id,sourceKey})));
 const result=await db.prepare(`SELECT json_extract(m.value, '$.groupId') AS group_id, count(DISTINCT i.visitor_id) AS count FROM json_each(?) m JOIN ticket_interests i ON i.source_key = json_extract(m.value, '$.sourceKey') GROUP BY group_id`).bind(JSON.stringify(mapping)).all();
 const counts=Object.fromEntries(groups.map(g=>[g.id,0]));for(const r of result.results)counts[r.group_id]=Number(r.count);
 const mine=await db.prepare('SELECT source_key FROM ticket_interests WHERE visitor_id = ?').bind(visitor).all();const saved=new Set(mine.results.map(r=>r.source_key));
 return {counts,favorites:groups.filter(g=>keys(g).some(k=>saved.has(k))).flatMap(g=>g.schedules.map(e=>e.id))};
}
export async function setInterest(db,group,visitor,saved){
 await db.batch(keys(group).map(k=>db.prepare(saved?'INSERT OR IGNORE INTO ticket_interests (visitor_id, source_key) VALUES (?, ?)':'DELETE FROM ticket_interests WHERE visitor_id = ? AND source_key = ?').bind(visitor,k)));
}

export function carryFirstSeen(previous,next){
 const known=new Map();for(const e of previous.events||[]){const k=productKey(e),time=e.firstSeenAt||previous.updatedAt;if(!known.has(k)||time<known.get(k))known.set(k,time);}
 return {...next,events:next.events.map(e=>({...e,firstSeenAt:known.get(productKey(e))||e.firstSeenAt||next.updatedAt}))};
}
export async function enrichFirstSeen(db,snapshot){
 try{return {...snapshot,events:await annotateFirstSeen(db,snapshot.events,snapshot.updatedAt),firstSeenAvailable:true};}
 catch{return {...snapshot,events:snapshot.events.map(e=>({...e,firstSeenAt:null})),firstSeenAvailable:false};}
}
