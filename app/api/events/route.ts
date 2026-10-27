import {publicSnapshot} from '../../../server/store';
export async function GET(){try{return Response.json(await publicSnapshot(),{headers:{'cache-control':'public, max-age=60'}});}catch{return Response.json({error:'일정 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:503});}}
