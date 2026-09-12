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
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2e6)reject(new Error('body too large'))});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{resolve({})}});req.on('error',reject)})}
function staticFile(res,url){let p=url==='/'?'/index.html':decodeURIComponent(url.split('?')[0]);let fp=path.normalize(path.join(PUBLIC,p));if(!fp.startsWith(PUBLIC))return false;try{let b=fs.readFileSync(fp);let ext=path.extname(fp);let ct={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.css':'text/css; charset=utf-8'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':ct,'Cache-Control':'no-store'});res.end(b);return true}catch{return false}}
async function main(req,res){
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/api/config')return json(res,200,{did:{enabled:!!(env('DID_AGENT_ID')&&env('DID_CLIENT_KEY')),agentId:env('DID_AGENT_ID'),clientKey:env('DID_CLIENT_KEY')},tiktok:!!(env('TIKTOK_CLIENT_KEY')&&env('TIKTOK_CLIENT_SECRET')&&env('TIKTOK_REDIRECT_URI')),origin:`http://${req.headers.host}`});
 if(req.method==='GET'&&u.pathname==='/api/health')return json(res,200,{ok:true,app:'SARA Real TikTok Agent'});
 if(req.method==='GET'&&u.pathname==='/api/memory')return json(res,200,load());
 if(req.method==='POST'&&u.pathname==='/api/memory'){const x=await body(req);const t=String(x.text||'').trim();if(!t)return json(res,400,{error:'text required'});const s=load();s.memories.push(t.slice(0,500));s.memories=s.memories.slice(-300);save(s);return json(res,200,{ok:true})}
 if(req.method==='GET'&&u.pathname==='/api/tiktok/status')return json(res,200,{connected:!!load().tiktok,scopes:env('TIKTOK_SCOPES','user.info.basic,video.list')});
 if(req.method==='POST'&&u.pathname==='/api/live/session'){const id=crypto.randomUUID();const s=load();const session={id,startedAt:Date.now(),title:'SARA LIVE',status:'ready'};sessions.set(id,session);save(s);return json(res,200,{ok:true,session})}
 if(req.method==='POST'&&u.pathname==='/api/live/stop'){const x=await body(req);const q=sessions.get(String(x.id||''));if(q){q.status='stopped';q.stoppedAt=Date.now()}return json(res,200,{ok:true})}
 if(req.method==='GET'&&u.pathname==='/auth/tiktok'){if(!env('TIKTOK_CLIENT_KEY')||!env('TIKTOK_REDIRECT_URI'))return res.end('TikTok OAuth needs server environment configuration.');const state=crypto.randomBytes(24).toString('hex');sessions.set('oauth:'+state,{expires:Date.now()+600000});const p=new URLSearchParams({client_key:env('TIKTOK_CLIENT_KEY'),response_type:'code',scope:env('TIKTOK_SCOPES','user.info.basic,video.list'),redirect_uri:env('TIKTOK_REDIRECT_URI'),state});res.writeHead(302,{Location:'https://www.tiktok.com/v2/auth/authorize/?'+p});return res.end()}
 if(req.method==='GET'&&u.pathname==='/auth/tiktok/callback')return res.end('TikTok callback endpoint is wired. Add server-side token exchange before production use.');
 if(req.method==='GET'&&staticFile(res,u.pathname))return;
 res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
}
http.createServer((req,res)=>main(req,res).catch(e=>json(res,500,{error:e.message}))).listen(PORT,'127.0.0.1',()=>console.log(`SARA running at http://localhost:${PORT}`));