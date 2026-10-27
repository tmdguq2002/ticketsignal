import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupEvents,filterGroups,isGroupSaved,toggleGroupFavorite} from '../public/grouping.mjs';
const event=(id,platform='nol',extra={})=>({id,platform,title:'2026 백지영 콘서트 〈백일몽〉-서울',venue:'코엑스 D홀',url:`https://example.com/${platform}/${id}`,opensAt:'2026-10-28T18:00:00+09:00',sale:'일반예매',day:2,artist:'백지영',category:'콘서트',...extra});
test('same performance combines sellers without dropping rounds or links',()=>{
 const rows=[event('n'),event('np','nol',{url:'https://example.com/nol/n',sale:'선예매',opensAt:'2026-10-27T18:00:00+09:00'}),event('l','link',{title:'2026 백지영 콘서트 <백일몽>-서울 티켓오픈 안내'})];
 const g=groupEvents(rows);assert.equal(g.length,1);assert.equal(g[0].schedules.length,3);assert.deepEqual(new Set(g[0].schedules.map(x=>x.url)),new Set(rows.map(x=>x.url)));
 assert.deepEqual(groupEvents([...rows].reverse()),g);
});
test('region, season, venue, performance period and opening conflicts remain separate',()=>{
 for(const extra of [{title:'2026 백지영 콘서트 〈백일몽〉-부산'},{title:'2027 백지영 콘서트 〈백일몽〉-서울'},{venue:'다른 극장'},{opensAt:'2026-11-01T18:00:00+09:00'},{performanceStart:'2026-12-02'}]){
  assert.equal(groupEvents([event('a','nol',{performanceStart:'2026-12-01'}),event('b','link',extra)]).length,2);
 }
});
test('missing venue cannot bridge two conflicting venues',()=>{
 const g=groupEvents([event('a'),event('b','link',{venue:'다른 극장'}),event('c','yes24',{venue:'공식 공지에서 확인'})]);assert.equal(g.length,3);
});
test('missing dates and generic links do not accidentally combine events',()=>{
 assert.equal(groupEvents([event('a','nol',{opensAt:null,url:null}),event('b','nol',{opensAt:null,url:null})]).length,2);
});
test('filters match a single schedule, detail preserves all schedules, legacy favorite works',()=>{
 const g=groupEvents([event('a','nol',{day:0}),event('b','link',{day:4})]);assert.equal(g.length,1);
 assert.equal(filterGroups(g,{platform:'link',range:'today'}).length,0);
 const shown=filterGroups(g,{platform:'nol',range:'today'});assert.equal(shown.length,1);assert.equal(shown[0].visibleSchedules.length,1);assert.equal(shown[0].schedules.length,2);
 assert.ok(isGroupSaved(g[0],['b']));assert.equal(filterGroups(g,{view:'saved',favorites:['b']}).length,1);
 assert.deepEqual(toggleGroupFavorite(g[0],['b','other']),['other']);assert.deepEqual(new Set(toggleGroupFavorite(g[0],['other'])),new Set(['other','a','b']));
});
test('real snapshot merges Baek Jiyoung sellers and keeps regional tour stops distinct',()=>{
 const rows=JSON.parse(readFileSync(new URL('../server/initial-snapshot.json',import.meta.url))).events;
 const grouped=groupEvents(rows);assert.equal(grouped.reduce((n,g)=>n+g.schedules.length,0),rows.length);
 const baek=grouped.filter(g=>g.title.includes('백지영'));assert.equal(baek.length,1);assert.deepEqual(new Set(baek[0].schedules.map(x=>x.platform)),new Set(['nol','link']));
 const tour=grouped.filter(g=>g.title.includes('김나영'));assert.ok(tour.length>=4);
});
