import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {annotateFirstSeen,readInterests,setInterest} from '../server/interest-store.mjs';
function database(){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_lucky_scrambler.sql',import.meta.url),'utf8'));return {prepare(query){const stmt=sql.prepare(query);return {bind(...args){return {run:async()=>stmt.run(...args),all:async()=>({results:stmt.all(...args)})};}}},async batch(statements){sql.exec('BEGIN');try{const r=await Promise.all(statements.map(s=>s.run()));sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};}
const a={id:'a',platform:'nol',url:'https://nol.yanolja.com/ticket/products/1'};
const b={id:'b',platform:'link',url:'https://www.ticketlink.co.kr/product/2'};
const g={id:'a',schedules:[a,b]};
test('first seen survives refresh and new sale IDs for same product; new product gets actual new time',async()=>{
 const db=database();let e=await annotateFirstSeen(db,[a],'2026-10-24T00:00:00Z');assert.equal(e[0].firstSeenAt,'2026-10-24T00:00:00Z');
 e=await annotateFirstSeen(db,[{...a,id:'new-round'},b],'2026-10-26T00:00:00Z');assert.equal(e[0].firstSeenAt,'2026-10-24T00:00:00Z');assert.equal(e[1].firstSeenAt,'2026-10-26T00:00:00Z');
});
test('real SQLite unique keys make repeat saves idempotent; distinct browsers count once per grouped performance',async()=>{
 const db=database();await setInterest(db,g,'browser-a',true);await setInterest(db,g,'browser-a',true);
 let r=await readInterests(db,[g],'browser-a');assert.equal(r.counts.a,1);assert.deepEqual(new Set(r.favorites),new Set(['a','b']));
 await setInterest(db,g,'browser-b',true);r=await readInterests(db,[g],'browser-a');assert.equal(r.counts.a,2);
 await setInterest(db,g,'browser-a',false);r=await readInterests(db,[g],'browser-a');assert.equal(r.counts.a,1);assert.deepEqual(r.favorites,[]);
 await setInterest(db,g,'browser-a',false);assert.equal((await readInterests(db,[g],'browser-b')).counts.a,1);
});
test('counts deduplicate a browser when previously separate seller groups merge',async()=>{
 const db=database();await setInterest(db,{schedules:[a]},'same',true);await setInterest(db,{schedules:[b]},'same',true);assert.equal((await readInterests(db,[g],'same')).counts.a,1);
});

test('snapshot enrichment failure preserves the event feed and explicitly marks timestamps unavailable',async()=>{
 const {enrichFirstSeen}=await import('../server/interest-store.mjs');
 const snapshot={events:[a],updatedAt:'2026-10-24T00:00:00Z'};const r=await enrichFirstSeen({prepare(){throw Error('DB down');}},snapshot);
 assert.equal(r.events.length,1);assert.equal(r.events[0].id,a.id);assert.equal(r.firstSeenAvailable,false);assert.equal(r.events[0].firstSeenAt,null);
});
test('refresh bootstrap preserves the prior collection time even before first public read',async()=>{
 const {carryFirstSeen}=await import('../server/interest-store.mjs');const db=database();
 const previous={events:[a],updatedAt:'2026-10-24T00:00:00Z'},next={events:[{...a,id:'new-round'},b],updatedAt:'2026-10-26T00:00:00Z'};
 const carried=carryFirstSeen(previous,next);const rows=await annotateFirstSeen(db,carried.events,carried.updatedAt);
 assert.equal(rows[0].firstSeenAt,previous.updatedAt);assert.equal(rows[1].firstSeenAt,next.updatedAt);
 const after=carryFirstSeen(carried,{events:[a],updatedAt:'2026-10-27T00:00:00Z'});assert.equal(after.events[0].firstSeenAt,previous.updatedAt);
});
