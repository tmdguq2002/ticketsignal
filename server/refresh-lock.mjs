// Serialize daily collection and failed-source retries across Worker instances.
export async function withRefreshLease(db,work){
 const owner=crypto.randomUUID(),started=Date.now();
 const acquired=await db.prepare('INSERT INTO source_refresh_lock(name,owner,expires_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE source_refresh_lock.expires_at<=? RETURNING owner').bind('snapshot',owner,new Date(started+600000).toISOString(),new Date(started).toISOString()).first();
 if(!acquired)return {skipped:true,reason:'refresh_in_progress'};
 const assertHeld=async()=>{const row=await db.prepare('SELECT owner FROM source_refresh_lock WHERE name=? AND owner=? AND expires_at>?').bind('snapshot',owner,new Date(Date.now()+30000).toISOString()).first();if(!row)throw Error('REFRESH_LEASE_LOST');};
 const fetcher=(url,options={})=>{const remaining=180000-(Date.now()-started);if(remaining<=0)throw Error('Collection time budget exceeded');return fetch(url,{...options,signal:AbortSignal.timeout(Math.min(18000,remaining))});};
 try{return await work({assertHeld,fetcher});}finally{await db.prepare('DELETE FROM source_refresh_lock WHERE name=? AND owner=?').bind('snapshot',owner).run();}
}
