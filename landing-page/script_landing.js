// ══════════════════════════════════════════════
//  CRONOS — script_landing.js
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // CURSOR
  const cur  = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  if (cur && ring) {
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + 'px'; cur.style.top = my + 'px';
    });
    function animRing() {
      rx += (mx - rx) * .12; ry += (my - ry) * .12;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(animRing);
    }
    animRing();
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => { cur.classList.add('active');    ring.classList.add('active');    });
      el.addEventListener('mouseleave', () => { cur.classList.remove('active'); ring.classList.remove('active'); });
    });
  }

  // NAV SCROLL
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    });
  }

  // WAVE BG
  const cv = document.getElementById('bg-canvas');
  if (cv) {
    const cx = cv.getContext('2d');
    function rs() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
    rs();
    window.addEventListener('resize', rs);
    const ws = [
      { a:45, f:.010, sp:.014, ph:0,   color:'rgba(87,16,209,.65)',   y:.25 },
      { a:30, f:.016, sp:.020, ph:1.4, color:'rgba(160,80,255,.42)',  y:.42 },
      { a:55, f:.008, sp:.010, ph:2.6, color:'rgba(50,0,130,.55)',    y:.58 },
      { a:24, f:.020, sp:.028, ph:.8,  color:'rgba(192,120,255,.28)', y:.72 },
      { a:40, f:.006, sp:.008, ph:3.6, color:'rgba(75,8,160,.5)',     y:.85 },
      { a:18, f:.024, sp:.036, ph:5.2, color:'rgba(130,40,220,.3)',   y:.95 },
    ];
    let t = 0;
    function draw() {
      cx.clearRect(0, 0, cv.width, cv.height);
      ws.forEach(w => {
        cx.beginPath();
        const by = cv.height * w.y;
        cx.moveTo(0, by);
        for (let x = 0; x <= cv.width; x += 3) {
          const y = by
            + Math.sin(x * w.f + t * w.sp + w.ph) * w.a
            + Math.sin(x * w.f * 1.7 + t * w.sp * .6 + w.ph) * (w.a * .4);
          cx.lineTo(x, y);
        }
        cx.lineTo(cv.width, cv.height);
        cx.lineTo(0, cv.height);
        cx.closePath();
        const g = cx.createLinearGradient(0, by - w.a, 0, by + w.a * 2.2);
        g.addColorStop(0, w.color);
        g.addColorStop(1, 'transparent');
        cx.fillStyle = g;
        cx.fill();
      });
      t++;
      requestAnimationFrame(draw);
    }
    draw();
  }

  // MINI CHART
  const mc = document.getElementById('miniChart');
  if (mc) {
    const vals = [45, 62, 55, 80, 70, 88, 72, 95, 60, 85, 78, 100];
    const max  = Math.max(...vals);
    mc.innerHTML = vals.map((v, i) => {
      const h   = Math.round((v / max) * 52) + 4;
      const clr = i === vals.length - 1 ? 'var(--verde)' : 'rgba(184,127,255,.4)';
      return `<div class="mcb" style="height:${h}px;background:${clr}"></div>`;
    }).join('');
  }

  // CAROUSEL
  const slides  = document.querySelectorAll('.carousel-slide');
  const track   = document.getElementById('carouselTrack');
  const dotsEl  = document.getElementById('ccDots');
  const btnPrev = document.getElementById('ccPrev');
  const btnNext = document.getElementById('ccNext');
  if (slides.length && track && dotsEl) {
    let current = 0;
    const total   = slides.length;
    const visible = 3;
    slides.forEach((s, i) => s.classList.toggle('active', i === 0));
    for (let i = 0; i < total; i++) {
      const d = document.createElement('div');
      d.className = 'cc-dot' + (i === 0 ? ' active' : '');
      d.onclick   = () => goSlide(i);
      dotsEl.appendChild(d);
    }
    function goSlide(n) {
      slides[current].classList.remove('active');
      current = ((n % total) + total) % total;
      slides[current].classList.add('active');
      const slideW = 344;
      const offset = Math.max(0, Math.min(current - 1, total - visible)) * slideW;
      track.style.transform = `translateX(-${offset}px)`;
      document.querySelectorAll('.cc-dot').forEach((d, i) =>
        d.classList.toggle('active', i === current)
      );
    }
    if (btnPrev) btnPrev.onclick = () => goSlide(current - 1);
    if (btnNext) btnNext.onclick = () => goSlide(current + 1);
    let autoTimer = setInterval(() => goSlide(current + 1), 3600);
    track.addEventListener('mouseenter', () => clearInterval(autoTimer));
    track.addEventListener('mouseleave', () => {
      autoTimer = setInterval(() => goSlide(current + 1), 3600);
    });
  }

  // HOW IT WORKS
  const steps  = document.querySelectorAll('.how-step');
  const panels = document.querySelectorAll('.visual-panel');
  if (steps.length) {
    steps.forEach(s => {
      s.addEventListener('click', () => {
        const n = +s.dataset.step;
        steps.forEach(x  => x.classList.remove('active'));
        panels.forEach((p, i) => p.classList.toggle('active', i === n));
        s.classList.add('active');
      });
    });
    let howIdx = 0;
    setInterval(() => {
      howIdx = (howIdx + 1) % steps.length;
      steps[howIdx].click();
    }, 4000);
  }

  // SCROLL REVEAL
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // COUNT UP
  const numObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target.querySelector('[data-target]');
      if (!el || el.dataset.done) return;
      el.dataset.done = '1';
      const target = +el.dataset.target;
      let start = 0;
      const dur  = 1800;
      const step = 16;
      const inc  = target / (dur / step);
      const suffix = target === 3 ? '×' : '%';
      const timer = setInterval(() => {
        start = Math.min(start + inc, target);
        el.textContent = Math.round(start) + suffix;
        if (start >= target) clearInterval(timer);
      }, step);
      e.unobserve(e.target);
    });
  }, { threshold: .4 });
  document.querySelectorAll('.metric-card').forEach(c => numObserver.observe(c));

  // AUTH MODAL
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAuth();
    });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth(); });
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  const closeBtn = document.getElementById('authClose');
  if (closeBtn) closeBtn.addEventListener('click', closeAuth);

}); // fim DOMContentLoaded

// ══════════════════════════════════════════════
//  AUTH — funções globais
// ══════════════════════════════════════════════

function openAuth(tab = 'login') {
  const overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
  // Reset 2FA ao abrir
  twofaShowStep('email');
  const e1 = document.getElementById('resetEmail');
  if (e1) { e1.value = ''; e1.style.borderColor = ''; }
}

function closeAuth() {
  const overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function switchTab(tabId) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tabId)
  );
  showPanel(tabId);
}

function showPanel(panelId) {
  const map = { login: 'panelLogin', register: 'panelRegister', reset: 'panelReset' };
  const targetId = map[panelId] || panelId;
  document.querySelectorAll('.auth-panel').forEach(p => {
    p.classList.toggle('active', p.id === targetId);
  });
  if (panelId === 'reset') {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    twofaShowStep('email');
  }
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  btn.innerHTML = showing
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function checkStrength(input) {
  const val = input.value;
  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const bars = ['sb1', 'sb2', 'sb3', 'sb4'];
  const cls  = score <= 1 ? 's1' : score <= 2 ? 's2' : 's3';
  bars.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'auth-strength-bar' + (i < score ? ' ' + cls : '');
  });
}

// ROLE SELECTOR
window._selectedRole = null;
function selectRole(role, btn) {
  document.querySelectorAll('.auth-role-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  window._selectedRole = role;
}

// ══════════════════════════════════════════════
//  2FA FLOW
// ══════════════════════════════════════════════

function twofaShowStep(step) {
  const steps = ['email', 'auth', 'approved', 'denied', 'done'];
  steps.forEach(s => {
    const el = document.getElementById('twofa-step-' + s);
    if (el) el.style.display = (s === step) ? 'block' : 'none';
  });
}

function startTwoFA() {
  const email = document.getElementById('resetEmail');
  if (email && !email.value.includes('@')) {
    email.focus();
    email.style.borderColor = 'var(--vermelho)';
    email.style.boxShadow   = '0 0 0 3px rgba(255,94,126,.15)';
    setTimeout(() => {
      email.style.borderColor = '';
      email.style.boxShadow   = '';
    }, 1600);
    return;
  }
  twofaShowStep('auth');
}

function backToEmail() {
  twofaShowStep('email');
}

function handle2FA(result) {
  if (result === 'approve') {
    twofaShowStep('approved');
    // limpa campos nova senha
    const p1 = document.getElementById('newPw1');
    const p2 = document.getElementById('newPw2');
    if (p1) p1.value = '';
    if (p2) p2.value = '';
    const bars = ['sb2-1','sb2-2','sb2-3','sb2-4'];
    bars.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'auth-strength-bar';
    });
  } else {
    twofaShowStep('denied');
  }
}

function retryTwoFA() {
  twofaShowStep('auth');
}

function confirmNewPw() {
  const p1 = document.getElementById('newPw1');
  const p2 = document.getElementById('newPw2');
  if (!p1 || !p2) return;

  // valida comprimento
  if (p1.value.length < 8) {
    p1.focus();
    p1.style.borderColor = 'var(--vermelho)';
    p1.style.boxShadow   = '0 0 0 3px rgba(255,94,126,.15)';
    setTimeout(() => { p1.style.borderColor = ''; p1.style.boxShadow = ''; }, 1600);
    return;
  }

  // valida confirmação
  if (p1.value !== p2.value) {
    p2.focus();
    p2.style.borderColor = 'var(--vermelho)';
    p2.style.boxShadow   = '0 0 0 3px rgba(255,94,126,.15)';
    setTimeout(() => { p2.style.borderColor = ''; p2.style.boxShadow = ''; }, 1600);
    return;
  }

  twofaShowStep('done');
}

function checkStrength2(input) {
  const val = input.value;
  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const bars = ['sb2-1','sb2-2','sb2-3','sb2-4'];
  const cls  = score <= 1 ? 's1' : score <= 2 ? 's2' : 's3';
  bars.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'auth-strength-bar' + (i < score ? ' ' + cls : '');
  });
}