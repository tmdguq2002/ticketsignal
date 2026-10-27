import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeKeywords, validateSubscription, filterEvents} from '../public/core.mjs';
test('keywords trim, deduplicate case-insensitively, and omit blanks',()=>{
  assert.deepEqual(normalizeKeywords(' 아이유, IU, iu, , 아이유 '),['아이유','IU']);
});
test('subscription rejects invalid email, no keywords and missing consent',()=>{
  assert.ok(validateSubscription({email:'bad',keywords:['IU'],consent:true}));
  assert.ok(validateSubscription({email:'a@example.com',keywords:[],consent:true}));
  assert.ok(validateSubscription({email:'a@example.com',keywords:['IU'],consent:false}));
  assert.equal(validateSubscription({email:'a@example.com',keywords:['IU'],consent:true}),'');
});
const events=[{id:'a',title:'IU Live',artist:'아이유',platform:'nol',category:'콘서트',day:1},{id:'b',title:'뮤지컬 꿈',artist:'극단',platform:'yes24',category:'뮤지컬',day:4}];
test('search supports Korean artist and case-insensitive title with combined filters',()=>{
 assert.deepEqual(filterEvents(events,{query:'아이유',platform:'nol',category:'콘서트',range:'week',view:'all',favorites:[]}).map(e=>e.id),['a']);
 assert.equal(filterEvents(events,{query:'iu',platform:'yes24'}).length,0);
 assert.equal(filterEvents(events,{query:'iu'}).length,1);
});
test('favorites and date range actually narrow results',()=>{
 assert.equal(filterEvents(events,{view:'saved',favorites:['b']})[0].id,'b');
 assert.equal(filterEvents(events,{range:'today'}).length,0);
});
