import test from 'node:test';
import assert from 'node:assert/strict';
import {safeUrl,windowKst,parseKst,inWindow,normalizeNol,parseYesList,parseMelonSchedules,mergeSnapshot} from '../server/tickets.mjs';
test('14 calendar dates start at Korean midnight, excludes day 14',()=>{
 const w=windowKst(new Date('2026-10-23T15:01:00Z'));
 assert.equal(w.start,'2026-10-23T15:00:00.000Z');assert.equal(w.end,'2026-11-06T15:00:00.000Z');
 assert.ok(inWindow('2026-11-06T23:59:00+09:00',w));assert.ok(!inWindow('2026-11-07T00:00:00+09:00',w));
});
test('Korean notice formats resolve to explicit timezone',()=>{
 assert.equal(parseKst('2026년 10월 26일 (월) 오후 8:00'),'2026-10-26T20:00:00+09:00');
 assert.equal(parseKst('2026.10.26(월) 14:00'),'2026-10-26T14:00:00+09:00');assert.equal(parseKst('추후 공지'),null);
});
test('NOL multiple presales have separate event IDs and product URL',()=>{
 const x=normalizeNol({id:10,title:'공연',goods_code:'26012345',ticket_dates:[{ticket_date_id:1,ticket_open_date:'2026-10-26T12:00:00',ticket_open_type_name:'선예매'},{ticket_date_id:2,ticket_open_date:'2026-10-27T12:00:00',ticket_open_type_name:'일반예매'}]});
 assert.equal(x.length,2);assert.notEqual(x[0].id,x[1].id);assert.equal(x[0].url,'https://nol.yanolja.com/ticket/products/26012345');
});
test('YES24 ordinary and presale dates are preserved',()=>{
 const x=parseYesList(`<input id="ListTotalCnt" value="1"><table><tr><td>티켓오픈</td><td><a href="#id=123"><em>뮤지컬 A</em></a></td><td>2026.10.29(목) 16:00<a presaleTit1="팬클럽 선예매" presaleTime1="2026.10.28(수) 12:00"></a></td></tr></table>`);
 assert.equal(x.total,1);assert.equal(x.events.length,2);assert.equal(x.events[1].sale,'팬클럽 선예매');assert.match(x.events[0].url,/#id=123$/);
});
test('Melon multi-round detail parsing only uses schedule section',()=>{
 const x=parseMelonSchedules(`<dd class="txt_date">2026.01.01</dd><dl class="schedule_info"><dt class="tit_type">1차</dt><dd class="txt_date">2026년 10월 26일 (월) 20:00</dd><dt class="tit_type">2차</dt><dd class="txt_date">2026년 11월 2일 (월) 14:00</dd></dl>`);
 assert.equal(x.length,2);assert.equal(x[1].sale,'2차');
});
test('failed source preserves last good events and timestamp, successful empty clears',()=>{
 const old={events:[{id:'a',platform:'nol'},{id:'b',platform:'yes24'}],sources:{nol:{lastSuccessAt:'old'}}};
 const n=mergeSnapshot(old,{nol:{error:'HTTP 403'},yes24:{events:[]}},'now');
 assert.deepEqual(n.events,[{id:'a',platform:'nol'}]);assert.equal(n.sources.nol.lastSuccessAt,'old');assert.equal(n.sources.nol.status,'error');
});

test('missing or unsafe poster URLs remain absent',()=>{for(const value of [undefined,null,'','javascript:alert(1)'])assert.equal(safeUrl(value,'https://example.com'),null);});
