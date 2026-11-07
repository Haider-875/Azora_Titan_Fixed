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

  /* ---------- concierge chat (removed) ---------- */
  function buildConcierge() {
    var root = $('#concierge-root');
    if (root) root.innerHTML = '';
  }
  AZ.cAsk = function () {};
  AZ.toggleConcierge = function () {};
})();

