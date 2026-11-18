const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const photo = (id, width = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const projects = [
  { title: 'Резиденция в Сколково', area: 240, year: 2024, type: 'Загородный дом', description: 'Дом, в котором день подчиняется ритму естественного света. Открытая гостиная объединяет зону отдыха и столовую, а спокойные оттенки дерева создают ощущение непрерывного пространства. Скрытое хранение и мягкое освещение оставляют главное — воздух и ощущение покоя.', photos: ['photo-1600210492486-724fe5c67fb0','photo-1600607687920-4e2a09cf159d','photo-1600566753190-17f0baa2a6c3'] },
  { title: 'Пентхаус на Патриарших', area: 165, year: 2025, type: 'Квартира', description: 'Город остается за окнами. Внутри — сдержанная палитра, тактильный текстиль и открытая планировка для неспешных вечеров. Каждый сценарий освещения помогает по-новому прочитать геометрию комнаты, от первого утреннего кофе до позднего разговора.', photos: ['photo-1600607687920-4e2a09cf159d','photo-1600210491892-03d54c0aaf87','photo-1600607687939-ce8a6c25118c'] },
  { title: 'Дом из стекла и бетона', area: 310, year: 2025, type: 'Загородный дом', description: 'Чистая геометрия, прозрачные границы и природные материалы. Общая зона открыта свету, приватные комнаты укрыты от лишних взглядов. Выразительность здесь рождается из пропорций: ровной плоскости стены, глубины проема и ритма теней.', photos: ['photo-1600607687939-ce8a6c25118c','photo-1600566753190-17f0baa2a6c3','photo-1600210492486-724fe5c67fb0'] },
  { title: 'Апартаменты в Хамовниках', area: 110, year: 2024, type: 'Квартира', description: 'Компактное пространство с большим внутренним объемом. Глубокие фактуры соседствуют с легкими силуэтами мебели, а продуманная система хранения освобождает комнаты для жизни. Мягкий свет объединяет интерьер в одну спокойную композицию.', photos: ['photo-1600210491892-03d54c0aaf87','photo-1600607687920-4e2a09cf159d','photo-1600566753190-17f0baa2a6c3'] }
];

// Content stays visible when JS or an observer is unavailable.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('js-motion');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  $$('.mask, .reveal, .photo-reveal').forEach(el => observer.observe(el));
}
$('#year').textContent = new Date().getFullYear();
const menuToggle = $('.menu-toggle');
function closeMenu() { $('nav').classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }
menuToggle.addEventListener('click', () => {
  const open = $('nav').classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(open));
});
$$('nav a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

let scrollTick = false;
function drawScroll() {
  const y = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  $('.scroll-progress').style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  if (!reducedMotion.matches) {
    $('.parallax-img').style.transform = `translateY(${Math.min(y * .06, 30)}px)`;
    $$('[data-parallax]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < innerHeight + 200 && rect.bottom > -200) el.style.transform = `translateY(${(rect.top - innerHeight / 2) * Number(el.dataset.parallax)}px)`;
    });
  }
  scrollTick = false;
}
addEventListener('scroll', () => { if (!scrollTick) { scrollTick = true; requestAnimationFrame(drawScroll); } }, { passive: true });
addEventListener('resize', drawScroll); drawScroll();
$$('.magnetic').forEach(button => {
  button.addEventListener('pointermove', event => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const rect = button.getBoundingClientRect();
    button.style.translate = `${(event.clientX - rect.left - rect.width / 2) * .18}px ${(event.clientY - rect.top - rect.height / 2) * .18}px`;
    button.style.transition = 'translate .15s ease-out, background .3s';
  });
  button.addEventListener('pointerleave', () => { button.style.transition = 'translate .6s cubic-bezier(.2,.8,.2,1),background .3s'; button.style.translate = '0 0'; });
});
const preview = $('.hover-preview');
let previewFrame = null, targetX = 0, targetY = 0, previewX = 0, previewY = 0;
function followPreview() {
  previewX += (targetX - previewX) * .13; previewY += (targetY - previewY) * .13;
  preview.style.transform = `translate3d(${previewX}px,${previewY}px,0) rotate(-3deg)`;
  if (Math.abs(targetX - previewX) + Math.abs(targetY - previewY) > .3) previewFrame = requestAnimationFrame(followPreview);
  else previewFrame = null;
}
function positionPreview(event) {
  targetX = Math.max(12, Math.min(event.clientX + 30, innerWidth - 365));
  targetY = Math.max(100, Math.min(event.clientY - 125, innerHeight - 265));
  if (!previewFrame) previewFrame = requestAnimationFrame(followPreview);
}
function hidePreview() { preview.classList.remove('active'); }
$$('.project-row').forEach(row => {
  row.addEventListener('pointerenter', event => {
    if (!finePointer.matches || reducedMotion.matches) return;
    $('img', preview).src = photo(projects[Number(row.dataset.project)].photos[0], 800);
    positionPreview(event); previewX = targetX; previewY = targetY; preview.classList.add('active');
  });
  row.addEventListener('pointermove', event => { if (finePointer.matches && !reducedMotion.matches) positionPreview(event); });
  row.addEventListener('pointerleave', hidePreview);
  row.addEventListener('click', () => showProject(Number(row.dataset.project)));
});
addEventListener('scroll', hidePreview, { passive: true });

const dialogFocus = new WeakMap();
function openDialog(dialog) {
  dialogFocus.set(dialog, document.activeElement); hidePreview(); closeMenu();
  dialog.showModal(); document.body.classList.add('modal-open');
}
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.classList.remove('modal-open'); const opener = dialogFocus.get(dialog); if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  $$('[data-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
});
function showProject(index) {
  const p = projects[index];
  $('#project-content').innerHTML = `<img class="project-cover" src="${photo(p.photos[0],1600)}" alt="${p.title}: общий вид интерьера"><div class="project-detail"><span class="eyebrow">${p.type} / ${p.area} м² / ${p.year}</span><h2>${p.title}</h2><p class="project-detail-copy">${p.description}</p><div class="project-gallery">${p.photos.slice(1).map((id, i) => `<img src="${photo(id,900)}" alt="${p.title}: детали интерьера ${i+1}" loading="lazy">`).join('')}</div><button class="submit-button" id="similar-project">Хочу похожий проект <span>↗</span></button></div>`;
  openDialog($('#project-dialog')); $('#project-dialog').scrollTop = 0;
  $('#similar-project').addEventListener('click', () => { $('#project-dialog').close(); showLead('brief', p); });
}
const form = $('#lead-form');
let projectContext = '', startedAt = Date.now(), submitting = false, leadArea = null;
function updateEstimate() {
  const area = Number($('#area').value);
  $('#area-value').textContent = `${area} м²`;
  $('#estimate-value').textContent = `от ${new Intl.NumberFormat('ru-RU').format(area * 6000)} ₽`;
}
$('#area').addEventListener('input', updateEstimate);
function showLead(mode, project) {
  if (submitting) return;
  form.reset(); $('#form-error').textContent = ''; $('.lead-body').hidden = false; $('.success-screen').hidden = true;
  leadArea = mode === 'estimate' ? Number($('#area').value) : null;
  const summary = $('#lead-estimate-summary');
  summary.hidden = leadArea === null;
  if (leadArea !== null) summary.textContent = `${leadArea} м² · Дизайн-проект от ${new Intl.NumberFormat('ru-RU').format(leadArea * 6000)} ₽`;
  projectContext = project ? project.title : mode === 'estimate' ? 'Расчет бюджета' : 'Обсуждение проекта';
  const selectedType = project?.type || (mode === 'estimate' ? $('input[name="calculator-type"]:checked').value : 'Квартира');
  $$('input[name="type"]').forEach(input => { input.checked = input.value === selectedType; });
  $('#phone').setCustomValidity('');
  startedAt = Date.now(); openDialog($('#lead-dialog')); $('#lead-dialog').scrollTop = 0;
}
updateEstimate();
$$('[data-lead]').forEach(button => button.addEventListener('click', () => showLead(button.dataset.lead)));
$$('[data-privacy]').forEach(button => button.addEventListener('click', () => openDialog($('#privacy-dialog'))));
function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.slice(1);
  digits = digits.slice(0,10);
  if (!digits.length) return '+7';
  let result = '+7 (' + digits.slice(0,3);
  if (digits.length >= 3) result += ') ';
  if (digits.length > 3) result += digits.slice(3,6);
  if (digits.length > 6) result += '-' + digits.slice(6,8);
  if (digits.length > 8) result += '-' + digits.slice(8,10);
  return result;
}
$('#phone').addEventListener('input', event => {
  const input = event.target, old = input.value, position = input.selectionStart;
  input.value = formatPhone(old); input.setCustomValidity('');
  if (position < old.length) input.setSelectionRange(Math.min(position,input.value.length),Math.min(position,input.value.length));
});
$('#phone').addEventListener('focus', event => { if (!event.target.value) event.target.value = '+7'; });
form.addEventListener('submit', async event => {
  event.preventDefault(); if (submitting) return;
  const phone = $('#phone').value.replace(/\D/g,'');
  if (!/^7\d{10}$/.test(phone)) { $('#phone').setCustomValidity('Введите телефон полностью: +7 и 10 цифр.'); $('#phone').reportValidity(); return; }
  if (!form.reportValidity()) return;
  submitting = true; const button = $('.submit-button', form); button.disabled = true; $('span',button).textContent = 'Отправляем…'; $('#form-error').textContent = '';
  const data = Object.fromEntries(new FormData(form)); data.consent = data.consent === 'on'; data.startedAt = startedAt; data.context = projectContext;
  if (leadArea !== null) data.area = leadArea;
  try {
    const response = await fetch('/api/send', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), signal:AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Не удалось отправить заявку. Попробуйте еще раз.');
    $('.lead-body').hidden = true; $('.success-screen').hidden = false; $('.success-screen').focus(); form.reset();
  } catch (error) { $('#form-error').textContent = error.name === 'TimeoutError' ? 'Сервер долго отвечает. Попробуйте еще раз чуть позже.' : error instanceof TypeError ? 'Нет связи с сервером. Проверьте подключение и повторите отправку.' : error.message; }
  finally { submitting = false; button.disabled = false; $('span',button).textContent = 'Отправить заявку'; }
});
