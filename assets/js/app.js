/* ============================================================
   AZORA SOLUTIONS — interactions layer (progressive enhancement)
   Real multi-page site: navigation works without JS.
   This file adds: global custom cursor · mobile menu · scroll FX ·
   counters · FAQ · product modal · hardware filters · quote preselect/submit ·
   success page hydration · concierge chat · image fallback
   ============================================================ */
(function () {
  'use strict';

  var PRODUCTS = (window.AZ_DATA && window.AZ_DATA.products) || [];
  var SERVICES = (window.AZ_DATA && window.AZ_DATA.services) || [];
  var ALL = PRODUCTS.concat(SERVICES);

  /* ---------- tiny utils ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(s) { return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0; }
  function imgSrc(p) {
    var map = window.AZ_IMG || {};
    var rel = (p.image || '').replace(/^assets\/img\//, '');
    return map[rel] || p.image;
  }

  var P = {
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    send: '<path d="M21 3L10.5 13.5M21 3l-7 18-3.5-7.5L3 10z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-8 8c-1.3 0-2.6-.3-3.7-.9L4 20l1-5.1A8 8 0 1 1 21 12z"/>',
    spark: '<path d="M12 2l1.9 5.6 5.8.2-4.6 3.6 1.7 5.8-4.8-3.4-4.8 3.4 1.7-5.8L4.3 7.8l5.8-.2z"/>',
    box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>'
  };
  function I(n, cls) { return '<svg viewBox="0 0 24 24" class="' + (cls || 'h-4 w-4') + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || '') + '</svg>'; }

  /* ============================================================
     GLOBAL CUSTOM CURSOR (Active across every page on desktop)
     ============================================================ */
  function initGlobalCursor() {
    var hasTouchOnly = ('ontouchstart' in window) && !window.matchMedia('(any-pointer:fine)').matches && !window.matchMedia('(pointer:fine)').matches;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (hasTouchOnly || reducedMotion) return;

    var root = document.documentElement;

    // Inject cursor styles if not already defined
    if (!document.getElementById('azora-cursor-styles')) {
      var style = document.createElement('style');
      style.id = 'azora-cursor-styles';
      style.textContent = [
        '@media (pointer:fine) and (hover:hover) and (prefers-reduced-motion:no-preference) {',
        '  html.cursor-ready, html.cursor-ready body { cursor:none; }',
        '  html.cursor-ready a, html.cursor-ready button, html.cursor-ready input,',
        '  html.cursor-ready textarea, html.cursor-ready select, html.cursor-ready label,',
        '  html.cursor-ready [role="button"], html.cursor-ready .chip, html.cursor-ready .pick,',
        '  html.cursor-ready .card-hover, html.cursor-ready summary { cursor:none; }',
        '  .cursor-core, .cursor-ring {',
        '    position:fixed; top:0; left:0; z-index:99999; pointer-events:none; opacity:0;',
        '    transform:translate3d(-100px,-100px,0) translate(-50%,-50%);',
        '    transition:opacity .2s ease, width .22s cubic-bezier(0.16,1,0.3,1), height .22s cubic-bezier(0.16,1,0.3,1), background .2s ease, border-color .2s ease, box-shadow .2s ease;',
        '  }',
        '  .cursor-core {',
        '    width:6px; height:6px; border-radius:50%; background:#2469EB;',
        '    box-shadow:0 0 0 3px rgba(36,105,235,.15), 0 0 14px rgba(36,105,235,.6);',
        '  }',
        '  .cursor-ring {',
        '    width:32px; height:32px; border:1.2px solid rgba(36,105,235,.55); border-radius:50%;',
        '    background:rgba(255,255,255,.08); box-shadow:0 0 20px rgba(36,105,235,.15), inset 0 0 10px rgba(255,255,255,.15);',
        '    backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);',
        '  }',
        '  html.cursor-ready .cursor-core, html.cursor-ready .cursor-ring { opacity:1; }',
        '  html.cursor-ready.cursor-hover .cursor-ring {',
        '    width:48px; height:48px; border-color:rgba(36,105,235,.9); background:rgba(36,105,235,.12);',
        '    box-shadow:0 0 26px rgba(36,105,235,.3), inset 0 0 14px rgba(255,255,255,.3);',
        '  }',
        '  html.cursor-ready.cursor-hover .cursor-core {',
        '    transform:translate3d(-100px,-100px,0) translate(-50%,-50%) scale(1.2);',
        '  }',
        '  html.cursor-ready.cursor-click .cursor-ring { animation:az-cursor-click .45s ease-out; }',
        '}',
        '@keyframes az-cursor-click { 0% { box-shadow:0 0 0 0 rgba(36,105,235,.6); } 100% { box-shadow:0 0 0 20px rgba(36,105,235,0); } }'
      ].join('\n');
      document.head.appendChild(style);
    }

    // Ensure core and ring elements exist
    var core = $('.cursor-core');
    var ring = $('.cursor-ring');

    if (!core) {
      core = document.createElement('div');
      core.className = 'cursor-core';
      core.setAttribute('aria-hidden', 'true');
      document.body.appendChild(core);
    }
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'cursor-ring';
      ring.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ring);
    }

    var x = -100, y = -100;
    var frame = null;

    root.classList.add('cursor-ready');

    window.addEventListener('pointermove', function (event) {
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        core.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
        ring.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
        frame = null;
      });
    }, { passive: true });

    var hoverSelector = 'a, button, input, textarea, select, [role="button"], label, .chip, .pick, .card-hover, .pricing-card, summary, [onclick]';

    document.addEventListener('pointerover', function (event) {
      if (event.target && event.target.closest && event.target.closest(hoverSelector)) {
        root.classList.add('cursor-hover');
      }
    });

    document.addEventListener('pointerout', function (event) {
      if (!event.relatedTarget || !event.relatedTarget.closest || !event.relatedTarget.closest(hoverSelector)) {
        root.classList.remove('cursor-hover');
      }
    });

    document.addEventListener('pointerdown', function () {
      root.classList.remove('cursor-click');
      void root.offsetWidth; // trigger reflow
      root.classList.add('cursor-click');
    });

    window.addEventListener('blur', function () {
      root.classList.remove('cursor-hover');
    });

    document.addEventListener('mouseleave', function () {
      core.style.opacity = '0';
      ring.style.opacity = '0';
    });

    document.addEventListener('mouseenter', function () {
      core.style.opacity = '1';
      ring.style.opacity = '1';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalCursor);
  } else {
    initGlobalCursor();
  }

  /* ---------- self-healing images ---------- */
  function imgFallback(t) {
    if (!t || t.tagName !== 'IMG' || t.dataset.fb) return;
    var src = t.getAttribute('src') || '';
    var map = window.AZ_IMG || {};
    var key = Object.keys(map).filter(function (k) { return src.indexOf(k) !== -1; })[0];
    if (key) { t.dataset.fb = '1'; t.src = map[key]; }
  }
  document.addEventListener('error', function (e) { imgFallback(e.target); }, true);
  function sweep() { $$('img').forEach(function (t) { if (t.complete && t.naturalWidth === 0 && t.src.indexOf('data:') !== 0) imgFallback(t); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep);

  /* ---------- mobile menu ---------- */
  var menuBtn = $('#menu-btn'), mobileMenu = $('#mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      var hidden = mobileMenu.classList.toggle('hidden');
      var openIc = $('#menu-ic-open');
      var closeIc = $('#menu-ic-close');
      if (openIc) openIc.classList.toggle('hidden', !hidden);
      if (closeIc) closeIc.classList.toggle('hidden', hidden);
    });
    $$('a', mobileMenu).forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.add('hidden');
        var openIc = $('#menu-ic-open');
        var closeIc = $('#menu-ic-close');
        if (openIc) openIc.classList.remove('hidden');
        if (closeIc) closeIc.classList.add('hidden');
      });
    });
  }

  /* ---------- header shrink ---------- */
  var headerInner = $('#header-inner');
  if (headerInner) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 24) headerInner.classList.add('shadow-lift');
      else headerInner.classList.remove('shadow-lift');
    }, { passive: true });
  }

  /* ---------- reveal on scroll + counters ---------- */
  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseInt(el.dataset.count, 10);
    var dur = 1500, t0 = performance.now();
    function fmt(n) { return n.toLocaleString('en-US'); }
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('.counter', en.target).forEach(runCounter);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- FAQ ---------- */
  window.AZ = window.AZ || {};
  AZ.toggleFaq = function (btn) {
    var item = btn.closest('.faq-item');
    if (!item) return;
    var was = item.classList.contains('open');
    $$('.faq-item.open').forEach(function (el) {
      el.classList.remove('open');
      var p = el.querySelector('.faq-panel');
      if (p) p.classList.remove('open');
    });
    if (!was) {
      item.classList.add('open');
      var p = item.querySelector('.faq-panel');
      if (p) p.classList.add('open');
    }
  };

  /* ---------- modal shell ---------- */
  var modalRoot = $('#modal-root');
  function openModal(inner, width) {
    if (!modalRoot) return;
    modalRoot.innerHTML =
      '<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6" id="modal-overlay">' +
        '<div class="fade-in absolute inset-0 bg-black/75 backdrop-blur-md" onclick="AZ.closeModal()"></div>' +
        '<div class="sheet-up relative w-full ' + (width || 'max-w-2xl') + ' overflow-hidden rounded-2xl bg-[#121B2C] border border-white/10 shadow-lift" role="dialog" aria-modal="true">' + inner + '</div>' +
      '</div>';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') AZ.closeModal(); }
  AZ.closeModal = function () {
    var ov = $('#modal-overlay');
    if (ov) { ov.style.transition = 'opacity .25s'; ov.style.opacity = '0'; setTimeout(function () { if (modalRoot) modalRoot.innerHTML = ''; }, 240); }
    document.body.style.overflow = '';
    document.removeEventListener('keydown', escClose);
  };

  /* ---------- product detail modal ---------- */
  AZ.openProduct = function (id) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    openModal(
      '<div class="grid max-h-[86vh] overflow-y-auto md:grid-cols-[1fr_1.15fr] md:overflow-visible bg-[#121B2C] text-white rounded-2xl border border-white/10 shadow-2xl">' +
        '<div class="relative flex items-center justify-center bg-[#0B1320] p-8 md:min-h-[500px] border-b md:border-b-0 md:border-r border-white/10">' +
          '<div class="absolute h-56 w-56 rounded-full bg-azora-red/15 blur-3xl pointer-events-none"></div>' +
          '<img src="' + imgSrc(p) + '" alt="' + esc(p.name) + '" class="relative max-h-[280px] w-full object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] md:max-h-[360px]" />' +
          '<span class="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-emerald-400 shadow-card backdrop-blur"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>In Stock</span>' +
        '</div>' +
        '<div class="max-h-[86vh] overflow-y-auto p-6 sm:p-8 space-y-6 no-scrollbar">' +
          '<div class="flex items-center justify-between gap-3">' +
            '<span class="rounded-full bg-azora-red/15 border border-azora-red/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">' + esc(p.category) + '</span>' +
            '<button onclick="AZ.closeModal()" aria-label="Close modal" class="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white">' + I('x') + '</button>' +
          '</div>' +
          '<div>' +
            '<h2 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-white">' + esc(p.name) + '</h2>' +
            '<p class="mt-2 text-[14px] leading-relaxed text-slate-300">' + esc(p.tagline) + '</p>' +
          '</div>' +
          '<div class="flex items-end justify-between border-y border-white/10 py-4">' +
            '<div>' +
              '<div class="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">Lease Option</div>' +
              '<div class="font-heading text-3xl font-extrabold text-azora-red">From ' + esc(p.lease) + '<span class="text-sm font-semibold text-slate-300">/month</span></div>' +
            '</div>' +
            '<div class="text-right">' +
              '<div class="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">Retail Value</div>' +
              '<div class="font-mono text-base font-bold text-slate-400 line-through decoration-slate-500">' + esc(p.retail) + '</div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<h3 class="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-400">Specifications</h3>' +
            '<div class="mt-3 grid grid-cols-2 gap-2.5">' +
              p.specs.map(function (s) {
                return '<div class="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">' +
                  '<div class="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400">' + esc(s[0]) + '</div>' +
                  '<div class="mt-1 text-[13px] font-bold text-white">' + esc(s[1]) + '</div></div>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<h3 class="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-400">Included In Package</h3>' +
            '<ul class="mt-3 space-y-2">' +
              p.features.map(function (f) { return '<li class="flex items-start gap-2.5 text-[13px] font-medium text-slate-200"><span class="mt-0.5 text-azora-red">' + I('check') + '</span>' + esc(f) + '</li>'; }).join('') +
            '</ul>' +
          '</div>' +
          '<div class="pt-2 flex gap-3">' +
            '<a href="get-a-quote.html?hardware=' + encodeURIComponent(p.id) + '" class="flex-1 rounded-xl bg-azora-red py-3.5 text-center text-sm font-bold text-white transition-all hover:bg-blue-600 hover:shadow-chip shadow-md">Request Quote</a>' +
            '<button type="button" onclick="AZ.closeModal()" class="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-slate-200 transition-all hover:bg-white/10 hover:text-white">Close</button>' +
          '</div>' +
        '</div>' +
      '</div>', 'max-w-4xl');
  };

  /* ---------- hardware page: brand filters ---------- */
  var page = (document.body.getAttribute('data-page') || '');
  if (page === 'hardware') {
    var grid = $('#catalog-grid');
    AZ.filterBrand = function (id, btn) {
      $$('#brand-filters .chip').forEach(function (c) { c.classList.toggle('on', c === btn || c.dataset.brand === id); });
      var cards = $$('article', grid);
      var visible = 0;
      cards.forEach(function (c) {
        var show = id === 'all' || c.dataset.brand === id;
        c.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      var label = btn ? btn.textContent : 'All Hardware';
      var count = $('#catalog-count');
      if (count) count.textContent = visible + ' model' + (visible === 1 ? '' : 's') + ' · ' + label;
      try { history.replaceState(null, '', (location.pathname || '/hardware') + (id === 'all' ? '' : '?brand=' + id)); } catch (e) {}
    };
    // initial state from ?brand=
    (function () {
      var q = new URLSearchParams(location.search).get('brand') || 'all';
      var btn = $('#brand-filters .chip[data-brand="' + q + '"]') || $('#brand-filters .chip[data-brand="all"]');
      if (btn) AZ.filterBrand(btn.dataset.brand, btn);
    })();
  }

  /* ---------- quote page ---------- */
  if (page === 'quote') {
    var sel = new Set();
    var pickWrap = $('#quote-picks');
    var countEl = $('#quote-pick-count');

    function updateCount() {
      if (!countEl) return;
      var total = 0;
      sel.forEach(function (id) { var p = ALL.filter(function (x) { return x.id === id; })[0]; if (p) total += money(p.lease); });
      countEl.textContent = sel.size ? sel.size + ' selected · est. $' + total.toFixed(2) + '/mo' : 'Select any terminals or plans';
    }
    AZ.togglePick = function (id, el) {
      if (sel.has(id)) sel.delete(id); else sel.add(id);
      el.classList.toggle('on', sel.has(id));
      updateCount();
    };
    // preselect from ?product=
    (function () {
      var q = new URLSearchParams(location.search).get('product');
      if (!q) return;
      var btn = pickWrap ? pickWrap.querySelector('[data-id="' + q + '"]') : null;
      if (btn) AZ.togglePick(q, btn);
    })();

    function showQuoteSuccessModal(data) {
      var items = data.items || [];
      var itemsHtml = '';
      if (items.length > 0) {
        itemsHtml = '<div class="mt-4 rounded-xl border border-azora-blue/10 bg-azora-mist/60 p-3.5 text-left">' +
          '<div class="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-azora-blue/50 mb-2">Requested Hardware / Plan (' + items.length + ')</div>' +
          '<div class="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">' +
          items.map(function(it){
            var n = typeof it === 'string' ? it : (it.name || it.id);
            var l = typeof it === 'object' && it.lease ? '<span class="text-azora-red font-bold text-xs">' + esc(it.lease) + '<small class="text-[10px] text-azora-blue/40">/mo</small></span>' : '';
            return '<div class="flex items-center justify-between text-xs py-1 border-b border-azora-blue/5 last:border-0">' +
              '<span class="font-semibold text-azora-blue">' + esc(n) + '</span>' + l +
            '</div>';
          }).join('') +
          '</div></div>';
      }

      openModal(
        '<div class="p-6 sm:p-8 text-center">' +
          '<div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-card pop-in mb-4">' +
            '<svg viewBox="0 0 24 24" class="h-8 w-8 draw-check" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>' +
          '</div>' +
          '<span class="inline-flex items-center gap-1.5 rounded-full bg-azora-mist px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-azora-blue/60 mb-2">' +
            'Ref: <strong class="text-azora-red">' + esc(data.ref || 'AZ-PENDING') + '</strong>' +
          '</span>' +
          '<h2 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-azora-blue">Quote Request Received!</h2>' +
          '<p class="mt-2.5 text-[13.5px] leading-relaxed text-azora-blue/65 max-w-md mx-auto">' +
            'Thank you, <strong class="text-azora-blue">' + esc(data.contact || 'there') + '</strong>! Your request for <strong class="text-azora-blue">' + esc(data.business || 'your business') + '</strong> has been safely recorded. Our team is building your fleet proposal and will reach out to <strong class="text-azora-blue">' + esc(data.email || 'you') + '</strong> shortly.' +
          '</p>' +
          itemsHtml +
          '<div class="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">' +
            '<a href="/success" class="rounded-xl bg-azora-blue px-6 py-3 text-xs font-bold text-white transition-all hover:bg-azora-red hover:shadow-chip">View Full Confirmation</a>' +
            '<a href="/hardware" class="rounded-xl border border-azora-blue/15 px-5 py-3 text-xs font-bold text-azora-blue transition-all hover:border-azora-blue hover:bg-azora-mist">Hardware Catalog</a>' +
            '<button type="button" onclick="AZ.closeModal()" class="rounded-xl border border-transparent px-4 py-3 text-xs font-semibold text-azora-blue/60 hover:text-azora-blue">Close</button>' +
          '</div>' +
        '</div>',
        'max-w-lg'
      );
    }
    AZ.showQuoteSuccessModal = showQuoteSuccessModal;

    var form = $('#quote-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var qParams = new URLSearchParams(location.search);
        var qProduct = qParams.get('product') || qParams.get('hardware') || qParams.get('plan') || '';
        var qType = qParams.get('type') || (qProduct.indexOf('website') !== -1 || qProduct.indexOf('marketing') !== -1 ? 'plan' : (qProduct ? 'hardware' : ''));
        
        var selectedItemIds = [];
        // 1. From .quote-hardware-card.selected or .quote-plan-card.selected
        $$('.quote-hardware-card.selected, .quote-plan-card.selected', form).forEach(function (el) {
          if (el.dataset.id && selectedItemIds.indexOf(el.dataset.id) === -1) selectedItemIds.push(el.dataset.id);
        });
        // 2. From #quote-picks .pick.on
        $$('#quote-picks .pick.on').forEach(function (el) {
          if (el.dataset.id && selectedItemIds.indexOf(el.dataset.id) === -1) selectedItemIds.push(el.dataset.id);
        });
        // 3. From sel Set
        if (typeof sel !== 'undefined' && sel.size) {
          sel.forEach(function (id) {
            if (selectedItemIds.indexOf(id) === -1) selectedItemIds.push(id);
          });
        }
        // 4. From query param if still empty
        if (!selectedItemIds.length && qProduct) {
          selectedItemIds.push(qProduct);
        }

        var liveAll = ((window.AZ_DATA && window.AZ_DATA.products) || PRODUCTS).concat((window.AZ_DATA && window.AZ_DATA.services) || SERVICES);
        var selectedItems = selectedItemIds.map(function (id) {
          var found = liveAll.filter(function (x) { return x.id === id; })[0];
          return found ? { id: found.id, name: found.name, category: found.category, lease: found.lease } : { id: id, name: id.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) };
        });

        var eventType = 'general_quote';
        if (qType === 'hardware' || selectedItems.some(function (it) { return PRODUCTS.some(function (p) { return p.id === it.id; }); })) {
          eventType = 'hardware_quote';
        } else if (qType === 'plan' || qProduct.indexOf('website') !== -1 || qProduct.indexOf('growth') !== -1 || qProduct.indexOf('starter') !== -1 || qProduct.indexOf('premium') !== -1) {
          eventType = 'website_quote';
        } else if (qProduct.indexOf('seo') !== -1) {
          eventType = 'seo_quote';
        } else if (qProduct.indexOf('marketing') !== -1) {
          eventType = 'marketing_quote';
        } else if (qType === 'service') {
          eventType = 'service_quote';
        }

        var data = {
          event_type: eventType,
          business: String(fd.get('business') || '').trim(),
          contact: String(fd.get('contact') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          phone: String(fd.get('phone') || '').trim(),
          locations: String(fd.get('locations') || '1'),
          message: String(fd.get('message') || '').trim(),
          items: selectedItems
        };

        var bad = false;
        var firstBadInput = null;
        [['business', 2], ['contact', 2], ['email', 0]].forEach(function (pair) {
          var k = pair[0];
          var input = form.querySelector('[name=' + k + ']');
          if (!input) return;
          var v = data[k];
          var ok = k === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : v.length >= pair[1];
          input.style.borderColor = ok ? '' : '#DC2626';
          if (!ok) {
            bad = true;
            if (!firstBadInput) firstBadInput = input;
          }
        });
        if (bad) {
          if (firstBadInput) firstBadInput.focus();
          window.alert('Please enter your Business Name, Contact Name, and a valid Email Address to request your quote.');
          return;
        }

        var btn = $('#quote-submit');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = 'Submitting Request…';
        }

        var now = new Date();
        data.ref = 'AZ-' + String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        data.date = now.toISOString();

        try {
          localStorage.setItem('azora_last_quote', JSON.stringify(data));
          var log = JSON.parse(localStorage.getItem('azora_quote_log') || '[]');
          log.push(data);
          localStorage.setItem('azora_quote_log', JSON.stringify(log));
        } catch (err) {}

        function onComplete() {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Request Quote';
          }
          showQuoteSuccessModal(data);
        }

        /* Send to remote storage and trigger Titan server-side email notifications */
        if (window.AZStore) {
          window.AZStore.saveLead(data).then(function (result) {
            if (result && result.ok) {
              onComplete();
            } else {
              if (btn) { btn.disabled = false; btn.innerHTML = 'Request Quote'; }
              window.alert('Your request was not sent. ' + ((result && result.error) || 'Please try again.'));
            }
          }).catch(function (err) {
            console.error('Lead submission caught error:', err);
            onComplete();
          });
        } else {
          onComplete();
        }
      });
    }
  }

  /* ---------- success page hydration ---------- */
  if (page === 'success') {
    (function () {
      var q = null;
      try { q = JSON.parse(localStorage.getItem('azora_last_quote') || 'null'); } catch (e) {}
      if (!q) return;
      var ref = $('#success-ref');
      if (ref && q.ref) {
        var sp = ref.querySelector('span');
        if (sp) sp.textContent = q.ref;
        ref.classList.remove('hidden');
      }
      var msg = $('#success-msg');
      if (msg && q.business) msg.innerHTML = 'Our team will build a custom fleet bundle for <span class="font-bold text-azora-blue">' + esc(q.business) + '</span> and reach out shortly.';
      var note = $('#success-email-note');
      if (note && q.email) { note.textContent = ' — we will contact you at ' + q.email; }
      var items = (q.items || []).map(function (id) { return ALL.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
      var summary = $('#success-summary');
      if (summary && items.length) {
        var total = items.reduce(function (s, p) { return s + money(p.lease); }, 0);
        summary.innerHTML =
          '<div class="flex items-center justify-between border-b border-azora-blue/8 px-6 py-4">' +
            '<span class="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-azora-blue/50">Your Fleet Configuration</span>' +
            '<span class="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-azora-blue/40">' + esc(q.locations || '1') + ' location' + (q.locations === '1' ? '' : 's') + '</span>' +
          '</div>' +
          '<ul class="divide-y divide-azora-blue/6">' +
            items.map(function (p) {
              return '<li class="flex items-center gap-4 px-6 py-3.5">' +
                (p.image ? '<img src="' + imgSrc(p) + '" alt="" class="h-11 w-11 rounded-lg bg-azora-mist object-contain p-1.5" />' : '<span class="grid h-11 w-11 place-items-center rounded-lg bg-azora-mist text-azora-red">' + I(p.icon || 'box', 'h-5 w-5') + '</span>') +
                '<div class="flex-1"><div class="text-sm font-bold">' + esc(p.name) + '</div>' +
                '<div class="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-azora-blue/40">' + esc(p.category) + '</div></div>' +
                '<div class="font-heading text-[15px] font-extrabold text-azora-red">' + p.lease + '<span class="text-[11px] text-azora-blue/40">/mo</span></div></li>';
            }).join('') +
          '</ul>' +
          '<div class="flex items-center justify-between bg-azora-mist/70 px-6 py-4">' +
            '<span class="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-azora-blue/55">Estimated Monthly Lease</span>' +
            '<span class="font-heading text-2xl font-extrabold text-azora-red">$' + total.toFixed(2) + '<span class="text-sm text-azora-blue/45">/mo</span></span>' +
          '</div>';
        summary.classList.remove('hidden');
      }
    })();
  }

  /* ---------- concierge chat ---------- */
  var KB = [
    { k: ['clover flex', 'flex'], a: 'The Clover Flex leases at $39.99/mo (retail value $399) — an ultra-mobile handheld POS with built-in barcode scanner, receipt printer, and WiFi/LTE connectivity.', act: 'quote' },
    { k: ['station duo', 'station'], a: 'The Clover Station Duo is the flagship countertop system at $84.99/mo (retail value $1,799.99) — large cashier touch display, customer-facing display, high-speed receipt printer, cash drawer, and barcode scanner included.', act: 'quote' },
    { k: ['mini'], a: 'The Clover Mini v3 leases at $49.99/mo (retail value $550) — compact countertop POS with built-in contactless/chip reader and a customer-facing thermal receipt printer.', act: 'quote' },
    { k: ['z11'], a: 'The Dejavoo Z11 leases at $29.99/mo (retail value $300) — the essential countertop terminal with EMV/NFC contactless and Tri-Comm capability (Dial, IP, WiFi).', act: 'quote' },
    { k: ['z9'], a: 'The Dejavoo Z9 leases at $34.99/mo (retail value $450) — a mobile standalone PIN pad with an ultra-lasting battery and built-in magnetic stripe and contactless readers.', act: 'quote' },
    { k: ['qd4'], a: 'The Dejavoo QD4 leases at $32.99/mo (retail value $350) — secure Android handheld with quad-core processor, 5.5" color touch panel, 58mm thermal printer, and 1D/2D barcode scanner.', act: 'quote' },
    { k: ['a920', 'pax'], a: 'The PAX A920 Pro leases at $54.99/mo (retail value $600) — a high-end mobile smart terminal running PayDroid Android with a 5.5" display and a rapid 40 lines/sec thermal printer.', act: 'quote' },
    { k: ['a7'], a: 'The Audrey A7 Bundle leases at $79.99/mo (retail value $2,599.99) — the premium enterprise full kit: 21.5" cashier display, 10" touch customer display, Intel i5, bundled scanner, cash drawer, and receipt printer.', act: 'quote' },
    { k: ['a5'], a: 'The Audrey A5-II Bundle leases at $69.99/mo (retail value $2,299.99) — the mid-tier retail bundle: 15.6" cashier display, 10" touch customer display, Intel i3, bundled scanner, cash drawer, and receipt printer.', act: 'quote' },
    { k: ['j14', 'joy'], a: 'The Joy J14 Bundle leases at $44.99/mo (retail value $1,399.99) — the entry bundle: 14" cashier display, bundled scanner, cash drawer, and receipt printer.', act: 'quote' },
    { k: ['price', 'pricing', 'cost', 'lease', 'leasing', 'month', 'rate', 'much'], a: 'Leasing runs $29.99–$84.99/month depending on the terminal — the Dejavoo Z11 starts at $29.99/mo, and the flagship Clover Station Duo is $84.99/mo. Multi-location fleets get custom tiered pricing through the Get a Quote form.', act: 'hardware' },
    { k: ['clover'], a: 'We carry three Clover models: the Station Duo ($84.99/mo, dual-screen flagship), the Mini v3 ($49.99/mo, compact countertop), and the Flex ($39.99/mo, handheld with built-in scanning). Want a quote on any of them?', act: 'quote' },
    { k: ['dejavoo'], a: 'The Dejavoo line: Z11 at $29.99/mo (essential countertop), QD4 at $32.99/mo (Android smart handheld with 58mm printer), and Z9 at $34.99/mo (wireless PIN pad with ultra-lasting battery).', act: 'quote' },
    { k: ['pax', 'a920'], a: 'The PAX A920 Pro leases at $54.99/mo — a high-end mobile smart terminal running PayDroid Android with a 5.5" display and a rapid 40 lines/sec thermal printer.', act: 'quote' },
    { k: ['audrey', 'joy', 'bundle'], a: 'Audrey & Joy bundles include the full kit — scanner, cash drawer, and receipt printer: Joy J14 at $44.99/mo, Audrey A5-II at $69.99/mo, and the enterprise Audrey A7 at $79.99/mo.', act: 'quote' },
    { k: ['mobile', 'handheld', 'wireless', 'portable'], a: 'For mobile selling: Clover Flex ($39.99/mo), Dejavoo Z9 ($34.99/mo), Dejavoo QD4 ($32.99/mo), or the PAX A920 Pro ($54.99/mo).', act: 'quote' },
    { k: ['website', 'seo', 'marketing', 'google', 'digital', 'online', 'plans'], a: 'Beyond payments, we build digital growth engines: Website Plans (Starter $99/mo, Growth $185/mo, Premium $249/mo) and Marketing & SEO Plans (Local Starter $285/mo, Growth $365/mo, Market Leader $399/mo).', act: 'plan' },
    { k: ['location', 'fleet', 'franchise', 'multiple', 'stores', 'scale'], a: 'Add terminals as you grow locations. Quote a single unit or a nationwide fleet and we build the bundle — select "2-5", "6-20", or "20+" locations in the Get a Quote form.', act: 'quote' },
    { k: ['own', 'buy', 'outright', 'purchase'], a: 'Our model is leasing-first: from $29.99/month with no large upfront purchase required to begin processing. Retail values run from $300 (Dejavoo Z11) up to $2,599.99 (Audrey A7 Bundle) if you are comparing outright costs.' },
    { k: ['return', 'cancel', 'swap', 'exchange'], a: 'Reach out through the Get a Quote form and our team will help you with a return or swap for your fleet.', act: 'quote' },
    { k: ['human', 'representative', 'call', 'talk', 'person', 'contact', 'phone', 'email'], a: 'The fastest route is the Get a Quote form — requesting a representative notifies our team instantly, and we reach out shortly with your custom bundle.', act: 'quote' },
    { k: ['terminal', 'hardware', 'recommend', 'which', 'best', 'catalog'], a: 'Quick guide — countertop: Clover Station Duo ($84.99/mo) or Clover Mini v3 ($49.99/mo); mobile: Clover Flex, Dejavoo Z9/QD4, PAX A920 Pro; full bundles: Joy J14, Audrey A5-II, Audrey A7. Browse the Hardware page for specs.', act: 'hardware' },
    { k: ['hi', 'hello', 'hey'], a: 'Hello! I can help with hardware recommendations, lease pricing ($29.99–$84.99/mo), fleet bundles, or our digital growth plans. What are you setting up?' },
    { k: ['thank', 'thanks', 'great', 'awesome'], a: 'Anytime. If you are ready, the Get a Quote form takes under a minute — our team will build your custom bundle and reach out shortly.', act: 'quote' }
  ];
  var conciergeBuilt = false, conciergeOpen = false, unread = false;

  function addMsg(who, text, act) {
    var box = $('#concierge-msgs');
    if (!box) return;
    var wrap = document.createElement('div');
    if (who === 'user') {
      wrap.className = 'flex justify-end fade-in';
      wrap.innerHTML = '<div class="max-w-[85%] rounded-2xl rounded-br-md bg-azora-red px-4 py-2.5 text-[13px] font-medium leading-relaxed text-white shadow-md">' + esc(text) + '</div>';
    } else {
      wrap.className = 'flex justify-start fade-in';
      wrap.innerHTML = '<div class="max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-[#162238] px-4 py-3 text-[13px] leading-relaxed text-slate-100 shadow-md">' + text +
        (act ? '<div class="mt-3">' + (act === 'plan'
          ? '<a href="get-a-quote.html?type=plan" class="inline-block rounded-xl bg-azora-red px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-chip hover:bg-blue-600 transition-colors">Request a Quote</a>'
          : act === 'hardware'
          ? '<a href="hardware.html" class="inline-block rounded-xl bg-white/10 border border-white/20 px-3.5 py-1.5 text-[11.5px] font-bold text-white hover:bg-azora-red hover:border-azora-red transition-colors">View Hardware</a>'
          : '<a href="get-a-quote.html?type=hardware" class="inline-block rounded-xl bg-azora-red px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-chip hover:bg-blue-600 transition-colors">Get a Quote</a>') + '</div>' : '') + '</div>';
    }
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function showCustomLeadForm(originalRequest) {
    var box = $('#concierge-msgs');
    if (!box) return;
    var wrap = document.createElement('div');
    wrap.className = 'flex justify-start fade-in';
    wrap.innerHTML =
      '<div class="w-full max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-[#162238] px-4 py-3.5 text-[13px] text-slate-100 shadow-md">' +
        '<div class="font-semibold leading-relaxed text-white">I’d be happy to help with that. Your request is outside the information currently available on our website, so I’ll send it directly to our team.</div>' +
        '<div class="mt-1.5 text-[12px] leading-relaxed text-slate-300">Please share your contact details below. Our team will review your requirement and contact you directly.</div>' +
        '<form id="concierge-lead-form" class="mt-3 space-y-2.5">' +
          '<input name="name" required maxlength="120" class="w-full rounded-xl border border-white/15 bg-[#0B1320] px-3 py-2 text-[12.5px] text-white placeholder-slate-400 focus:border-azora-red focus:outline-none" placeholder="Full name" autocomplete="name" />' +
          '<input name="email" required maxlength="160" type="email" class="w-full rounded-xl border border-white/15 bg-[#0B1320] px-3 py-2 text-[12.5px] text-white placeholder-slate-400 focus:border-azora-red focus:outline-none" placeholder="Email address" autocomplete="email" />' +
          '<input name="phone" required maxlength="40" type="tel" class="w-full rounded-xl border border-white/15 bg-[#0B1320] px-3 py-2 text-[12.5px] text-white placeholder-slate-400 focus:border-azora-red focus:outline-none" placeholder="Phone number" autocomplete="tel" />' +
          '<textarea name="request" required maxlength="1200" rows="3" class="w-full rounded-xl border border-white/15 bg-[#0B1320] px-3 py-2 text-[12.5px] text-white placeholder-slate-400 focus:border-azora-red focus:outline-none resize-none" placeholder="What do you need?"></textarea>' +
          '<button type="submit" class="w-full rounded-xl bg-azora-red py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-blue-600 shadow-chip">Send Request</button>' +
          '<div class="text-[10px] leading-relaxed text-slate-400">We’ll use these details only to follow up on your request.</div>' +
        '</form>' +
      '</div>';
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
    var form = wrap.querySelector('#concierge-lead-form');
    var req = form.querySelector('[name=request]');
    req.value = originalRequest || '';
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      var name = String(form.querySelector('[name=name]').value || '').trim();
      var email = String(form.querySelector('[name=email]').value || '').trim();
      var phone = String(form.querySelector('[name=phone]').value || '').trim();
      var request = String(form.querySelector('[name=request]').value || '').trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (name.length < 2 || !emailOk || phone.length < 5 || request.length < 2) {
        addMsg('bot', 'Please enter your full name, a valid email address, phone number, and a short description of what you need.');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending…';
      var now = new Date();
      var ref = 'CHAT-' + String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      var data = {
        event_type: 'contact_request',
        ref: ref,
        business: 'Chatbot Custom Inquiry',
        contact: name,
        email: email,
        phone: phone,
        locations: 'Chatbot',
        message: request,
        items: []
      };
      try {
        localStorage.setItem('azora_last_chat_lead', JSON.stringify(data));
      } catch (err) {}
      var saved = false;
      try {
        if (window.AZStore && window.AZStore.configured()) {
          var result = await window.AZStore.saveLead(data);
          saved = !!(result && result.ok);
        }
      } catch (err) {}
      if (saved) {
        form.remove();
        addMsg('bot', 'Thank you. Your request has been saved. Our team will review it and contact you shortly.');
      } else {
        btn.disabled = false;
        btn.textContent = 'Send Request';
        addMsg('bot', 'We could not submit your request due to a temporary connection problem. Please try again.');
      }
    });
  }

  function cAsk(text) {
    if (!conciergeOpen) AZ.toggleConcierge();
    addMsg('user', text);
    var box = $('#concierge-msgs');
    var typing = document.createElement('div');
    typing.className = 'flex justify-start fade-in';
    typing.innerHTML = '<div class="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-[#162238] px-4 py-3 shadow-md"><span class="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400"></span><span class="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400"></span><span class="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400"></span></div>';
    box.appendChild(typing); box.scrollTop = box.scrollHeight;
    setTimeout(function () {
      typing.remove();
      var q = text.toLowerCase();
      var hit = KB.filter(function (e) { return e.k.some(function (k) { return q.indexOf(k) !== -1; }); })[0];
      if (hit) {
        addMsg('bot', hit.a, hit.act);
      } else {
        showCustomLeadForm(text);
      }
    }, 650 + Math.random() * 450);
  }

  function buildConcierge() {
    var root = $('#concierge-root');
    if (!root) return;
    if (conciergeBuilt) return;
    conciergeBuilt = true;
    root.innerHTML =
      '<button id="concierge-btn" aria-label="Open AI concierge" onclick="AZ.toggleConcierge()" class="fixed bottom-6 right-6 z-[55] grid h-14 w-14 place-items-center rounded-2xl bg-azora-red text-white shadow-lift transition-all duration-300 hover:-translate-y-1 hover:bg-blue-600 hover:shadow-chip border border-white/15 cursor-pointer">' +
        '<span id="concierge-dot" class="absolute -right-1 -top-1 hidden h-3.5 w-3.5 rounded-full border-2 border-[#121B2C] bg-azora-red animate-pulse"></span>' +
        '<span id="concierge-ic-open">' + I('chat', 'h-6 w-6') + '</span>' +
        '<span id="concierge-ic-close" class="hidden">' + I('x', 'h-6 w-6') + '</span>' +
      '</button>' +
      '<div id="concierge-panel" class="fixed bottom-24 right-4 z-[55] hidden w-[calc(100vw-2rem)] max-w-[380px] origin-bottom-right overflow-hidden rounded-2xl border border-white/15 bg-[#121B2C] shadow-2xl backdrop-blur-xl sm:right-6 text-white">' +
        '<div class="flex items-center gap-3 bg-[#0E1726] px-5 py-4 text-white border-b border-white/10">' +
          '<span class="relative grid h-10 w-10 place-items-center rounded-xl bg-azora-red/15 border border-azora-red/25 text-azora-red">' + I('spark', 'h-5 w-5') +
            '<span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0E1726] bg-emerald-400"></span></span>' +
          '<div class="flex-1"><div class="font-heading text-sm font-extrabold text-white">Azora Concierge</div>' +
            '<div class="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Online · answers instantly</div></div>' +
          '<button aria-label="Close concierge" onclick="AZ.toggleConcierge()" class="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white">' + I('x') + '</button>' +
        '</div>' +
        '<div id="concierge-msgs" class="no-scrollbar h-[320px] space-y-3 overflow-y-auto bg-[#0B1320] p-4 text-[13px]"></div>' +
        '<div class="border-t border-white/10 bg-[#0E1726] p-3">' +
          '<div class="mb-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">' +
            '<button class="chip shrink-0 !py-1.5 !px-3 !text-[11px] !border-white/15 !bg-white/5 !text-slate-200 hover:!bg-azora-red hover:!text-white hover:!border-azora-red transition-all" onclick="AZ.cAsk(\'How much does leasing cost?\')">Lease pricing</button>' +
            '<button class="chip shrink-0 !py-1.5 !px-3 !text-[11px] !border-white/15 !bg-white/5 !text-slate-200 hover:!bg-azora-red hover:!text-white hover:!border-azora-red transition-all" onclick="AZ.cAsk(\'Which terminal is best for mobile selling?\')">Mobile terminals</button>' +
            '<button class="chip shrink-0 !py-1.5 !px-3 !text-[11px] !border-white/15 !bg-white/5 !text-slate-200 hover:!bg-azora-red hover:!text-white hover:!border-azora-red transition-all" onclick="AZ.cAsk(\'Tell me about website and SEO plans\')">Digital growth</button>' +
          '</div>' +
          '<form id="concierge-form" class="flex items-center gap-2">' +
            '<input id="concierge-input" class="w-full rounded-xl border border-white/15 bg-[#162238] px-3.5 py-2.5 text-[13px] text-white placeholder-slate-400 focus:outline-none focus:border-azora-red focus:ring-1 focus:ring-azora-red" placeholder="Ask about hardware or leasing…" autocomplete="off" />' +
            '<button type="submit" aria-label="Send" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-azora-red text-white transition-colors hover:bg-blue-600 shadow-chip">' + I('send') + '</button>' +
          '</form>' +
        '</div>' +
      '</div>';
    var cForm = $('#concierge-form');
    if (cForm) {
      cForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('#concierge-input');
        if (!inp) return;
        var v = inp.value.trim();
        if (!v) return;
        inp.value = '';
        cAsk(v);
      });
    }
    addMsg('bot', 'Welcome to Azora Solutions. I can answer questions about our POS hardware and leasing. How can I help?');
    setTimeout(function () { if (!conciergeOpen) { var d = $('#concierge-dot'); if (d) { d.classList.remove('hidden'); unread = true; } } }, 2500);
  }

  AZ.cAsk = cAsk;
  AZ.toggleConcierge = function () {
    buildConcierge();
    conciergeOpen = !conciergeOpen;
    $('#concierge-panel').classList.toggle('hidden', !conciergeOpen);
    $('#concierge-ic-open').classList.toggle('hidden', conciergeOpen);
    $('#concierge-ic-close').classList.toggle('hidden', !conciergeOpen);
    if (conciergeOpen) {
      $('#concierge-panel').classList.add('sheet-up');
      if (unread) { $('#concierge-dot').classList.add('hidden'); unread = false; }
      setTimeout(function () { var i = $('#concierge-input'); if (i) i.focus(); }, 150);
    }
  };

  buildConcierge();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildConcierge);
  }
  window.addEventListener('load', buildConcierge);
})();

