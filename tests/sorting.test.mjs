import test from 'node:test';import assert from 'node:assert/strict';
import {filterEvents} from '../public/core.mjs';
import {sortGroups} from '../public/grouping.mjs';
const now=Date.parse('2026-10-26T23:00:00+09:00');
const event=(id,offset)=>({id,title:id,artist:id,opensAt:new Date(now+offset).toISOString(),day:0});
test('72 hours includes now and exact upper boundary; excludes past, +1ms, invalid',()=>{
 const rows=[event('past',-1),event('now',0),event('end',72*3600000),event('later',72*3600000+1),{...event('bad',0),opensAt:'invalid'}];
 assert.deepEqual(filterEvents(rows,{range:'three',now}).map(e=>e.id),['now','end']);
});
const group=(id,offset,count,first)=>({id,interestCount:count,firstSeenAt:first,visibleSchedules:[event(id,offset)]});
test('three sorts use next visible opening, real counts and first seen with deterministic ties',()=>{
 const a=group('a',1000,1,'2026-10-25T00:00:00Z'),b=group('b',2000,3,'2026-10-24T00:00:00Z'),c=group('c',-1000,0,'2026-10-26T00:00:00Z');
 assert.deepEqual(sortGroups([c,b,a],'opening',now).map(g=>g.id),['a','b','c']);
 assert.deepEqual(sortGroups([a,c,b],'popular',now).map(g=>g.id),['b','a','c']);
 assert.deepEqual(sortGroups([a,b,c],'newest',now).map(g=>g.id),['c','a','b']);
 assert.equal(a.visibleSchedules.length,1);
});
