// Replace these repositories with authenticated server APIs in a live version.
export const platforms={nol:{name:'NOL 티켓',color:'#6758ea',url:'https://nol.yanolja.com/ticket/display/upcoming'},link:{name:'티켓링크',color:'#bc3048',url:'https://www.ticketlink.co.kr/'},melon:{name:'멜론티켓',color:'#007853',url:'https://ticket.melon.com/'},yes24:{name:'YES24',color:'#2265ad',url:'https://ticket.yes24.com/'}};
export const eventRepository={async snapshot(){const r=await fetch('/api/events',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('일정 정보를 불러오지 못했어요. 잠시 후 새로고침해 주세요.');const data=await r.json();const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);const start=Date.parse(today+'T00:00:00+09:00');data.events=data.events.map(e=>({...e,day:Math.floor((Date.parse(e.opensAt)-start)/86400000),time:new Date(e.opensAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}),theme:({nol:'violet',link:'rose',melon:'green',yes24:'blue'})[e.platform]}));return data;},async list(){return (await this.snapshot()).events;}};
const KEY='ticket-signal-demo-v1';
const initial=()=>({favorites:[],subscription:null});
export function createLocalRepository(storage) {return {
 load(){try{const p=JSON.parse(storage.getItem(KEY));if(!p||!Array.isArray(p.favorites)) return initial();const s=p.subscription;return {favorites:p.favorites.filter(x=>typeof x==='string'),subscription:s&&typeof s.email==='string'&&Array.isArray(s.keywords)&&s.keywords.every(x=>typeof x==='string')?{email:s.email,keywords:s.keywords.slice(0,10),timing:Array.isArray(s.timing)?s.timing.filter(x=>['new','day','hour'].includes(x)):['new'],createdAt:s.createdAt}:null};}catch{return initial();}},
 save(value){storage.setItem(KEY,JSON.stringify(value));},
 clear(){storage.removeItem(KEY);}
};}
export function demoDate(day){const today=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Seoul'}));today.setHours(12,0,0,0);today.setDate(today.getDate()+day);return today;}
export function dateLabel(day){return demoDate(day).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});}
