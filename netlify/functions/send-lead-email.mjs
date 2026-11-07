// AZORA SOLUTIONS: Titan Mail SMTP via Netlify Serverless Function
// Sends lead and quote notifications directly to sales@azorasolution.com
import 'dotenv/config';
import nodemailer from 'nodemailer';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatLeadType(eventType, items) {
  if (eventType === 'hardware_quote') return 'Hardware Quote';
  if (eventType === 'website_quote') return 'Website Development';
  if (eventType === 'seo_quote') return 'Local SEO';
  if (eventType === 'marketing_quote') return 'Digital Marketing';
  if (eventType === 'plan_quote') return 'Growth Plan Quote';
  if (eventType === 'service_quote') return 'Service Enquiry';
  if (eventType === 'contact_request') return 'Contact Request / Chatbot Lead';
  if (eventType === 'quote_submitted') {
    if (items && items.length > 0) return 'Hardware Quote';
    return 'General Quote Request';
  }
  return (eventType || 'General Enquiry').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderItemsHtml(items) {
  if (!items || !items.length) {
    return `<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#64748b;font-size:13px;">No specific hardware or plan items selected.</div>`;
  }

  let html = `<table style="width:100%;border-collapse:collapse;margin-top:6px;">`;
  items.forEach((item, idx) => {
    const name = escapeHtml(typeof item === 'string' ? item : (item.name || item.id || JSON.stringify(item)));
    const cat = typeof item === 'object' && item.category ? `<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;font-weight:700;display:block;">${escapeHtml(item.category)}</span>` : '';
    const price = typeof item === 'object' && item.lease ? `<span style="font-size:13px;font-weight:800;color:#0b1320;">${escapeHtml(item.lease)}</span>` : '';

    html += `
      <tr style="border-bottom:1px solid #edf2f7;background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding:10px 12px;font-size:13px;color:#0b1320;font-weight:600;">
          ${cat}
          <div style="font-size:13.5px;color:#0b1320;font-weight:700;">${name}</div>
        </td>
        <td style="padding:10px 12px;text-align:right;font-size:13px;">
          ${price}
        </td>
      </tr>
    `;
  });
  html += `</table>`;
  return html;
}

function generateEmailHtml(lead) {
  const leadType = formatLeadType(lead.event_type, lead.items);
  const name = escapeHtml(lead.contact || lead.business || 'New Prospect');
  const business = escapeHtml(lead.business || 'Not specified');
  const email = escapeHtml(lead.email || 'Not provided');
  const phone = escapeHtml(lead.phone || 'Not provided');
  const locations = escapeHtml(lead.locations || '1');
  const message = lead.message ? escapeHtml(lead.message).replace(/\n/g, '<br/>') : 'No additional comments provided.';
  const ref = escapeHtml(lead.ref || `AZ-${lead.id || Date.now()}`);
  const pageUrl = /^https?:\/\//i.test(lead.page_url || '') ? escapeHtml(lead.page_url) : 'https://azorasolution.com/quote';
  const submittedAt = lead.created_at ? new Date(lead.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'medium' }) + ' (New York time)' : new Date().toUTCString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Azora Lead</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1320;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    
    <!-- Top Branding Header -->
    <div style="background:#111b2c;border:1px solid #1e293b;border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <div style="display:inline-block;background:#2469EB;color:#ffffff;font-size:18px;font-weight:900;width:40px;height:40px;line-height:40px;border-radius:10px;text-align:center;margin-bottom:10px;">A</div>
      <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.03em;margin:0;">AZORA SOLUTIONS</div>
      <div style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">New Customer Enquiry Alert</div>
    </div>

    <!-- Alert Banner -->
    <div style="background:#2469EB;padding:12px 24px;text-align:center;">
      <span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">
        🔔 ${escapeHtml(leadType)} — ${business}
      </span>
    </div>

    <!-- Main Card Body -->
    <div style="background:#ffffff;padding:28px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      
      <!-- Quick Action Buttons -->
      <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Instant Actions</div>
        <div style="display:inline-block;margin:0 4px;">
          ${lead.phone ? `<a href="tel:${escapeHtml(lead.phone)}" style="display:inline-block;background:#0b1320;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;">📞 Call Customer</a>` : ''}
        </div>
        <div style="display:inline-block;margin:0 4px;">
          ${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}?subject=Regarding your Azora Solutions quote (${ref})" style="display:inline-block;background:#2469EB;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;">✉️ Reply by Email</a>` : ''}
        </div>
        <div style="display:inline-block;margin:0 4px;">
          <a href="https://azorasolution.com/dashboard" style="display:inline-block;background:#f1f5f9;color:#0b1320;border:1px solid #cbd5e1;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;">📊 Open Dashboard</a>
        </div>
      </div>

      <!-- Lead Details Grid -->
      <h3 style="font-size:13px;font-weight:900;color:#0b1320;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;padding-bottom:6px;border-bottom:2px solid #2469EB;">
        Customer Information
      </h3>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;width:140px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Customer Name:</td>
          <td style="padding:8px 0;font-size:14px;font-weight:800;color:#0b1320;">${name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Business Name:</td>
          <td style="padding:8px 0;font-size:14px;font-weight:800;color:#0b1320;">${business}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Email Address:</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:#2469EB;">
            ${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2469EB;text-decoration:none;">${escapeHtml(lead.email)}</a>` : 'Not provided'}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Phone Number:</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:#0b1320;">
            ${lead.phone ? `<a href="tel:${escapeHtml(lead.phone)}" style="color:#0b1320;text-decoration:none;">${escapeHtml(lead.phone)}</a>` : 'Not provided'}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Locations:</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:#0b1320;">${locations} location(s)</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Reference ID:</td>
          <td style="padding:8px 0;font-size:13px;font-family:monospace;font-weight:700;color:#2469EB;">${ref}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Submitted At:</td>
          <td style="padding:8px 0;font-size:12px;color:#64748b;">${submittedAt}</td>
        </tr>
      </table>

      <!-- Requested Products / Services -->
      <h3 style="font-size:13px;font-weight:900;color:#0b1320;text-transform:uppercase;letter-spacing:0.12em;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #2469EB;">
        Requested Hardware / Plan Items
      </h3>
      ${renderItemsHtml(lead.items)}

      <!-- Customer Message -->
      <h3 style="font-size:13px;font-weight:900;color:#0b1320;text-transform:uppercase;letter-spacing:0.12em;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #2469EB;">
        Customer Message / Notes
      </h3>
      <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:13.5px;line-height:1.6;color:#1e293b;">
        ${message}
      </div>

      <!-- Source Information -->
      <div style="margin-top:24px;padding:12px 16px;background:#edf2f7;border-radius:8px;font-size:11px;color:#64748b;">
        <strong>Source Page:</strong> <a href="${pageUrl}" style="color:#2469EB;">${pageUrl}</a><br/>
        <strong>Lead Reference:</strong> ${escapeHtml(lead.ref || 'N/A')}
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#111b2c;border:1px solid #1e293b;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;color:#64748b;font-size:11.5px;line-height:1.6;">
      <div>This automated notification was generated by the <strong>Azora Solutions</strong> lead management system.</div>
      <div style="margin-top:4px;">Azora Solutions LLC · (984) 388-8298 · sales@azorasolution.com</div>
      <div style="margin-top:6px;color:#475569;">© ${new Date().getFullYear()} Azora Solutions. All rights reserved.</div>
    </div>

  </div>
</body>
</html>
  `;
}

const LEAD_PATH = '/api/lead';

// Netlify configuration
export const config = {
  path: LEAD_PATH,
  rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: ['ip'] }
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store'
};

const reply = (status, obj) => Response.json(obj, {
  status,
  headers: CORS_HEADERS
});

const trim = (value, max) => String(value == null ? '' : value).trim().slice(0, max);
const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 160;

function normalize(raw, req) {
  const email = trim(raw.email || raw.user_email || raw.mail, 160);
  const contact = trim(raw.contact || raw.fullName || raw.name || raw.customer_name || raw.customerName, 120);
  const business = trim(raw.business || raw.businessName || raw.company || raw.companyName || raw.storeName, 160);
  const phone = trim(raw.phone || raw.telephone || raw.mobile || raw.phoneNumber, 50);
  const message = trim(raw.message || raw.notes || raw.comments || raw.description, 2400);

  if (!validEmail(email) || (!contact && !business)) {
    throw new Error('Please enter your name or business and a valid email address.');
  }

  let ref = trim(raw.ref, 65);
  if (ref && !/^[a-z0-9_-]{4,65}$/i.test(ref)) {
    ref = 'AZ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  if (!ref) {
    ref = 'AZ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  let items = [];
  if (Array.isArray(raw.items)) {
    items = raw.items.slice(0, 35).map(item => {
      if (typeof item === 'string') return trim(item, 160);
      if (!item || typeof item !== 'object') return '';
      return {
        id: trim(item.id, 100), name: trim(item.name, 160),
        category: trim(item.category, 100), lease: trim(item.lease, 100)
      };
    }).filter(Boolean);
  } else if (raw.item || raw.hardware || raw.plan || raw.service) {
    const single = String(raw.item || raw.hardware || raw.plan || raw.service);
    items = [{ id: single, name: single, category: 'Direct Selection' }];
  }

  const url = trim(raw.page_url || (req.headers && req.headers.get ? req.headers.get('referer') : ''), 500);
  const userAgent = req.headers && req.headers.get ? trim(req.headers.get('user-agent'), 500) : '';

  return {
    ref,
    event_type: trim(raw.event_type || (items.length ? 'hardware_quote' : 'general_quote'), 64),
    business, contact, email,
    phone,
    locations: trim(raw.locations || '1', 30),
    message, items,
    page_url: /^https?:\/\//i.test(url) ? url : '',
    user_agent: userAgent,
    read: false, email_status: 'sending'
  };
}

async function supabaseRequest(url, key, method, path, payload) {
  const response = await fetch(url.replace(/\/$/, '') + '/rest/v1/azora_leads' + path, {
    method,
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    throw new Error('Supabase request failed (' + response.status + '): ' + raw.slice(0, 150));
  }
  return data;
}

function makeTransport(targetPort) {
  const smtpUser = process.env.SMTP_USER || 'sales@azorasolution.com';
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.TITAN_PASSWORD || process.env.TITAN_MAIL_PASSWORD || '';
  if (!smtpPassword) {
    return null;
  }
  const port = Number(targetPort || process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: smtpUser, pass: smtpPassword },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
}

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return reply(405, { ok: false, error: 'Method not allowed.' });
  }

  const contentType = (request.headers && request.headers.get ? request.headers.get('content-type') : '') || '';
  if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
    return reply(415, { ok: false, error: 'Expected JSON or form data.' });
  }

  let payload;
  try {
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries());
    } else {
      payload = await request.json();
    }
  } catch {
    return reply(400, { ok: false, error: 'Invalid JSON request.' });
  }

  if (!payload || typeof payload !== 'object') {
    return reply(400, { ok: false, error: 'Invalid form payload.' });
  }

  // Honeypot check for bots
  if (payload.website) {
    return reply(200, { ok: true, email_sent: false, ref: 'SPAM-FILTERED' });
  }

  let lead;
  try {
    lead = normalize(payload, request);
  } catch (error) {
    return reply(400, { ok: false, error: error.message });
  }

  let saved = { ...lead, id: Date.now() };

  // 1. Optional Supabase persistence (non-blocking)
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const existing = await supabaseRequest(sbUrl, sbKey, 'GET', '?select=*&ref=eq.' + encodeURIComponent(lead.ref) + '&limit=1');
      if (existing && existing.length) {
        saved = existing[0];
        if (saved.email_status === 'sent') {
          return reply(200, { ok: true, stored: true, email_sent: true, duplicate: true, ref: saved.ref });
        }
      } else {
        const inserted = await supabaseRequest(sbUrl, sbKey, 'POST', '?select=*', lead);
        if (inserted && inserted[0]) {
          saved = inserted[0];
        }
      }
    } catch (sbErr) {
      console.warn('Supabase lead logging skipped:', sbErr.message);
    }
  }

  // 2. Titan SMTP Email Notification (with automatic 465/587 fallback)
  const smtpRecipient = process.env.SALES_EMAIL || 'sales@azorasolution.com';
  const smtpSender = process.env.SMTP_USER || 'sales@azorasolution.com';
  let emailSent = false;
  let emailWarning = null;

  const leadTypeTitle = formatLeadType(saved.event_type, saved.items);
  const subject = `NEW AZORA LEAD — ${leadTypeTitle} — ${trim(saved.business || saved.contact || 'Prospect', 100)}`;
  const mailOptions = {
    from: { name: 'Azora Solutions Leads', address: smtpSender },
    to: smtpRecipient,
    replyTo: validEmail(saved.email || '') ? saved.email : undefined,
    subject,
    html: generateEmailHtml(saved),
    text: `NEW AZORA SOLUTIONS LEAD\n` +
          `Reference: ${saved.ref}\n` +
          `Type: ${leadTypeTitle}\n` +
          `Customer Name: ${saved.contact || 'Not provided'}\n` +
          `Business: ${saved.business || 'Not provided'}\n` +
          `Email: ${saved.email}\n` +
          `Phone: ${saved.phone || 'Not provided'}\n` +
          `Locations: ${saved.locations || '1'}\n` +
          `Message: ${saved.message || 'None'}\n`
  };

  const primaryPort = Number(process.env.SMTP_PORT || 465);
  const fallbackPort = primaryPort === 465 ? 587 : 465;
  let transporter = makeTransport(primaryPort);

  if (!transporter) {
    console.warn('[Titan Mail] SMTP_PASSWORD is not set in environment variables. Email notification skipped.');
    emailWarning = 'Titan SMTP password not configured in environment variables. Set SMTP_PASSWORD in Netlify.';
  } else {
    try {
      let result = null;
      try {
        result = await transporter.sendMail(mailOptions);
      } catch (portErr) {
        console.warn(`[Titan Mail] Port ${primaryPort} error: ${portErr.message}. Retrying on Port ${fallbackPort}...`);
        const fallbackTransporter = makeTransport(fallbackPort);
        result = await fallbackTransporter.sendMail(mailOptions);
      }

      if (result && result.accepted && result.accepted.length) {
        emailSent = true;
        console.info('[Titan Mail] Successfully sent lead notification to ' + smtpRecipient + ' for ref: ' + saved.ref);

        if (sbUrl && sbKey && saved.id) {
          try {
            await supabaseRequest(sbUrl, sbKey, 'PATCH', '?id=eq.' + encodeURIComponent(saved.id), {
              email_status: 'sent',
              email_sent_at: new Date().toISOString()
            });
          } catch {}
        }
      } else {
        throw new Error('SMTP server did not confirm message acceptance.');
      }
    } catch (smtpError) {
      console.error('[Titan Mail] Email delivery failed on both ports:', smtpError.message);
      emailWarning = 'Email notification error: ' + smtpError.message;
      if (sbUrl && sbKey && saved.id) {
        try {
          await supabaseRequest(sbUrl, sbKey, 'PATCH', '?id=eq.' + encodeURIComponent(saved.id), {
            email_status: 'failed',
            email_error: String(smtpError.message).slice(0, 400)
          });
        } catch {}
      }
    }
  }
  } catch (smtpError) {
    console.error('[Titan Mail] Email delivery failed:', smtpError.message);
    emailWarning = 'Email notification error: ' + smtpError.message;
    if (sbUrl && sbKey && saved.id) {
      try {
        await supabaseRequest(sbUrl, sbKey, 'PATCH', '?id=eq.' + encodeURIComponent(saved.id), {
          email_status: 'failed',
          email_error: String(smtpError.message).slice(0, 400)
        });
      } catch {}
    }
  }

  return reply(200, {
    ok: true,
    stored: true,
    email_sent: emailSent,
    ref: saved.ref,
    warning: emailWarning || undefined
  });
}
