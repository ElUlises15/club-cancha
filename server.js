import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
mkdirSync('data',{recursive:true});
const db = new DatabaseSync(process.env.DB_PATH || 'data/cancha.sqlite');
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT NOT NULL,court INTEGER NOT NULL,date TEXT NOT NULL,hour INTEGER NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(court,date,hour));`);
const courts=[{id:1,name:'Cancha 1',type:'Fútbol 5 · descubierta',price:28000},{id:2,name:'Cancha 2',type:'Fútbol 5 · descubierta',price:26000}];
const hours=Array.from({length:9},(_,i)=>i+15);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(data));};
const validDate=s=> typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
const adminKey=process.env.ADMIN_KEY || 'cancha-demo';
function authorized(req){const a=Buffer.from(req.headers['x-admin-key']||''),b=Buffer.from(adminKey);return a.length===b.length&&timingSafeEqual(a,b);}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>4096)throw Error('Solicitud demasiado grande');}return JSON.parse(s);}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');
if(url.pathname==='/api/availability' && req.method==='GET'){const date=url.searchParams.get('date')||today();if(!validDate(date))return json(res,400,{error:'Elegí una fecha válida.'});const booked=db.prepare('SELECT court,hour FROM bookings WHERE date=?').all(date);return json(res,200,{date,courts,hours,booked});}
if(url.pathname==='/api/bookings'&&req.method==='POST'){const b=await body(req);if(typeof b.name!=='string'||b.name.trim().length<2||b.name.length>80||typeof b.phone!=='string'||!/^\+?[\d\s()-]{8,25}$/.test(b.phone)||!courts.some(c=>c.id===b.court)||!hours.includes(b.hour)||!validDate(b.date)||b.date<today()||b.date>new Date(Date.now()+90*86400000).toISOString().slice(0,10))return json(res,400,{error:'Revisá nombre, teléfono y turno. Podés reservar hasta 90 días hacia adelante.'});
try{const result=db.prepare('INSERT INTO bookings(name,phone,court,date,hour) VALUES(?,?,?,?,?)').run(b.name.trim(),b.phone.trim(),b.court,b.date,b.hour);return json(res,201,{id:Number(result.lastInsertRowid),...b,price:courts.find(c=>c.id===b.court).price});}catch(e){if(e.message.includes('UNIQUE'))return json(res,409,{error:'Ese turno recién se ocupó. Elegí otro horario.'});throw e;}}
if(url.pathname==='/api/admin/bookings'&&req.method==='GET'){if(!authorized(req))return json(res,401,{error:'Clave de administración incorrecta.'});return json(res,200,db.prepare('SELECT * FROM bookings ORDER BY date,hour').all());}
if(/^\/api\/admin\/bookings\/\d+$/.test(url.pathname)&&req.method==='DELETE'){if(!authorized(req))return json(res,401,{error:'Clave de administración incorrecta.'});const r=db.prepare('DELETE FROM bookings WHERE id=?').run(Number(url.pathname.split('/').pop()));return json(res,r.changes?200:404,r.changes?{ok:true}:{error:'La reserva ya no existe.'});}
if(url.pathname.startsWith('/api/'))return json(res,404,{error:'Ruta no encontrada.'});
if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';const file=resolve('public','.'+pathname);if(!file.startsWith(resolve('public')+'/'))return json(res,403,{error:'Acceso denegado.'});try{const content=readFileSync(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain'})[extname(file)]||'application/octet-stream','X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:content);}catch{return json(res,404,{error:'Página no encontrada.'});}
}catch(e){json(res,e instanceof SyntaxError?400:500,{error:e instanceof SyntaxError?'La solicitud no es válida.':'No pudimos completar la operación. Intentá de nuevo.'});}});
server.listen(Number(process.env.PORT)||3850,'0.0.0.0',()=>console.log('Cancha Norte: http://localhost:'+(process.env.PORT||3850)));
