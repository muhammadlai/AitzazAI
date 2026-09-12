import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
try { if (process.loadEnvFile) process.loadEnvFile(path.join(__dirname,'.env')); } catch {}
const PORT=Number(process.env.PORT||3000);
const PUBLIC=path.join(__dirname,'public');
const DATA=path.join(__dirname,'data'); fs.mkdirSync(DATA,{recursive:true});
const STORE=path.join(DATA,'sara-store.json');
const env=(k,d='')=>process.env[k]||d;
function load(){try{return JSON.parse(fs.readFileSync(STORE,'utf8'))}catch{return {memories:[],tiktok:null,analytics:{}}}}
function save(x){fs.writeFileSync(STORE,JSON.stringify(x,null,2))}
const sessions=new Map();
function json(res,status,obj){const b=Buffer.from(JSON.stringify(obj));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':b.length});res.end(b)}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>5e6)reject(new Error('body too large'))});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{resolve({})}});req.on('error',reject)})}
async function tiktokForm(params){const r=await fetch('https://open.tiktokapis.com/v2/oauth/token/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Cache-Control':'no-cache'},body:new URLSearchParams(params)});const data=await r.json();if(!r.ok||data.error)throw new Error(data.error_description||data.error||`TikTok token HTTP ${r.status}`);return data}
async function tiktokApi(url,token,opts={}){const r=await fetch(url,{...opts,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(opts.headers||{})}});const data=await r.json();if(!r.ok||data.error?.code&&data.error.code!=='ok')throw new Error(data.error?.message||`TikTok API HTTP ${r.status}`);return data}
async function refreshTikTok(){const s=load();if(!s.tiktok?.refresh_token)throw new Error('TikTok account is not connected');const data=await tiktokForm({client_key:env('TIKTOK_CLIENT_KEY'),client_secret:env('TIKTOK_CLIENT_SECRET'),grant_type:'refresh_token',refresh_token:s.tiktok.refresh_token});s.tiktok={...s.tiktok,...data,expires_at:Date.now()+Number(data.expires_in||86400)*1000};save(s);return s.tiktok}
async function accessToken(){const s=load();if(!s.tiktok?.access_token)throw new Error('TikTok account is not connected');if(Number(s.tiktok.expires_at||0)-Date.now()<120000){return (await refreshTikTok()).access_token}return s.tiktok.access_token}
function staticFile(res,url){let p=url==='/'?'/index.html':decodeURIComponent(url.split('?')[0]);let fp=path.normalize(path.join(PUBLIC,p));if(!fp.startsWith(PUBLIC))return false;try{let b=fs.readFileSync(fp);let ext=path.extname(fp);let ct={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.css':'text/css; charset=utf-8'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-store'});res.end(b);return true}catch{return false}}
async function main(req,res){
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/api/config')return json(res,200,{did:{enabled:!!(env('DID_AGENT_ID')&&env('DID_CLIENT_KEY')),agentId:env('DID_AGENT_ID'),clientKey:env('DID_CLIENT_KEY')},tiktok:{configured:!!(env('TIKTOK_CLIENT_KEY')&&env('TIKTOK_CLIENT_SECRET')&&env('TIKTOK_REDIRECT_URI')),connected:!!load().tiktok},origin:`http://${req.headers.host}`});
 if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,app:'SARA AI Creator',features:['D-ID realtime avatar','TikTok OAuth','TikTok profile','TikTok videos','TikTok direct-post API','TikTok draft upload API']});
 if(req.method==='GET'&&u.pathname==='/api/memory')return json(res,200,load());
 if(req.method==='POST'&&u.pathname==='/api/memory'){const x=await body(req);const t=String(x.text||'').trim();if(!t)return json(res,400,{error:'text required'});const s=load();s.memories.push(t.slice(0,500));s.memories=s.memories.slice(-300);save(s);return json(res,200,{ok:true})}
 if(req.method==='GET'&&u.pathname==='/api/tiktok/status')return json(res,200,{configured:!!(env('TIKTOK_CLIENT_KEY')&&env('TIKTOK_CLIENT_SECRET')&&env('TIKTOK_REDIRECT_URI')),connected:!!load().tiktok,scopes:load().tiktok?.scope||env('TIKTOK_SCOPES','user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish')});
 if(req.method==='GET'&&u.pathname==='/api/tiktok/profile'){const token=await accessToken();return json(res,200,await tiktokApi('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count',token))}
 if(req.method==='GET'&&u.pathname==='/api/tiktok/videos'){const token=await accessToken();const fields='id,title,video_description,duration,cover_image_url,share_url,create_time,like_count,comment_count,share_count,view_count';return json(res,200,await tiktokApi(`https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`,token,{method:'POST',body:JSON.stringify({max_count:20})}))}
 if(req.method==='POST'&&u.pathname==='/api/tiktok/creator-info'){const token=await accessToken();return json(res,200,await tiktokApi('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',token,{method:'POST',body:'{}'}))}
 if(req.method==='POST'&&u.pathname==='/api/tiktok/post-url'){const x=await body(req);const token=await accessToken();if(!x.video_url)return json(res,400,{error:'video_url required'});const info=await tiktokApi('https://open.tiktokapis.com/v2/post/publish/creator_info/query/',token,{method:'POST',body:'{}'});const allowed=info.data?.privacy_level_options||[];const privacy=allowed.includes(String(x.privacy_level||''))?x.privacy_level:(allowed[0]||'SELF_ONLY');const payload={post_info:{title:String(x.title||'SARA AI video').slice(0,2200),privacy_level:privacy,disable_duet:!!x.disable_duet,disable_stitch:!!x.disable_stitch},source_info:{source:'PULL_FROM_URL',video_url:String(x.video_url)}};return json(res,200,await tiktokApi('https://open.tiktokapis.com/v2/post/publish/video/init/',token,{method:'POST',body:JSON.stringify(payload)}))}
 if(req.method==='POST'&&u.pathname==='/api/live/session'){const id=crypto.randomUUID();const session={id,startedAt:Date.now(),title:'SARA LIVE',status:'ready',note:'D-ID realtime session ready. TikTok LIVE broadcast requires a TikTok-supported LIVE streaming route.'};sessions.set(id,session);return json(res,200,{ok:true,session})}
 if(req.method==='POST'&&u.pathname==='/api/live/stop'){const x=await body(req);const q=sessions.get(String(x.id||''));if(q){q.status='stopped';q.stoppedAt=Date.now()}return json(res,200,{ok:true})}
 if(req.method==='GET'&&u.pathname==='/auth/tiktok'){
   if(!env('TIKTOK_CLIENT_KEY')||!env('TIKTOK_REDIRECT_URI'))return res.end('TikTok OAuth needs server environment configuration.');
   const state=crypto.randomBytes(24).toString('hex');sessions.set('oauth:'+state,{expires:Date.now()+600000});
   const p=new URLSearchParams({client_key:env('TIKTOK_CLIENT_KEY'),response_type:'code',scope:env('TIKTOK_SCOPES','user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish'),redirect_uri:env('TIKTOK_REDIRECT_URI'),state});
   res.writeHead(302,{Location:'https://www.tiktok.com/v2/auth/authorize/?'+p});return res.end();
 }
 if(req.method==='GET'&&u.pathname==='/auth/tiktok/callback'){
   const code=u.searchParams.get('code');const state=u.searchParams.get('state');if(!code)return res.end(`TikTok authorization failed: ${u.searchParams.get('error_description')||u.searchParams.get('error')||'no code'}`);
   const oauth=sessions.get('oauth:'+state);if(!oauth||oauth.expires<Date.now())return res.end('TikTok authorization state expired. Please connect again.');sessions.delete('oauth:'+state);
   const data=await tiktokForm({client_key:env('TIKTOK_CLIENT_KEY'),client_secret:env('TIKTOK_CLIENT_SECRET'),code,grant_type:'authorization_code',redirect_uri:env('TIKTOK_REDIRECT_URI')});
   const s=load();s.tiktok={...data,expires_at:Date.now()+Number(data.expires_in||86400)*1000,connectedAt:Date.now()};save(s);
   res.writeHead(302,{Location:'/?tiktok=connected'});return res.end();
 }
 if(req.method==='POST'&&u.pathname==='/api/tiktok/disconnect'){const s=load();delete s.tiktok;save(s);return json(res,200,{ok:true})}
 if(req.method==='GET'&&staticFile(res,u.pathname))return;
 res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
}
http.createServer((req,res)=>main(req,res).catch(e=>json(res,500,{error:e.message}))).listen(PORT,'127.0.0.1',()=>console.log(`SARA running at http://localhost:${PORT}`));