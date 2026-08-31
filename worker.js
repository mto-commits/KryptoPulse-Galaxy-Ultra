const JSON_HEADERS={
  'content-type':'application/json; charset=UTF-8',
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,OPTIONS',
  'access-control-allow-headers':'Content-Type,Accept',
  'cache-control':'public, max-age=30, s-maxage=45'
};
const CG='https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=volume_desc&per_page=250&page=1&sparkline=false&price_change_percentage=1h,24h,7d';
const PP='https://api.coinpaprika.com/v1/tickers?quotes=EUR';
const LO='https://api.coinlore.net/api/tickers/?start=0&limit=100';
const timeout=(ms)=>AbortSignal.timeout(ms);
async function json(url,ms=6500){const r=await fetch(url,{headers:{accept:'application/json','user-agent':'KryptoPulse-Galaxy/9.2'},signal:timeout(ms),cf:{cacheTtl:30,cacheEverything:true}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
function paprika(c){const q=c?.quotes?.EUR;if(!q)return null;return{id:'pp:'+String(c.id||c.symbol).toLowerCase(),symbol:String(c.symbol||'').toLowerCase(),name:c.name||c.symbol,current_price:+q.price||0,market_cap:+q.market_cap||0,market_cap_rank:+c.rank||0,total_volume:+q.volume_24h||0,price_change_percentage_1h_in_currency:+q.percent_change_1h||0,price_change_percentage_24h_in_currency:+q.percent_change_24h||0,price_change_percentage_7d_in_currency:+q.percent_change_7d||0,kp_h4:(+q.percent_change_6h||0)*4/6,kp_source:'COINPAPRIKA',last_updated:c.last_updated||new Date().toISOString()}}
function lore(c){const eur=.86;return{id:'lo:'+String(c.id||c.symbol).toLowerCase(),symbol:String(c.symbol||'').toLowerCase(),name:c.name||c.symbol,current_price:(+c.price_usd||0)*eur,market_cap:(+c.market_cap_usd||0)*eur,market_cap_rank:+c.rank||0,total_volume:(+c.volume24||+c.volume24a||0)*eur,price_change_percentage_1h_in_currency:+c.percent_change_1h||0,price_change_percentage_24h_in_currency:+c.percent_change_24h||0,price_change_percentage_7d_in_currency:+c.percent_change_7d||0,kp_h4:(+c.percent_change_1h||0)*2.2,kp_source:'COINLORE',last_updated:new Date().toISOString()}}
async function market(){
  const settled=await Promise.allSettled([json(CG),json(PP),json(LO)]); const good=[];
  if(settled[0].status==='fulfilled'&&Array.isArray(settled[0].value))good.push({name:'CG',priority:3,rows:settled[0].value});
  if(settled[1].status==='fulfilled'&&Array.isArray(settled[1].value))good.push({name:'PP',priority:2,rows:settled[1].value.map(paprika).filter(Boolean)});
  const lr=settled[2].status==='fulfilled'?settled[2].value?.data:null;if(Array.isArray(lr))good.push({name:'LO',priority:1,rows:lr.map(lore).filter(Boolean)});
  if(!good.length)return new Response(JSON.stringify({ok:false,error:'all upstream feeds failed',upstream:settled.map(x=>x.status==='rejected'?String(x.reason):'ok')}),{status:502,headers:JSON_HEADERS});
  const map=new Map();for(const src of good.sort((a,b)=>a.priority-b.priority))for(const row of src.rows){const k=String(row.symbol||'').toUpperCase();if(k)map.set(k,row)}
  return new Response(JSON.stringify({ok:true,ts:Date.now(),sources:good.map(x=>x.name),rows:[...map.values()]}),{headers:JSON_HEADERS});
}
export default {async fetch(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:JSON_HEADERS});
  const u=new URL(request.url); if(u.pathname==='/'||u.pathname==='/health')return new Response(JSON.stringify({ok:true,service:'KryptoPulse Galaxy v9.2 Data Server'}),{headers:JSON_HEADERS});
  if(u.pathname==='/api/market'&&request.method==='GET')return market();
  return new Response(JSON.stringify({ok:false,error:'not found'}),{status:404,headers:JSON_HEADERS});
}};
