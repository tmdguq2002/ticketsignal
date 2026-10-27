import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalRepository,eventRepository} from '../public/repositories.mjs';
import {escapeHtml} from '../public/core.mjs';
test('storage survives reload and clear removes personal information',()=>{
 const data=new Map();const store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const repository=createLocalRepository(store);const value={favorites:['luna'],subscription:{email:'demo@example.com',keywords:['루나'],timing:['day'],createdAt:'2026-10-22'}};
 repository.save(value);assert.deepEqual(createLocalRepository(store).load(),value);repository.clear();assert.deepEqual(repository.load(),{favorites:[],subscription:null});assert.equal(data.size,0);
});
test('corrupt or blocked browser storage recovers to an empty state',()=>{
 for(const getItem of [()=>'{broken',()=>{throw Error('blocked')},()=>JSON.stringify({favorites:[],subscription:{email:'a',keywords:[null]}})]){
  assert.deepEqual(createLocalRepository({getItem}).load(),{favorites:[],subscription:null});
 }
});
test('user provided HTML is escaped before rendering',()=>{
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('public repository loads server events and preserves official links',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>({events:[{id:'nol-1',platform:'nol',opensAt:'2026-10-26T12:00:00+09:00',url:'https://nol.yanolja.com/ticket/products/26012345'}]})});
 try{const events=await eventRepository.list();assert.equal(events.length,1);assert.equal(events[0].time,'12:00');assert.match(events[0].url,/products\/26012345$/);}finally{globalThis.fetch=original;}
});
