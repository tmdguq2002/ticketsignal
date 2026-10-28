// Server-only transport. Never import this module into public/.
const REQUIRED=['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN','GMAIL_SENDER_EMAIL'];
const validEmail=value=>typeof value==='string'&&/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)&&value.length<=254;
export function gmailStatus(config){
 const missing=REQUIRED.filter(key=>typeof config[key]!=='string'||!config[key].trim());
 const senderValid=validEmail(config.GMAIL_SENDER_EMAIL);
 const mode=['test','live'].includes(config.GMAIL_MODE)?config.GMAIL_MODE:'disabled';
 return {provider:'gmail',mode,ready:!missing.length&&senderValid&&mode!=='disabled',missing,senderValid,publicSubscriptionsEnabled:mode==='live'&&config.SUBSCRIPTIONS_ENABLED==='true'};
}
function base64(value){const bytes=new TextEncoder().encode(value);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
export async function sendTestEmail(config,message,fetcher=fetch){
 if(!gmailStatus(config).ready)throw Error('GMAIL_NOT_READY');
 if(typeof message.to!=='string'||message.to.toLowerCase()!==String(config.GMAIL_SENDER_EMAIL).toLowerCase())throw Error('GMAIL_TEST_RECIPIENT');
 return transport(config,message,fetcher);
}
export async function sendEmail(config,message,fetcher=fetch){
 if(config.GMAIL_MODE!=='live')throw Error('GMAIL_NOT_LIVE');
 return transport(config,message,fetcher);
}
async function transport(config,message,fetcher){
 if(!gmailStatus(config).ready)throw Error('GMAIL_NOT_READY');
 const sender=config.GMAIL_SENDER_EMAIL;
 if(!validEmail(message.to))throw Error('GMAIL_INVALID_RECIPIENT');
 if(typeof message.subject!=='string'||/[\r\n]/.test(message.subject)||message.subject.length>200||typeof message.text!=='string'||message.text.length>50000)throw Error('INVALID_MESSAGE');
 let auth;
 try{auth=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.GMAIL_CLIENT_ID,client_secret:config.GMAIL_CLIENT_SECRET,refresh_token:config.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});}catch{throw Error('GMAIL_AUTH_UNAVAILABLE');}
 if(!auth.ok)throw Error(`GMAIL_AUTH_FAILED_${auth.status}`);
 let access;try{access=(await auth.json()).access_token;}catch{throw Error('GMAIL_AUTH_RESPONSE_INVALID');}
 if(typeof access!=='string'||!access)throw Error('GMAIL_AUTH_RESPONSE_INVALID');
 const mime=[`From: =?UTF-8?B?${base64('티켓시그널')}?= <${sender}>`,`To: ${message.to}`,`Subject: =?UTF-8?B?${base64(message.subject)}?=`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(message.text).match(/.{1,76}/g)?.join('\r\n')||''].join('\r\n');
 const raw=base64(mime).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 let response;
 try{response=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(20000)});}catch{throw Error('GMAIL_DELIVERY_UNKNOWN');}
 if(!response.ok)throw Error(response.status>=500?'GMAIL_DELIVERY_UNKNOWN':`GMAIL_SEND_REJECTED_${response.status}`);
 let data;try{data=await response.json();}catch{throw Error('GMAIL_DELIVERY_UNKNOWN');}
 if(typeof data.id!=='string'||!data.id)throw Error('GMAIL_DELIVERY_UNKNOWN');
 return {messageId:data.id,status:'accepted'};
}
