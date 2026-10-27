import {filterEvents} from './core.mjs';

// Preserve year, city, season and edition words; remove only notice decorations.
export function performanceTitle(title='') {
 return title.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'')
  .replace(/^\s*(?:\[단독판매\]|단독판매)\s*/,'')
  .replace(/\s*(?:(?:\d+차|추가|마지막)\s*)?티켓\s*오픈\s*(?:안내|공지)?\s*$/,'').trim();
}
const key=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const titleKey=e=>key(performanceTitle(e.title));
const venueKey=e=>e.venue&&e.venue!=='공식 공지에서 확인'?key(e.venue):'';
const ordered=rows=>[...rows].sort((a,b)=>(Date.parse(a.opensAt)||0)-(Date.parse(b.opensAt)||0)||a.id.localeCompare(b.id));
function compatible(rows) {
 return [venueKey,e=>e.performanceStart||'',e=>e.performanceEnd||''].every(get=>new Set(rows.map(get).filter(Boolean)).size<=1);
}
function sourceKey(e){
 try{const u=new URL(e.url);if(!/^https?:$/.test(u.protocol)||u.pathname==='/')return e.id;return e.platform+'|'+u.href;}catch{return e.id;}
}
export function groupEvents(events) {
 const buckets=new Map();
 for(const e of [...events].sort((a,b)=>a.id.localeCompare(b.id))){const k=sourceKey(e)+'|'+titleKey(e);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(e);}
 const units=[...buckets.values()].flatMap(rows=>compatible(rows)?[rows]:rows.map(e=>[e]));
 const links=units.map(()=>[]);
 for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
  const a=units[i],b=units[j];
  if(a[0].platform===b[0].platform||!titleKey(a[0])||titleKey(a[0])!==titleKey(b[0]))continue;
  const times=new Set(a.map(e=>Date.parse(e.opensAt)).filter(Number.isFinite));
  if(b.some(e=>times.has(Date.parse(e.opensAt)))){links[i].push(j);links[j].push(i);}
 }
 const seen=new Set(),groups=[];
 for(let i=0;i<units.length;i++){
  if(seen.has(i))continue;const stack=[i],component=[];
  while(stack.length){const n=stack.pop();if(seen.has(n))continue;seen.add(n);component.push(n);stack.push(...links[n]);}
  const rows=component.flatMap(n=>units[n]);
  // A conflicting component is left intact by source, including unknown-venue bridges.
  const batches=compatible(rows)?[rows]:component.map(n=>units[n]);
  for(const batch of batches){const schedules=ordered(batch),first=schedules[0];groups.push({...first,id:[...batch].map(e=>e.id).sort()[0],title:performanceTitle(first.title),venue:batch.find(e=>venueKey(e))?.venue||'공식 공지에서 확인',imageUrl:batch.find(e=>e.imageUrl)?.imageUrl||null,firstSeenAt:batch.map(e=>e.firstSeenAt).filter(Boolean).sort()[0]||null,schedules});}
 }
 return groups.sort((a,b)=>(Date.parse(a.opensAt)||0)-(Date.parse(b.opensAt)||0)||a.id.localeCompare(b.id));
}
export const isGroupSaved=(group,favorites=[])=>group.schedules.some(e=>favorites.includes(e.id));
export function toggleGroupFavorite(group,favorites=[]){const ids=new Set(group.schedules.map(e=>e.id));return isGroupSaved(group,favorites)?favorites.filter(id=>!ids.has(id)):[...new Set([...favorites,...ids])];}
export function filterGroups(groups,options={}){
 return groups.filter(g=>options.view!=='saved'||isGroupSaved(g,options.favorites)).map(g=>({...g,visibleSchedules:filterEvents(g.schedules,{...options,view:options.view==='saved'?'all':options.view})})).filter(g=>g.visibleSchedules.length);
}

export function sortGroups(groups,sort='opening',now=Date.now()){
 const next=g=>Math.min(...(g.visibleSchedules||g.schedules).map(e=>Date.parse(e.opensAt)).filter(n=>Number.isFinite(n)&&n>=now));
 return [...groups].sort((a,b)=>{
  if(sort==='popular'){const d=(b.interestCount||0)-(a.interestCount||0);if(d)return d;}
  if(sort==='newest'){const d=(Date.parse(b.firstSeenAt)||0)-(Date.parse(a.firstSeenAt)||0);if(d)return d;}
  const an=next(a),bn=next(b);return (an===bn?0:an<bn?-1:1)||a.id.localeCompare(b.id);
 });
}
