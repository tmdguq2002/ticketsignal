import test from 'node:test';import assert from 'node:assert/strict';
import {collectMelon,windowKst} from '../server/tickets.mjs';
const page=ids=>'<ul class="list_ticket_cont">'+ids.map(id=>`<li><a class="tit" href="detail.htm?csoonId=${id}">공연 ${id}</a><div class="ticket_data"><span class="date">2026.10.28 20:00</span></div></li>`).join('')+'</ul>';
const w=windowKst(new Date('2026-10-27T00:00:00Z'));
test('overlapping notices across Melon pages are deduplicated without discarding the source',async()=>{
 const pages=[[0,1,2,3,4,5,6,7,8,9],[9,10,11,12,13,14,15,16,17,18],[19]];let calls=0;
 const result=await collectMelon(w,async()=>new Response(page(pages[calls++])));
 assert.equal(result.events.length,20);assert.equal(new Set(result.events.map(e=>e.id)).size,20);assert.equal(result.duplicateRows,1);assert.equal(calls,3);
});
test('fully repeated full page still fails safely rather than silently returning incomplete data',async()=>{
 let calls=0;await assert.rejects(()=>collectMelon(w,async()=>{calls++;return new Response(page([0,1,2,3,4,5,6,7,8,9]));}),/pagination repeated/);assert.equal(calls,2);
});
