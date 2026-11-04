/* Azora Solutions — reliable lead submission & Titan email notification */
(function () {
  'use strict';
  var inFlight = new Map();

  function eventType(payload) {
    if (payload.event_type && payload.event_type !== 'quote_submitted') return payload.event_type;
    var items = Array.isArray(payload.items) ? payload.items : [];
    var name = String(payload.plan || payload.service || '').toLowerCase();
    if (/website|starter|growth|premium/.test(name)) return 'website_quote';
    if (name.includes('seo')) return 'seo_quote';
    if (name.includes('marketing')) return 'marketing_quote';
    if (items.length) return 'hardware_quote';
    if (payload.business === 'Chatbot Custom Inquiry') return 'contact_request';
    return 'general_quote';
  }

  // Fallback direct insert into Supabase using client anon key if API is unavailable
  async function saveDirectToSupabase(leadData) {
    try {
      if (window.supabase && window.AZ_SUPABASE_CONFIG && window.AZ_SUPABASE_CONFIG.url && window.AZ_SUPABASE_CONFIG.key) {
        var sb = window._azSbClient || (window._azSbClient = window.supabase.createClient(window.AZ_SUPABASE_CONFIG.url, window.AZ_SUPABASE_CONFIG.key));
        var res = await sb.from('azora_leads').insert([{
          ref: leadData.ref,
          event_type: leadData.event_type,
          business: leadData.business,
          contact: leadData.contact,
          email: leadData.email,
          phone: leadData.phone,
          locations: leadData.locations,
          message: leadData.message,
          items: leadData.items,
          page_url: leadData.page_url,
          user_agent: navigator.userAgent
        }]);
        return !res.error;
      }
    } catch (e) {
      console.warn('Direct Supabase save failed:', e);
    }
    return false;
  }

  window.AZStore = {
    configured: function () { return true; },
    saveLead: async function (payload) {
      var ref = payload.ref || 'AZ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      if (inFlight.has(ref)) return inFlight.get(ref);

      var work = (async function () {
        var leadData = {
          ref: ref,
          event_type: eventType(payload),
          business: payload.business || '',
          contact: payload.contact || '',
          email: payload.email || '',
          phone: payload.phone || '',
          locations: payload.locations || '1',
          message: payload.message || '',
          items: Array.isArray(payload.items) ? payload.items : [],
          page_url: location.href,
          website: '' // anti-bot honeypot (always empty for humans)
        };

        // Cache immediately in browser
        try {
          localStorage.setItem('azora_last_quote', JSON.stringify(leadData));
          var log = JSON.parse(localStorage.getItem('azora_quote_log') || '[]');
          log.push(leadData);
          localStorage.setItem('azora_quote_log', JSON.stringify(log));
        } catch (storageErr) {}

        // Try primary and fallback API endpoints
        var endpoints = ['/api/lead', '/.netlify/functions/send-lead-email'];
        var lastError = null;

        for (var i = 0; i < endpoints.length; i++) {
          var endpoint = endpoints[i];
          var controller = new AbortController();
          var timeout = setTimeout(function () { controller.abort(); }, 16000);

          try {
            var resp = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(leadData),
              signal: controller.signal
            });

            clearTimeout(timeout);

            // If 404, try next endpoint
            if (resp.status === 404 && i === 0) {
              continue;
            }

            var json = await resp.json().catch(function () { return {}; });

            if (resp.ok && json.ok) {
              if (json.warning) {
                console.info('Azora Lead Notification Info:', json.warning);
              }
              return {
                ok: true,
                data: json,
                ref: json.ref || ref,
                email_sent: !!json.email_sent
              };
            } else if (json.error) {
              lastError = json.error;
            }
          } catch (fetchErr) {
            clearTimeout(timeout);
            lastError = fetchErr;
          }
        }

        // If serverless endpoints could not be reached (e.g. static hosting, offline, local dev)
        console.warn('API lead endpoint not available. Using client persistence fallback.');
        await saveDirectToSupabase(leadData);

        return {
          ok: true,
          data: { ref: ref, local: true },
          ref: ref,
          email_sent: false,
          offline: true
        };
      })();

      inFlight.set(ref, work);
      try {
        return await work;
      } finally {
        inFlight.delete(ref);
      }
    }
  };
})();
