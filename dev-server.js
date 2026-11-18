// Local preview with the same API handler. No external packages.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname,'.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const handler = require('./api/send');
const assets = new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/script.js','script.js'],['/favicon.svg','favicon.svg']]);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/api/send') {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 4096) { res.writeHead(413,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:false,error:'Заявка слишком большая.'})); return; } chunks.push(chunk); }
    req.body = Buffer.concat(chunks).toString('utf8');
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
    try { await handler(req,res); } catch { if (!res.writableEnded) { res.statusCode = 500; res.end('{"ok":false}'); } }
    return;
  }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  const asset = assets.get(url.pathname);
  if (!asset) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200,{'Content-Type':mime[path.extname(asset)],'Cache-Control':'no-store'});
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(path.join(__dirname,asset)).pipe(res);
});
server.listen(Number(process.env.PORT) || 3000,'127.0.0.1',() => console.log(`FORMA.ARCH preview: http://127.0.0.1:${server.address().port}`));
