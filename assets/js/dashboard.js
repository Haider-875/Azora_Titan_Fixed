/* ============================================================================
   AZORA SOLUTIONS — ADMIN COMMAND CENTER (dashboard.js)
   - Realtime Supabase live lead alerts with audio chime and browser push notifications
   - Unread lead notification bell & tracking
   - Catalog management, report generation, role-based access controls
   ============================================================================ */
(function(){
'use strict';

var cfg = window.AZ_SUPABASE_CONFIG || {};
var ready = !!(window.supabase && cfg.url && cfg.key);
var sb = ready ? window.supabase.createClient(cfg.url, cfg.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 10 } }
}) : null;

var rows = [], filtered = [], cards = [], editing = null, currentRole = 'admin', currentPermissions = {}, selectedLeadId = null;
var realtimeChannel = null;

var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };

function imgSrc(v){
  var x = String(v || '');
  if (window.AZ_IMG) {
    var k = x.replace(/^assets\/img\//, '');
    if (window.AZ_IMG[k]) return window.AZ_IMG[k];
  }
  return x;
}

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtDate(v){
  if (!v) return '—';
  var d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtRelative(v){
  if (!v) return 'just now';
  var diff = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function initials(v){
  return String(v || '?').trim().split(/\s+/).slice(0, 2).map(function(x){ return x[0] || ''; }).join('').toUpperCase() || '?';
}

function labelEvent(v){
  if (v === 'hardware_quote') return 'Hardware Quote';
  if (v === 'website_quote') return 'Website Quote';
  if (v === 'seo_quote') return 'Local SEO Quote';
  if (v === 'marketing_quote') return 'Digital Marketing Quote';
  if (v === 'service_quote') return 'Service Enquiry';
  if (v === 'plan_quote') return 'Growth Plan Quote';
  if (v === 'contact_request') return 'Chatbot / Contact Lead';
  if (v === 'quote_submitted') return 'Quote Request';
  return String(v || 'Enquiry').replace(/_/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}

function toast(text, type){
  var el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.className = 'toast ' + (type || 'ok');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(function(){ el.classList.add('hide'); }, 4000);
  el.classList.remove('hide');
}

function status(text, type){
  var el = $('#global-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'status ' + (type || 'info');
  el.classList.remove('hidden');
}

function hideStatus(){
  var el = $('#global-status');
  if (el) el.classList.add('hidden');
}

/* ---------- Synthetic Web Audio Chime (Zero External Files Needed) ---------- */
function playLeadChime(){
  try {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    var ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    var t = ctx.currentTime;
    // Tone 1 (D5: 587.33 Hz)
    var osc1 = ctx.createOscillator();
    var gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.18, t + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.33);

    // Tone 2 (A5: 880.00 Hz)
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t + 0.12);
    gain2.gain.setValueAtTime(0, t + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, t + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.66);
  } catch (e) {
    // Audio playback not permitted by user interaction policy
  }
}

/* ---------- Browser / Desktop Notifications ---------- */
function requestPushPermission(){
  if (!('Notification' in window)) {
    toast('Browser notifications are not supported on this browser.', 'err');
    return;
  }
  Notification.requestPermission().then(function(perm){
    updatePushBtnUI();
    if (perm === 'granted') {
      toast('Browser push notifications enabled!', 'ok');
    } else {
      toast('Notification permission: ' + perm, 'err');
    }
  });
}

function updatePushBtnUI(){
  var btn = $('#enable-notif-btn');
  if (!btn) return;
  if (!('Notification' in window)) {
    btn.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    btn.textContent = '🔔 Notifications ON';
    btn.classList.add('active');
  } else if (Notification.permission === 'denied') {
    btn.textContent = '🔕 Blocked';
    btn.disabled = true;
  } else {
    btn.textContent = '🔔 Enable Push';
    btn.classList.remove('active');
  }
}

function sendDesktopNotification(lead){
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    var name = lead.contact || lead.business || 'Prospect';
    var ev = labelEvent(lead.event_type);
    var notif = new Notification('Azora Solutions — New Lead Received', {
      body: name + ' · ' + ev + (lead.business ? ' (' + lead.business + ')' : ''),
      icon: '/assets/img/icon.png',
      tag: 'azora-lead-' + lead.id,
      requireInteraction: false
    });
    notif.onclick = function(){
      window.focus();
      openLead(lead.id);
    };
  } catch (e) {}
}

/* ---------- Supabase Realtime Subscription ---------- */
function setupRealtime(){
  if (!sb || realtimeChannel) return;
  try {
    realtimeChannel = sb.channel('azora-leads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'azora_leads' }, function(payload){
        handleIncomingLead(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'azora_leads' }, function(payload){
        handleLeadUpdate(payload.new);
      })
      .subscribe(function(st){
        var el = $('#realtime-status');
        if (!el) return;
        if (st === 'SUBSCRIBED') {
          el.textContent = '● Realtime Live';
          el.className = 'rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700';
        } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
          el.textContent = '○ Reconnecting';
          el.className = 'rounded-full bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700';
        }
      });
  } catch (err) {
    console.warn('Realtime channel error:', err);
  }
}

function handleIncomingLead(lead){
  if (!lead) return;
  var exists = rows.some(function(r){ return String(r.id) === String(lead.id); });
  if (exists) return;

  // Insert at top of list
  rows.unshift(lead);

  // Sound chime
  playLeadChime();

  // Desktop push notification
  sendDesktopNotification(lead);

  // Toast
  var name = lead.contact || lead.business || 'Prospect';
  toast('🔔 NEW LEAD: ' + name + ' (' + labelEvent(lead.event_type) + ')', 'ok');

  // Update UI components
  renderStats();
  applyFilters();
  renderReports();
  renderNotifications();
  $('#last-updated').textContent = 'Live alert at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function handleLeadUpdate(lead){
  if (!lead) return;
  var idx = rows.findIndex(function(r){ return String(r.id) === String(lead.id); });
  if (idx !== -1) {
    rows[idx] = Object.assign({}, rows[idx], lead);
    applyFilters();
    renderNotifications();
  }
}

/* ---------- Notification Bell & Unread Tracking ---------- */
function renderNotifications(){
  var unreadList = rows.filter(function(r){ return !r.read; });
  var badge = $('#notif-badge');
  if (badge) {
    if (unreadList.length > 0) {
      badge.textContent = unreadList.length > 99 ? '99+' : unreadList.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  var listEl = $('#notif-list');
  if (!listEl) return;
  if (!unreadList.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:24px 10px;font-size:12px;color:var(--muted);">No unread leads. All caught up!</div>';
    return;
  }

  listEl.innerHTML = unreadList.slice(0, 10).map(function(r){
    var name = r.contact || r.business || 'Customer';
    var items = Array.isArray(r.items) ? r.items : [];
    var itemSummary = items.length ? (typeof items[0] === 'object' ? items[0].name : items[0]) : (r.message || 'Quote request');
    return '<div class="notif-item" data-notif-lead="' + esc(r.id) + '" style="display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border-radius:10px;background:var(--soft);cursor:pointer;transition:.15s ease;">' +
      '<div style="width:32px;height:32px;border-radius:9px;background:#2469EB;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:900;flex-shrink:0;">' + esc(initials(name)) + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<b style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(name) + '</b>' +
          '<small style="font-size:9px;color:var(--muted);">' + esc(fmtRelative(r.created_at)) + '</small>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(labelEvent(r.event_type)) + ' · ' + esc(itemSummary) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  listEl.querySelectorAll('[data-notif-lead]').forEach(function(el){
    el.onclick = function(){
      var id = el.dataset.notifLead;
      $('#notif-dropdown').classList.add('hidden');
      openLead(id);
    };
  });
}

async function markAllRead(){
  var unreadIds = rows.filter(function(r){ return !r.read; }).map(function(r){ return r.id; });
  if (!unreadIds.length) {
    toast('No unread leads.', 'ok');
    return;
  }
  rows.forEach(function(r){ r.read = true; r.read_at = new Date().toISOString(); });
  renderNotifications();
  renderTable();
  if (sb) {
    await sb.from('azora_leads').update({ read: true, read_at: new Date().toISOString() }).in('id', unreadIds);
  }
  toast('All leads marked as read.', 'ok');
}

async function markLeadRead(id, isRead){
  var r = rows.find(function(x){ return String(x.id) === String(id); });
  if (!r) return;
  r.read = !!isRead;
  r.read_at = isRead ? new Date().toISOString() : null;
  renderNotifications();
  renderTable();
  if (sb) {
    await sb.from('azora_leads').update({ read: r.read, read_at: r.read_at }).eq('id', id);
  }
}

async function user(){
  if (!sb) return null;
  var r = await sb.auth.getUser();
  if (r.error) throw r.error;
  return r.data.user || null;
}

function showLogin(){
  $('#login').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function hasPerm(p){
  return currentRole === 'admin' || !!currentPermissions[p];
}

function applyRoleUI(){
  var usersNav = document.querySelector('.nav button[data-section="users"]');
  if (usersNav) usersNav.style.display = hasPerm('view_users') ? '' : 'none';
  var newUser = $('#new-user');
  if (newUser) newUser.style.display = hasPerm('manage_users') ? '' : 'none';
  var newCard = $('#new-card'), importCard = $('#import-current-2');
  if (newCard) newCard.style.display = hasPerm('add_hardware') ? '' : 'none';
  if (importCard) importCard.style.display = hasPerm('add_hardware') ? '' : 'none';
  var exportLeads = $('#export-leads-2'), exportReport = $('#export-report');
  if (exportLeads) exportLeads.style.display = hasPerm('export_reports') ? '' : 'none';
  if (exportReport) exportReport.style.display = hasPerm('export_reports') ? '' : 'none';
  var reportNav = document.querySelector('.nav button[data-section="reports"]');
  if (reportNav) reportNav.style.display = hasPerm('view_reports') ? '' : 'none';
  var leadNav = document.querySelector('.nav button[data-section="leads"]');
  if (leadNav) leadNav.style.display = hasPerm('view_leads') ? '' : 'none';
  var hardwareNav = document.querySelector('.nav button[data-section="hardware"]');
  if (hardwareNav) hardwareNav.style.display = hasPerm('view_hardware') ? '' : 'none';
}

function showApp(u){
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  var side = $('#side-email');
  if (side) side.textContent = u.email || '';
}

function theme(){
  var dark = localStorage.getItem('azora_theme') === 'dark';
  document.body.classList.toggle('dark', dark);
  $('#theme-toggle').textContent = dark ? '☀ Light' : '☾ Dark';
}

function renderStats(){
  var quotes = rows.filter(function(r){ return r.event_type && r.event_type.indexOf('quote') !== -1; });
  var now = new Date(), today = now.toDateString(), start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  $('#stat-total').textContent = rows.length;
  $('#stat-quotes').textContent = quotes.length;
  $('#stat-today').textContent = rows.filter(function(r){ return new Date(r.created_at).toDateString() === today; }).length;
  $('#stat-week').textContent = rows.filter(function(r){ return new Date(r.created_at) >= start; }).length;

  var months = {};
  rows.forEach(function(r){
    var d = new Date(r.created_at);
    var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    months[k] = (months[k] || 0) + 1;
  });

  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  var counts = days.map(function(d){
    var e = new Date(d);
    e.setDate(e.getDate() + 1);
    return rows.filter(function(r){ var x = new Date(r.created_at); return x >= d && x < e; }).length;
  });
  var max = Math.max.apply(Math, counts.concat([1]));

  $('#chart').innerHTML = days.map(function(d, i){
    var h = Math.max(5, Math.round(counts[i] / max * 150));
    return '<div class="bar-col"><b>' + counts[i] + '</b><i style="height:' + h + 'px"></i><span>' + esc(d.toLocaleDateString([], { weekday: 'short' })) + '</span></div>';
  }).join('');

  var keys = Object.keys(months).sort().slice(-6);
  $('#monthly-mini').innerHTML = keys.length ? keys.map(function(k){
    return '<div><span>' + k + '</span><b>' + months[k] + '</b></div>';
  }).join('') : '<div class="empty-mini">No monthly activity yet</div>';
}

function applyFilters(){
  var q = ($('#search').value || '').toLowerCase().trim();
  var ev = $('#event-filter').value;
  var date = $('#date-filter').value;

  filtered = rows.filter(function(r){
    if (ev !== 'all' && r.event_type !== ev) return false;
    if (date && new Date(r.created_at).toISOString().slice(0, 10) !== date) return false;
    return !q || [r.business, r.contact, r.email, r.phone, r.ref, r.message, r.locations, JSON.stringify(r.items || [])].join(' ').toLowerCase().indexOf(q) >= 0;
  }).sort(function(a, b){
    return new Date(b.created_at) - new Date(a.created_at);
  });

  renderTable();
}

function formatItemsCell(items){
  if (!items || !items.length) return 'General quote';
  if (Array.isArray(items)) {
    return items.map(function(x){
      if (typeof x === 'string') return x;
      return x.name || x.id || JSON.stringify(x);
    }).join(', ');
  }
  return String(items);
}

function renderTable(){
  var body = $('#lead-body');
  $('#visible-count').textContent = filtered.length;
  var body2 = $('#lead-body-2');

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No matching leads</td></tr>';
    if (body2) body2.innerHTML = body.innerHTML;
    return;
  }

  var html = filtered.map(function(r){
    var name = r.contact || r.business || 'Unknown';
    var isUnread = !r.read;
    var unreadDot = isUnread ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2469EB;margin-right:6px;" title="Unread Lead"></span>' : '';
    var emailStatusPill = r.email_status === 'sent' 
      ? '<span style="color:#059669;font-size:9px;font-weight:800;" title="Email sent to sales@azorasolution.com">✉ Sent</span>'
      : (r.email_status === 'failed' ? '<span style="color:#dc2626;font-size:9px;font-weight:800;" title="Email delivery error">✉ Failed</span>' : '');

    return '<tr style="' + (isUnread ? 'background:rgba(36,105,235,0.03);' : '') + '">' +
      '<td>' +
        '<div class="customer">' +
          '<span>' + esc(initials(name)) + '</span>' +
          '<div>' +
            '<b>' + unreadDot + esc(name) + '</b>' +
            '<small>' + esc(r.business || '') + '</small>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div>' + esc(r.email || '—') + '</div>' +
        '<small>' + esc(r.phone || '') + '</small>' +
      '</td>' +
      '<td>' +
        '<b>' + esc(formatItemsCell(r.items)) + '</b>' +
        '<small>' + esc(r.locations ? r.locations + ' location(s)' : '') + '</small>' +
      '</td>' +
      '<td>' +
        '<em>' + esc(labelEvent(r.event_type)) + '</em>' +
        '<div style="margin-top:2px;">' + emailStatusPill + '</div>' +
      '</td>' +
      '<td>' +
        '<b>' + esc(fmtDate(r.created_at)) + '</b>' +
        '<small>' + esc(r.ref || '') + '</small>' +
      '</td>' +
      '<td>' +
        '<div class="flex gap-2">' +
          '<button class="small-btn" data-view="' + esc(r.id) + '">View</button>' +
          '<button class="small-btn danger" data-delete-lead="' + esc(r.id) + '">Delete</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  body.innerHTML = html;
  if (body2) body2.innerHTML = html;

  [body, body2].filter(Boolean).forEach(function(t){
    t.querySelectorAll('[data-view]').forEach(function(b){
      b.onclick = function(){ openLead(b.dataset.view); };
    });
    t.querySelectorAll('[data-delete-lead]').forEach(function(b){
      b.onclick = function(){ deleteLead(b.dataset.deleteLead); };
    });
  });
}

async function deleteLead(id){
  if (!hasPerm('delete_leads')) {
    toast('You do not have permission to delete leads.', 'err');
    return;
  }
  if (!sb) {
    toast('Supabase is not configured.', 'err');
    return;
  }
  var r = rows.find(function(x){ return String(x.id) === String(id); });
  if (!r) return;
  var name = r.contact || r.business || 'this lead';
  if (!confirm('Delete ' + name + '? This cannot be undone.')) return;

  var q = await sb.from('azora_leads').delete().eq('id', id);
  if (q.error) {
    toast('Could not delete lead: ' + q.error.message, 'err');
    return;
  }
  rows = rows.filter(function(x){ return String(x.id) !== String(id); });
  selectedLeadId = null;
  $('#lead-drawer').classList.remove('open');
  renderStats();
  applyFilters();
  renderReports();
  renderNotifications();
  toast('Lead deleted successfully.', 'ok');
}

function openLead(id){
  selectedLeadId = id;
  var r = rows.find(function(x){ return String(x.id) === String(id); });
  if (!r) return;

  // Mark as read automatically when opened
  if (!r.read) {
    markLeadRead(id, true);
  }

  var name = r.contact || r.business || 'Customer';
  var event = labelEvent(r.event_type);
  var email = r.email || '—';
  var phone = r.phone || '—';
  var location = r.locations ? r.locations + ' location(s)' : '1 location';
  var date = fmtDate(r.created_at);
  var message = r.message || 'No message provided.';

  var emailStatusPill = r.email_status === 'sent'
    ? '<span class="status-pill active">✓ Sent to sales@azorasolution.com (' + fmtDate(r.email_sent_at) + ')</span>'
    : (r.email_status === 'failed'
      ? '<span class="status-pill inactive">⚠️ Email Delivery Failed (' + esc(r.email_error || 'Error') + ')</span>'
      : '<span class="status-pill" style="background:#fef3c7;color:#b45309;">⏳ Email Pending</span>');

  var itemsHtml = '';
  if (Array.isArray(r.items) && r.items.length) {
    itemsHtml = '<div style="display:flex;flex-direction:column;gap:6px;">' +
      r.items.map(function(item){
        if (typeof item === 'object') {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--panel);border:1px solid var(--line);border-radius:10px;">' +
            '<div><b>' + esc(item.name || item.id) + '</b><small style="display:block;color:var(--muted);">' + esc(item.category || '') + '</small></div>' +
            (item.lease ? '<strong style="color:var(--brand);font-size:13px;">' + esc(item.lease) + '</strong>' : '') +
          '</div>';
        }
        return '<div style="padding:6px 10px;background:var(--panel);border:1px solid var(--line);border-radius:8px;font-size:12px;font-weight:700;">' + esc(item) + '</div>';
      }).join('') +
    '</div>';
  } else {
    itemsHtml = '<div style="padding:10px;color:var(--muted);font-size:12px;">' + esc(formatItemsCell(r.items)) + '</div>';
  }

  $('#lead-drawer-title').textContent = name;
  var st = $('#lead-drawer-status');
  if (st) st.textContent = event;
  var ref = $('#lead-drawer-ref');
  if (ref) ref.textContent = r.ref || 'No reference';

  $('#drawer-body').innerHTML =
    '<div class="lead-profile">' +
      '<div class="lead-avatar">' + esc(initials(name)) + '</div>' +
      '<div style="flex:1;">' +
        '<div class="lead-profile-name">' + esc(name) + '</div>' +
        '<div class="lead-profile-sub">' + esc(r.business || 'Individual customer') + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        (r.phone ? '<a href="tel:' + esc(r.phone) + '" class="small-btn" style="text-decoration:none;">📞 Call</a>' : '') +
        (r.email ? '<a href="mailto:' + esc(r.email) + '" class="small-btn primary" style="text-decoration:none;">✉ Email</a>' : '') +
      '</div>' +
    '</div>' +

    '<div class="lead-section-title">Notification Status</div>' +
    '<div style="padding:12px;background:var(--soft);border:1px solid var(--line);border-radius:12px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div>' + emailStatusPill + '</div>' +
      '<button class="small-btn" id="toggle-read-btn">' + (r.read ? 'Mark as Unread' : 'Mark as Read') + '</button>' +
    '</div>' +

    '<div class="lead-section-title">Contact Information</div>' +
    '<div class="lead-info-grid">' +
      infoCard('Email', email) +
      infoCard('Phone', phone) +
      infoCard('Locations', location) +
      infoCard('Submitted', date) +
    '</div>' +

    '<div class="lead-section-title">Requested Items & Services</div>' +
    '<div class="lead-request">' + itemsHtml + '</div>' +

    '<div class="lead-section-title">Customer Message</div>' +
    '<div class="lead-message">' + esc(message) + '</div>' +

    (r.page_url ? '<div style="margin-top:16px;font-size:10px;color:var(--muted);word-break:break-all;"><strong>Source:</strong> ' + esc(r.page_url) + '</div>' : '');

  var toggleBtn = $('#toggle-read-btn');
  if (toggleBtn) {
    toggleBtn.onclick = function(){
      markLeadRead(id, !r.read);
      toggleBtn.textContent = r.read ? 'Mark as Unread' : 'Mark as Read';
    };
  }

  $('#lead-drawer').classList.add('open');
}

function infoCard(label, value){
  return '<div class="lead-info"><div class="lead-info-label">' + esc(label) + '</div><div class="lead-info-value">' + esc(value) + '</div></div>';
}

function renderReports(){
  if (!hasPerm('view_reports')) return;
  var val = $('#report-month').value;
  if (!val) {
    var n = new Date();
    val = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
    $('#report-month').value = val;
  }
  var parts = val.split('-'), y = +parts[0], m = +parts[1] - 1;
  var rs = rows.filter(function(r){
    var d = new Date(r.created_at);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  $('#report-total').textContent = rs.length;
  $('#report-quotes').textContent = rs.filter(function(r){ return r.event_type && r.event_type.indexOf('quote') !== -1; }).length;
  $('#report-days').textContent = new Set(rs.map(function(r){ return new Date(r.created_at).toISOString().slice(0, 10); })).size;

  var byDay = {};
  rs.forEach(function(r){
    var d = new Date(r.created_at).getDate();
    byDay[d] = (byDay[d] || 0) + 1;
  });
  var days = new Date(y, m + 1, 0).getDate();
  var max = Math.max.apply(Math, Object.values(byDay).concat([1]));

  $('#month-chart').innerHTML = Array.from({ length: days }, function(_, i){
    var c = byDay[i + 1] || 0;
    var h = c ? Math.max(4, Math.round(c / max * 130)) : 3;
    return '<div class="month-bar"><span>' + c + '</span><i style="height:' + h + 'px"></i><small>' + String(i + 1) + '</small></div>';
  }).join('');
}

async function loadLeads(){
  if (!sb || !hasPerm('view_leads')) return;
  var r = await sb.from('azora_leads').select('*').order('created_at', { ascending: false }).limit(2000);
  if (r.error) {
    status('Leads query failed: ' + r.error.message, 'err');
    return;
  }
  rows = r.data || [];
  renderStats();
  applyFilters();
  renderReports();
  renderNotifications();
  $('#last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (!rows.length) status('No leads are currently visible. Submit a test quote from the live website to verify the connection.', 'info');
  else hideStatus();
}

async function loadCards(){
  if (!sb || !hasPerm('view_hardware')) return;
  var r = await sb.from('azora_hardware_cards').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  if (r.error) {
    cards = [];
    $('#hardware-status').innerHTML = '<div class="setup-box">Hardware manager is not connected yet. Run <b>supabase/catalog.sql</b> once in Supabase SQL Editor.</div>';
    return;
  }
  cards = r.data || [];
  if (!cards.length && currentProducts().length) {
    var ps = currentProducts();
    var payload = ps.map(function(p, i){
      return {
        id: p.id,
        brand: p.brand,
        name: p.name,
        category: p.category,
        lease: p.lease,
        retail: p.retail,
        tagline: p.tagline,
        image: p.image,
        stock: p.stock || 'in_stock',
        specs: p.specs || [],
        features: p.features || [],
        active: true,
        sort_order: i
      };
    });
    var seed = await sb.from('azora_hardware_cards').upsert(payload, { onConflict: 'id' });
    if (!seed.error) {
      r = await sb.from('azora_hardware_cards').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
      cards = r.data || [];
    }
  }
  renderCards();
}

function renderCards(){
  var wrap = $('#cards-grid');
  if (!cards.length) {
    wrap.innerHTML = '<div class="empty-card"><div class="empty-icon">＋</div><h3>No hardware cards yet</h3><p>Import the 10 cards already on your website, then edit them here.</p><button class="primary-btn" id="import-cards-empty">Import current website cards</button></div>';
    $('#import-cards-empty').onclick = importCurrent;
    return;
  }
  wrap.innerHTML = cards.map(function(p){
    return '<article class="product-card">' +
      '<div class="product-image"><img src="' + esc(p.image) + '" onerror="this.style.opacity=.15"/><span class="stock ' + (p.active ? 'on' : 'off') + '">' + (p.active ? 'Live' : 'Hidden') + '</span></div>' +
      '<div class="product-body">' +
        '<div class="product-cat">' + esc(p.category) + '</div>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p>' + esc(p.tagline || '') + '</p>' +
        '<div class="product-price"><strong>' + esc(p.lease) + '</strong><span>' + esc(p.brand) + '</span></div>' +
        '<div class="product-actions">' +
          '<button class="small-btn" data-edit="' + esc(p.id) + '">Edit</button>' +
          '<button class="small-btn" data-toggle="' + esc(p.id) + '">' + (p.active ? 'Hide' : 'Publish') + '</button>' +
          '<button class="small-btn danger" data-delete="' + esc(p.id) + '">Delete</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  wrap.querySelectorAll('[data-edit]').forEach(function(b){
    b.onclick = function(){ editCard(b.dataset.edit); };
  });
  wrap.querySelectorAll('[data-toggle]').forEach(function(b){
    b.onclick = function(){ toggleCard(b.dataset.toggle); };
  });
  wrap.querySelectorAll('[data-delete]').forEach(function(b){
    b.onclick = function(){ deleteCard(b.dataset.delete); };
  });
}

function currentProducts(){
  return (window.AZ_DATA && window.AZ_DATA.products) || [];
}

async function importCurrent(){
  if (currentRole === 'viewer') {
    toast('Viewer access is read-only.', 'err');
    return;
  }
  var ps = currentProducts();
  if (!ps.length) {
    toast('Could not find the current website product list.', 'err');
    return;
  }
  var payload = ps.map(function(p, i){
    return {
      id: p.id,
      brand: p.brand,
      name: p.name,
      category: p.category,
      lease: p.lease,
      retail: p.retail,
      tagline: p.tagline,
      image: p.image,
      stock: p.stock || 'in_stock',
      specs: p.specs || [],
      features: p.features || [],
      active: true,
      sort_order: i
    };
  });
  var r = await sb.from('azora_hardware_cards').upsert(payload, { onConflict: 'id' });
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  toast(payload.length + ' current hardware cards imported.', 'ok');
  loadCards();
}

function openCard(p){
  editing = p || null;
  $('#card-modal-title').textContent = p ? 'Edit hardware card' : 'Add hardware card';
  $('#card-form').reset();
  if (p) {
    ['id', 'brand', 'name', 'category', 'lease', 'retail', 'tagline', 'image', 'stock', 'sort_order'].forEach(function(k){
      var e = $('#f-' + k);
      if (e) e.value = p[k] == null ? '' : p[k];
    });
    $('#f-active').checked = !!p.active;
    $('#f-specs').value = (p.specs || []).map(function(x){ return Array.isArray(x) ? x.join(' | ') : x; }).join('\n');
    $('#f-features').value = (p.features || []).join('\n');
    previewImage(imgSrc(p.image));
  } else {
    $('#f-brand').value = 'clover';
    $('#f-stock').value = 'in_stock';
    $('#f-active').checked = true;
    $('#f-sort_order').value = cards.length;
    previewImage('');
  }
  $('#card-modal').classList.add('open');
}

function editCard(id){
  openCard(cards.find(function(p){ return p.id === id; }));
}

function previewImage(url){
  $('#image-preview').innerHTML = url ? '<img src="' + esc(url) + '" onerror="this.parentElement.innerHTML=\'<span>Image preview unavailable</span>\'">' : '<span>Image preview</span>';
}

async function saveCard(e){
  e.preventDefault();
  if (editing === null && !hasPerm('add_hardware')) {
    toast('You do not have permission to add hardware.', 'err');
    return;
  }
  if (editing !== null && !hasPerm('edit_hardware')) {
    toast('You do not have permission to edit hardware.', 'err');
    return;
  }
  if (currentRole === 'viewer') {
    toast('Viewer access is read-only.', 'err');
    return;
  }
  var btn = $('#save-card');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  var id = $('#f-id').value.trim() || slug($('#f-name').value);
  var specs = $('#f-specs').value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean).map(function(x){
    var a = x.split('|');
    return [a[0].trim(), (a.slice(1).join('|') || '').trim()];
  });
  var features = $('#f-features').value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  var data = {
    id: id,
    brand: $('#f-brand').value.trim().toLowerCase(),
    name: $('#f-name').value.trim(),
    category: $('#f-category').value.trim(),
    lease: $('#f-lease').value.trim(),
    retail: $('#f-retail').value.trim(),
    tagline: $('#f-tagline').value.trim(),
    image: $('#f-image').value.trim(),
    stock: $('#f-stock').value,
    specs: specs,
    features: features,
    active: $('#f-active').checked,
    sort_order: +$('#f-sort_order').value || 0,
    updated_at: new Date().toISOString()
  };
  var r = await sb.from('azora_hardware_cards').upsert(data, { onConflict: 'id' });
  btn.disabled = false;
  btn.textContent = 'Save card';
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  toast('Hardware card saved.', 'ok');
  $('#card-modal').classList.remove('open');
  loadCards();
}

function slug(s){
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('hardware-' + Date.now());
}

async function toggleCard(id){
  if (!hasPerm('publish_hardware')) {
    toast('You do not have permission to publish/hide hardware.', 'err');
    return;
  }
  if (currentRole === 'viewer') {
    toast('Viewer access is read-only.', 'err');
    return;
  }
  var p = cards.find(function(x){ return x.id === id; });
  if (!p) return;
  var r = await sb.from('azora_hardware_cards').update({ active: !p.active, updated_at: new Date().toISOString() }).eq('id', id);
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  loadCards();
}

async function deleteCard(id){
  if (!hasPerm('delete_hardware')) {
    toast('You do not have permission to delete hardware.', 'err');
    return;
  }
  if (currentRole === 'viewer') {
    toast('Viewer access is read-only.', 'err');
    return;
  }
  var p = cards.find(function(x){ return x.id === id; });
  if (!p || !confirm('Delete ' + p.name + '?')) return;
  var r = await sb.from('azora_hardware_cards').delete().eq('id', id);
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  toast('Card deleted.', 'ok');
  loadCards();
}

async function uploadImage(file){
  if (!file) return;
  var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  var path = 'hardware/' + Date.now() + '-' + slug(file.name.replace(/\.[^.]+$/, '')) + '.' + ext;
  var r = await sb.storage.from('hardware-images').upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  var pub = sb.storage.from('hardware-images').getPublicUrl(path);
  $('#f-image').value = pub.data.publicUrl;
  previewImage(pub.data.publicUrl);
  toast('Image uploaded.', 'ok');
}

var users = [], editingUser = null;
async function loadUsers(){
  if (!hasPerm('view_users')) return;
  var r = await sb.from('azora_dashboard_users').select('*').order('created_at', { ascending: false });
  if (r.error) {
    $('#users-body').innerHTML = '<tr><td colspan="5" class="empty">Users & Roles setup is incomplete.</td></tr>';
    $('#users-status').innerHTML = '<div class="setup-box">Run <b>supabase/users-roles.sql</b> once in Supabase SQL Editor.</div>';
    return;
  }
  users = r.data || [];
  renderUsers();
}

function permissionNames(p){
  var map = {
    view_overview: 'Overview',
    view_leads: 'View Leads',
    edit_leads: 'Edit Leads',
    delete_leads: 'Delete Leads',
    view_hardware: 'View Hardware',
    add_hardware: 'Add Hardware',
    edit_hardware: 'Edit Hardware',
    publish_hardware: 'Hide / Publish Hardware',
    delete_hardware: 'Delete Hardware',
    view_reports: 'View Reports',
    export_reports: 'Export Reports',
    view_users: 'View Users',
    manage_users: 'Manage Users'
  };
  return Object.keys(p || {}).filter(function(k){ return p[k] && map[k]; }).map(function(k){ return map[k]; });
}

function renderUsers(){
  var body = $('#users-body');
  var q = ($('#user-search').value || '').toLowerCase().trim();
  var rf = $('#role-filter').value;
  var sf = $('#user-status-filter').value;

  var list = users.filter(function(u){
    return (!q || String(u.email).toLowerCase().indexOf(q) >= 0) &&
      (rf === 'all' || u.role === rf) &&
      (sf === 'all' || (u.active ? 'active' : 'inactive') === sf);
  });

  if (!list.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No users found</td></tr>';
    return;
  }
  body.innerHTML = list.map(function(u){
    var perms = permissionNames(u.permissions || {});
    return '<tr>' +
      '<td><div class="customer"><span>' + esc(initials(u.email)) + '</span><div><b>' + esc(u.email) + '</b><small>' + esc(perms.slice(0, 3).join(', ') || 'No custom permissions') + (perms.length > 3 ? ' +' + (perms.length - 3) : '') + '</small></div></div></td>' +
      '<td><b>' + esc(String(u.role || 'viewer').replace(/\b\w/g, function(c){ return c.toUpperCase(); })) + '</b></td>' +
      '<td><em>' + (u.active ? 'Active' : 'Inactive') + '</em></td>' +
      '<td>' + esc(fmtDate(u.created_at)) + '</td>' +
      '<td><div class="flex flex-wrap gap-2"><button class="small-btn" data-user-edit="' + esc(u.id) + '">Edit</button><button class="small-btn" data-user-link="' + esc(u.id) + '">Generate Link</button><button class="small-btn" data-user-toggle="' + esc(u.id) + '">' + (u.active ? 'Disable' : 'Enable') + '</button></div></td>' +
    '</tr>';
  }).join('');

  body.querySelectorAll('[data-user-edit]').forEach(function(b){
    b.onclick = function(){ openUser(users.find(function(x){ return String(x.id) === String(b.dataset.userEdit); })); };
  });
  body.querySelectorAll('[data-user-toggle]').forEach(function(b){
    b.onclick = function(){ toggleUser(b.dataset.userToggle); };
  });
  body.querySelectorAll('[data-user-link]').forEach(function(b){
    b.onclick = function(){ generateAccessLink(users.find(function(x){ return String(x.id) === String(b.dataset.userLink); })); };
  });
}

function defaultPermissions(role){
  if (role === 'admin') return { view_overview: true, view_leads: true, edit_leads: true, delete_leads: true, view_hardware: true, add_hardware: true, edit_hardware: true, publish_hardware: true, delete_hardware: true, view_reports: true, export_reports: true, view_users: true, manage_users: true };
  if (role === 'manager') return { view_overview: true, view_leads: true, view_hardware: true, add_hardware: true, edit_hardware: true, publish_hardware: true, view_reports: true, export_reports: true };
  return { view_overview: true, view_leads: true, view_hardware: true, view_reports: true };
}

function syncPermissionPreset(){
  var role = $('#u-role').value, base = defaultPermissions(role);
  document.querySelectorAll('#permission-list input[data-perm]').forEach(function(c){
    c.checked = editingUser && editingUser.permissions && editingUser.permissions[c.dataset.perm] !== undefined ? !!editingUser.permissions[c.dataset.perm] : !!base[c.dataset.perm];
  });
}

function openUser(u){
  editingUser = u || null;
  $('#user-modal-title').textContent = u ? 'Edit User' : 'Add User';
  $('#user-form').reset();
  if (u) {
    $('#u-email').value = u.email || '';
    $('#u-role').value = u.role || 'viewer';
    $('#u-active').checked = !!u.active;
  } else {
    $('#u-role').value = 'manager';
    $('#u-active').checked = true;
  }
  syncPermissionPreset();
  $('#user-modal').classList.add('open');
}

async function saveUser(e){
  e.preventDefault();
  if (!hasPerm('manage_users')) {
    toast('You do not have permission to manage users.', 'err');
    return;
  }
  var email = $('#u-email').value.trim().toLowerCase(), role = $('#u-role').value, active = $('#u-active').checked, permissions = {};
  document.querySelectorAll('#permission-list input[data-perm]').forEach(function(c){ permissions[c.dataset.perm] = !!c.checked; });
  var btn = $('#save-user');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  var data = { email: email, role: role, active: active, permissions: permissions, updated_at: new Date().toISOString() };
  var r = editingUser ? await sb.from('azora_dashboard_users').update(data).eq('id', editingUser.id) : await sb.from('azora_dashboard_users').insert(data);
  btn.disabled = false;
  btn.textContent = 'Save User';
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  $('#user-modal').classList.remove('open');
  toast('User access saved.', 'ok');
  loadUsers();
}

async function toggleUser(id){
  if (!hasPerm('manage_users')) {
    toast('You do not have permission to manage users.', 'err');
    return;
  }
  var u = users.find(function(x){ return String(x.id) === String(id); });
  if (!u) return;
  var r = await sb.from('azora_dashboard_users').update({ active: !u.active, updated_at: new Date().toISOString() }).eq('id', id);
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  toast(u.active ? 'User access disabled.' : 'User access enabled.', 'ok');
  loadUsers();
}

async function generateAccessLink(u){
  if (!hasPerm('manage_users')) {
    toast('You do not have permission to generate access links.', 'err');
    return;
  }
  if (!u) {
    toast('User not found.', 'err');
    return;
  }
  var r = await sb.rpc('azora_create_access_invite', { p_user_id: u.id });
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  var token = r.data && r.data.token;
  if (!token) {
    toast('Could not generate access link.', 'err');
    return;
  }
  var link = location.origin + '/activate.html?token=' + encodeURIComponent(token);
  $('#access-link-text').value = link;
  $('#access-link-email').textContent = u.email;
  $('#access-link-expiry').textContent = 'Expires ' + fmtDate(r.data.expires_at);
  $('#access-link-modal').classList.add('open');
}

async function generateNewUserLink(){
  if (!hasPerm('manage_users')) {
    toast('You do not have permission to manage users.', 'err');
    return;
  }
  var email = $('#u-email').value.trim().toLowerCase();
  if (!email) {
    toast('Enter the email address first.', 'err');
    return;
  }
  var role = $('#u-role').value, permissions = {};
  document.querySelectorAll('#permission-list input[data-perm]').forEach(function(c){ permissions[c.dataset.perm] = !!c.checked; });
  var r = await sb.rpc('azora_create_access_invite', { p_email: email, p_role: role, p_permissions: permissions });
  if (r.error) {
    toast(r.error.message, 'err');
    return;
  }
  var link = location.origin + '/activate.html?token=' + encodeURIComponent(r.data.token);
  $('#access-link-text').value = link;
  $('#access-link-email').textContent = email;
  $('#access-link-expiry').textContent = 'Expires ' + fmtDate(r.data.expires_at);
  $('#access-link-modal').classList.add('open');
  toast('Secure access link generated.', 'ok');
}

async function changePassword(e){
  e.preventDefault();
  if (!sb) {
    toast('Supabase config missing.', 'err');
    return;
  }
  var current = $('#current-password').value, newPass = $('#new-password').value, confirmPass = $('#confirm-password').value, statusEl = $('#password-status'), btn = $('#save-password');
  if (newPass.length < 8) {
    statusEl.textContent = 'New password must be at least 8 characters.';
    statusEl.className = 'rounded-xl p-3 text-xs bg-amber-50 text-amber-700';
    statusEl.classList.remove('hidden');
    return;
  }
  if (newPass !== confirmPass) {
    statusEl.textContent = 'New passwords do not match.';
    statusEl.className = 'rounded-xl p-3 text-xs bg-red-50 text-red-700';
    statusEl.classList.remove('hidden');
    return;
  }
  var u = await user();
  if (!u || !u.email) {
    toast('Could not verify your account.', 'err');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Updating…';
  statusEl.classList.add('hidden');
  var verify = await sb.auth.signInWithPassword({ email: u.email, password: current });
  if (verify.error) {
    btn.disabled = false;
    btn.textContent = 'Update Password';
    statusEl.textContent = 'Current password is incorrect.';
    statusEl.className = 'rounded-xl p-3 text-xs bg-red-50 text-red-700';
    statusEl.classList.remove('hidden');
    return;
  }
  var r = await sb.auth.updateUser({ password: newPass });
  btn.disabled = false;
  btn.textContent = 'Update Password';
  if (r.error) {
    toast('Password could not be updated: ' + r.error.message, 'err');
    return;
  }
  $('#password-form').reset();
  $('#password-modal').classList.remove('open');
  toast('Dashboard password updated successfully.', 'ok');
}

function exportCsv(){
  if (!hasPerm('export_reports')) {
    toast('You do not have permission to export reports.', 'err');
    return;
  }
  if (!rows.length) {
    toast('No leads to export.', 'err');
    return;
  }
  var hs = ['created_at', 'event_type', 'ref', 'business', 'contact', 'email', 'phone', 'locations', 'message', 'items', 'email_status', 'read', 'page_url'];
  var lines = [hs.join(',')].concat(rows.map(function(r){
    return hs.map(function(h){
      var v = h === 'items' ? JSON.stringify(r.items || []) : (r[h] == null ? '' : r[h]);
      return '"' + String(v).replace(/"/g, '""') + '"';
    }).join(',');
  }));
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = 'azora-leads-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}

function exportReport(){
  if (!hasPerm('export_reports')) {
    toast('You do not have permission to export reports.', 'err');
    return;
  }
  var val = $('#report-month').value;
  if (!val) {
    toast('Select a month first.', 'err');
    return;
  }
  var p = val.split('-'), rs = rows.filter(function(r){
    var d = new Date(r.created_at);
    return d.getFullYear() === +p[0] && d.getMonth() === (+p[1] - 1);
  });
  var text = ['AZORA MONTHLY REPORT', val, 'Total events: ' + rs.length, 'Quote requests: ' + rs.filter(function(r){ return r.event_type && r.event_type.indexOf('quote') !== -1; }).length, '', 'Date,Customer,Email,Phone,Event,Reference,EmailStatus,Read'].concat(rs.map(function(r){
    return [new Date(r.created_at).toISOString(), r.contact || r.business || '', r.email || '', r.phone || '', r.event_type || '', r.ref || '', r.email_status || 'pending', r.read ? 'Yes' : 'No'].map(function(x){
      return '"' + String(x).replace(/"/g, '""') + '"';
    }).join(',');
  }));
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text.join('\n')], { type: 'text/csv' }));
  a.download = 'azora-report-' + val + '.csv';
  a.click();
}

// Wire events
$('#theme-toggle').onclick = function(){
  var d = !document.body.classList.contains('dark');
  localStorage.setItem('azora_theme', d ? 'dark' : 'light');
  theme();
};

var notifBell = $('#notif-bell');
if (notifBell) {
  notifBell.onclick = function(e){
    e.stopPropagation();
    var dropdown = $('#notif-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
  };
}

document.addEventListener('click', function(e){
  var dropdown = $('#notif-dropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!e.target.closest('#notif-wrapper')) {
      dropdown.classList.add('hidden');
    }
  }
});

var markAllBtn = $('#mark-all-read');
if (markAllBtn) markAllBtn.onclick = markAllRead;

var pushBtn = $('#enable-notif-btn');
if (pushBtn) pushBtn.onclick = requestPushPermission;

$('#change-password').onclick = function(){
  $('#password-form').reset();
  $('#password-status').classList.add('hidden');
  $('#password-modal').classList.add('open');
  setTimeout(function(){ $('#current-password').focus(); }, 60);
};
$('#close-password').onclick = function(){ $('#password-modal').classList.remove('open'); };
$('#close-password-2').onclick = function(){ $('#password-modal').classList.remove('open'); };
$('#password-modal').onclick = function(e){ if (e.target.id === 'password-modal') $('#password-modal').classList.remove('open'); };
$('#password-form').onsubmit = changePassword;
$('#delete-lead-drawer').onclick = function(){ if (selectedLeadId) deleteLead(selectedLeadId); };

$$('[data-section]').forEach(function(b){
  b.onclick = function(){
    var id = b.dataset.section;
    $$('.page-section').forEach(function(s){ s.classList.toggle('active', s.id === id); });
    $$('[data-section]').forEach(function(x){ x.classList.toggle('active', x === b); });
    if (id === 'hardware') loadCards();
    if (id === 'reports') renderReports();
    if (id === 'users') loadUsers();
  };
});

$('#login-form').onsubmit = async function(e){
  e.preventDefault();
  if (!sb) {
    toast('Supabase config missing.', 'err');
    return;
  }
  var btn = $('#login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  var r = await sb.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
  btn.disabled = false;
  btn.textContent = 'Sign in';
  if (r.error) {
    $('#login-status').textContent = r.error.message;
    $('#login-status').className = 'status err';
    return;
  }
  var logged = r.data.user;
  if (logged && String(logged.email || '').toLowerCase() === 'admin@gmail.com') {
    currentRole = 'admin';
  } else if (logged) {
    var ar = await sb.from('azora_dashboard_users').select('role,active').eq('email', String(logged.email || '').toLowerCase()).maybeSingle();
    if (ar.error || !ar.data || !ar.data.active) {
      await sb.auth.signOut();
      $('#login-status').textContent = 'This account does not have active dashboard access.';
      $('#login-status').className = 'status err';
      return;
    }
    currentRole = ar.data.role || 'viewer';
  }
  load();
};

$('#logout').onclick = async function(){
  if (sb) await sb.auth.signOut();
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  showLogin();
};

$('#export-report').onclick = exportReport;
$('#report-month').onchange = renderReports;
$('#search').oninput = applyFilters;
$('#event-filter').onchange = applyFilters;
$('#date-filter').onchange = applyFilters;
$('#close-drawer').onclick = function(){ $('#lead-drawer').classList.remove('open'); };
$('#lead-drawer').onclick = function(e){ if (e.target.id === 'lead-drawer') $('#lead-drawer').classList.remove('open'); };
$('#new-card').onclick = function(){ openCard(); };

var newUser = $('#new-user');
if (newUser) newUser.onclick = function(){ if (hasPerm('manage_users')) openUser(); };
var genLink = $('#generate-new-link');
if (genLink) genLink.onclick = function(){ generateNewUserLink(); };
var copyLink = $('#copy-access-link');
if (copyLink) copyLink.onclick = function(){
  var x = $('#access-link-text');
  x.select();
  navigator.clipboard && navigator.clipboard.writeText(x.value).then(function(){ toast('Access link copied.', 'ok'); });
};
var closeAccess = $('#close-access-link');
if (closeAccess) closeAccess.onclick = function(){ $('#access-link-modal').classList.remove('open'); };
var roleSelect = $('#u-role');
if (roleSelect) roleSelect.onchange = syncPermissionPreset;
var userForm = $('#user-form');
if (userForm) userForm.onsubmit = saveUser;
var closeUser = $('#close-user');
if (closeUser) closeUser.onclick = function(){ $('#user-modal').classList.remove('open'); };
var closeUser2 = $('#close-user-2');
if (closeUser2) closeUser2.onclick = function(){ $('#user-modal').classList.remove('open'); };
var userModal = $('#user-modal');
if (userModal) userModal.onclick = function(e){ if (e.target.id === 'user-modal') $('#user-modal').classList.remove('open'); };
var userSearch = $('#user-search');
if (userSearch) userSearch.oninput = renderUsers;
var roleFilter = $('#role-filter');
if (roleFilter) roleFilter.onchange = renderUsers;
var userStatusFilter = $('#user-status-filter');
if (userStatusFilter) userStatusFilter.onchange = renderUsers;
$('#import-current').onclick = importCurrent;
$('#card-form').onsubmit = saveCard;
$('#close-card').onclick = function(){ $('#card-modal').classList.remove('open'); };
$('#card-modal').onclick = function(e){ if (e.target.id === 'card-modal') $('#card-modal').classList.remove('open'); };
$('#f-image').oninput = function(){ previewImage(this.value); };
$('#f-upload').onchange = function(){ uploadImage(this.files[0]); };

async function load(){
  if (!ready) {
    showLogin();
    $('#login-status').textContent = 'Supabase configuration is missing.';
    $('#login-status').className = 'status err';
    return;
  }
  try {
    var u = await user();
    if (!u) {
      showLogin();
      return;
    }
    if (String(u.email || '').toLowerCase() === 'admin@gmail.com') {
      currentRole = 'admin';
      currentPermissions = defaultPermissions('admin');
    } else {
      var ar = await sb.from('azora_dashboard_users').select('role,active,permissions').eq('email', String(u.email || '').toLowerCase()).maybeSingle();
      if (ar.error || !ar.data || !ar.data.active) {
        await sb.auth.signOut();
        showLogin();
        $('#login-status').textContent = 'This account does not have active dashboard access.';
        $('#login-status').className = 'status err';
        return;
      }
      currentRole = ar.data.role || 'viewer';
      currentPermissions = ar.data.permissions || defaultPermissions(currentRole);
    }
    showApp(u);
    applyRoleUI();
    hideStatus();
    updatePushBtnUI();
    await loadLeads();
    await loadCards();
    setupRealtime();
  } catch (e) {
    showLogin();
    $('#login-status').textContent = e.message || 'Could not verify session.';
    $('#login-status').className = 'status err';
  }
}

window.azoraDashboard = {
  exportCsv: exportCsv,
  playChime: playLeadChime,
  triggerIncoming: handleIncomingLead
};

theme();
load();
})();
