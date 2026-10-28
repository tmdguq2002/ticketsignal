const token=new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null,'',location.pathname);
const action=location.pathname.endsWith('/confirm')?'confirm':'unsubscribe';
const button=document.querySelector('#action'),result=document.querySelector('#result');
if(!token){button.disabled=true;result.textContent='메일에 있는 링크를 다시 열어 주세요.';}
button.addEventListener('click',async()=>{
 button.disabled=true;
 try{const r=await fetch('/api/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token})});const data=await r.json();if(!r.ok)throw Error(data.error);
 if(action==='confirm'){
  result.textContent=data.active?'구독이 활성화됐어요. 오픈 24시간 전부터 매시간 일정을 확인해 알려드립니다.':'링크가 만료됐거나 이미 사용됐습니다. 이미 확인했다면 구독은 유지됩니다.';
  if(data.active){const link=document.createElement('a');link.href='/email/unsubscribe#token='+data.unsubscribeToken;link.textContent='구독 해지';result.after(link);}
 }else{result.textContent=data.removed?'구독을 해지하고 저장 정보를 삭제했어요.':'유효하지 않은 링크입니다. 메일의 해지 링크를 다시 열어 주세요.';}
 }catch(e){result.textContent=e.message||'처리하지 못했습니다. 다시 시도해 주세요.';button.disabled=false;}
});
