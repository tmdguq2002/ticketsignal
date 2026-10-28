export function normalizeKeywords(value) {
  const seen = new Set();
  return String(value).split(/[,，\n]/).map(x=>x.trim()).filter(x=>{const k=x.toLocaleLowerCase(); if(!x||seen.has(k)) return false; seen.add(k);return true;});
}
export function validateSubscription({email,keywords,consent}) {
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'')||email.length>254) return '올바른 이메일 주소를 입력해 주세요.';
  if(!Array.isArray(keywords)||!keywords.length) return '관심 아티스트나 작품을 하나 이상 입력해 주세요.';
  if(keywords.length>10||keywords.some(x=>x.length>40)) return '키워드는 최대 10개, 각각 40자까지 입력할 수 있어요.';
  if(!consent) return '이메일 알림을 위한 정보 수집·이용에 동의해 주세요.';
  return '';
}
export function filterEvents(events,{query='',platform='all',category='all',range='all',view='all',favorites=[],keywords=[],now=Date.now()}={}) {
 return events.filter(e=>{
  const hay=(e.title+' '+e.artist).toLocaleLowerCase();
  return hay.includes(query.trim().toLocaleLowerCase()) && (platform==='all'||e.platform===platform) && (category==='all'||e.category===category) && (range==='all'||(range==='three'?(Date.parse(e.opensAt)>=now&&Date.parse(e.opensAt)<=now+72*3600000):(range==='today'?e.day===0:e.day>=0&&e.day<7))) && (view!=='saved'||favorites.includes(e.id)) && (view!=='matched'||keywords.some(k=>hay.includes(k.toLocaleLowerCase())));
 });
}
export function escapeHtml(value) {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
