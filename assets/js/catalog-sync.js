/* AZORA public hardware catalog sync — dark showroom theme */
(function () {
  'use strict';
  var cfg = window.AZ_SUPABASE_CONFIG || {};
  if (!window.supabase || !cfg.url || !cfg.key) return;
  var sb = window.supabase.createClient(cfg.url, cfg.key);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function img(p) {
    var map = window.AZ_IMG || {};
    var rel = (p.image || '').replace(/^assets\/img\//, '');
    return map[rel] || p.image || '';
  }

  function renderCard(p) {
    var brand = esc(p.brand || 'clover');
    var isStock = p.stock === 'in_stock';
    var stockLabel = isStock ? 'In Stock' : 'Limited';
    var stockCls = isStock
      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
      : 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    var dotCls = isStock ? 'bg-emerald-400' : 'bg-amber-400';

    return '<article class="rv in card-hover group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#121B2C] to-[#162238] border border-white/10" data-brand="' + brand + '" data-id="' + esc(p.id) + '">' +
      '<button onclick="AZ.openProduct(\'' + esc(p.id).replace(/'/g, "\\'") + '\')" class="relative block aspect-[4/3] overflow-hidden p-7 text-left w-full bg-[#0B1320]/60">' +
        '<div class="absolute inset-x-3.5 top-3.5 z-10 flex items-center justify-between gap-2 pointer-events-none">' +
          '<span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] ' + stockCls + ' shadow-card backdrop-blur"><span class="h-1.5 w-1.5 rounded-full ' + dotCls + ' animate-pulse"></span>' + stockLabel + '</span>' +
          '<span class="truncate rounded-full bg-white/10 border border-white/15 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur text-right">' + esc(p.category || 'POS Terminal') + '</span>' +
        '</div>' +
        '<img src="' + esc(img(p)) + '" alt="' + esc(p.name) + '" loading="lazy" class="card-img h-full w-full object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.6)]" />' +
      '</button>' +
      '<div class="flex flex-1 flex-col p-5 pt-4">' +
        '<button onclick="AZ.openProduct(\'' + esc(p.id).replace(/'/g, "\\'") + '\')" class="text-left">' +
          '<h3 class="font-heading text-lg font-bold tracking-tight text-white transition-colors group-hover:text-azora-red">' + esc(p.name) + '</h3>' +
        '</button>' +
        '<p class="mt-1 text-[13.5px] leading-snug text-slate-300 font-medium">' + esc(p.tagline || '') + '</p>' +
        '<div class="mt-4 flex items-end justify-between border-t border-white/10 pt-4">' +
          '<div>' +
            '<div class="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">Lease</div>' +
            '<div class="font-heading text-[1.4rem] font-extrabold leading-tight text-azora-red">' + esc(p.lease) + '<span class="text-[13px] font-bold text-slate-300">/mo</span></div>' +
          '</div>' +
          '<div class="text-right">' +
            '<div class="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">Retail Value</div>' +
            '<div class="font-mono text-[13px] font-semibold text-slate-400 line-through decoration-slate-500">' + esc(p.retail) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mt-4 grid grid-cols-2 gap-2">' +
          '<button onclick="AZ.openProduct(\'' + esc(p.id).replace(/'/g, "\\'") + '\')" class="rounded-xl border border-white/20 bg-white/10 py-2.5 text-[12.5px] font-bold text-white transition-all hover:border-azora-red hover:bg-azora-red/20">View Details</button>' +
          '<a href="get-a-quote.html?hardware=' + encodeURIComponent(p.id) + '" class="rounded-xl bg-azora-red py-2.5 text-center text-[12.5px] font-bold text-white transition-all hover:bg-blue-600 hover:shadow-chip shadow-md">Request Quote</a>' +
        '</div>' +
      '</div></article>';
  }

  async function sync() {
    if (document.body.getAttribute('data-page') !== 'hardware') return;
    var grid = document.getElementById('catalog-grid');
    if (!grid) return;
    try {
      var r = await sb.from('azora_hardware_cards').select('*').eq('active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      if (r.error || !r.data || !r.data.length) return;
      
      // Update global products data array if available
      if (window.AZ_DATA) {
        window.AZ_DATA.products = r.data;
      }

      grid.innerHTML = r.data.map(renderCard).join('');

      // Re-trigger current filter state
      var q = new URLSearchParams(location.search).get('brand') || 'all';
      if (window.AZ && typeof window.AZ.filterBrand === 'function') {
        var btn = document.querySelector('#brand-filters .chip[data-brand="' + q + '"]') || document.querySelector('#brand-filters .chip[data-brand="all"]');
        window.AZ.filterBrand(q, btn);
      }
    } catch (e) {
      console.warn('Catalog sync error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  } else {
    sync();
  }
})();
