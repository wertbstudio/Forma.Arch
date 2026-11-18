const TYPES = new Set(['Квартира', 'Загородный дом', 'Коммерция']);
const recent = new Map();
const WINDOW = 60_000;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (status, data) => res.status(status).json(data);
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return reply(405,{ok:false,error:'Метод не поддерживается.'}); }
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415,{ok:false,error:'Ожидается JSON.'});
  // Reject cross-origin browser submissions without relying on client-side checks.
  if (req.headers.origin) {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { return reply(403,{ok:false,error:'Недопустимый источник запроса.'}); }
    if (origin.host !== req.headers.host) return reply(403,{ok:false,error:'Недопустимый источник запроса.'});
  }
  let data;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw, 'utf8') > 4096) return reply(413,{ok:false,error:'Заявка слишком большая.'});
    data = typeof req.body === 'string' ? JSON.parse(raw) : req.body;
  } catch { return reply(400,{ok:false,error:'Некорректные данные.'}); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400,{ok:false,error:'Некорректные данные.'});
  if (typeof data.website !== 'string' || data.website.trim()) return reply(400,{ok:false,error:'Не удалось проверить заявку.'});
  const name = typeof data.name === 'string' ? data.name.trim().replace(/\s+/g,' ') : '';
  const phone = typeof data.phone === 'string' && data.phone.length <= 30 ? data.phone.replace(/[\s()+-]/g,'') : '';
  const context = typeof data.context === 'string' ? data.context.trim() : '';
  const elapsed = Date.now() - Number(data.startedAt);
  if (name.length < 2 || name.length > 60 || !/^[\p{L}\p{M} .'-]+$/u.test(name) || !/^7\d{10}$/.test(phone) || !TYPES.has(data.type) || data.consent !== true || context.length > 150 || /[\r\n\x00-\x1f]/.test(context) || !Number.isFinite(elapsed) || elapsed < 1500 || elapsed > 86400000 || (data.area !== undefined && (!/^\d{2,3}$/.test(String(data.area)) || Number(data.area) < 30 || Number(data.area) > 500))) {
    return reply(400,{ok:false,error:'Проверьте имя, телефон и согласие. Если форма открыта давно, откройте ее заново.'});
  }
  const now = Date.now();
  for (const [key, value] of recent) if (value <= now) recent.delete(key);
  // Best-effort per-instance throttling; use an edge/WAF rule for global limits.
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (recent.has(ip)) { res.setHeader('Retry-After','60'); return reply(429,{ok:false,error:'Заявка уже обрабатывается. Подождите минуту перед повторной отправкой.'}); }
  if (!process.env.BOT_TOKEN || !process.env.CHAT_ID) return reply(503,{ok:false,error:'Прием заявок временно недоступен. Попробуйте позже.'});
  recent.set(ip, now + WINDOW);
  const text = ['FORMA.ARCH — новая заявка',`Имя: ${name}`,`Телефон: +${phone}`,`Объект: ${data.type}`,data.area ? `Площадь: ${data.area} м² (ориентир дизайна: ${Number(data.area)*6000} ₽)` : '',context ? `Интерес: ${context}` : '', 'Согласие на обработку: получено'].filter(Boolean).join('\n');
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:process.env.CHAT_ID,text}),signal:AbortSignal.timeout(10000)});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('Delivery failed');
    return reply(200,{ok:true});
  } catch {
    // Never log request contents, Telegram URLs or environment variables.
    return reply(502,{ok:false,error:'Не удалось подтвердить доставку. Подождите минуту и попробуйте снова.'});
  }
};
