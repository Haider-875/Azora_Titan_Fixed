// ============================================================================
// AZORA SOLUTIONS — SERVER-SIDE LEAD EMAIL NOTIFICATION EDGE FUNCTION
// Deployed as a Supabase Edge Function: /functions/v1/send-lead-email
// Triggered by Database Webhook on azora_leads INSERT or invoked directly
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Target sales inbox
const PRIMARY_SALES_EMAIL = Deno.env.get("SALES_EMAIL") || "sales@azorasolution.com";

// Email sender address
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "Azora Solutions Leads <notifications@azorasolution.com>";
const FALLBACK_SENDER_EMAIL = "Azora Solutions Leads <onboarding@resend.dev>";

// Format human-readable lead type label
function formatLeadType(eventType: string, items: any[]): string {
  if (eventType === "hardware_quote") return "Hardware Quote";
  if (eventType === "website_quote") return "Website Development";
  if (eventType === "seo_quote") return "Local SEO";
  if (eventType === "marketing_quote") return "Digital Marketing";
  if (eventType === "plan_quote") return "Growth Plan Quote";
  if (eventType === "service_quote") return "Service Enquiry";
  if (eventType === "contact_request") return "Contact Request / Chatbot Lead";
  if (eventType === "quote_submitted") {
    if (items && items.length > 0) return "Hardware Quote";
    return "General Quote Request";
  }
  return (eventType || "General Enquiry").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format items list into HTML
function renderItemsHtml(items: any[]): string {
  if (!items || !items.length) {
    return `<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#64748b;font-size:13px;">No specific hardware or plan items selected.</div>`;
  }

  let html = `<table style="width:100%;border-collapse:collapse;margin-top:6px;">`;
  items.forEach((item: any, idx: number) => {
    const name = typeof item === "string" ? item : (item.name || item.id || JSON.stringify(item));
    const cat = typeof item === "object" && item.category ? `<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;font-weight:700;display:block;">${item.category}</span>` : "";
    const price = typeof item === "object" && item.lease ? `<span style="font-size:13px;font-weight:800;color:#0b1320;">${item.lease}</span>` : "";

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

// Generate the complete HTML email template
function generateEmailHtml(lead: any): string {
  const leadType = formatLeadType(lead.event_type, lead.items);
  const name = lead.contact || lead.business || "New Prospect";
  const business = lead.business || "Not specified";
  const email = lead.email || "Not provided";
  const phone = lead.phone || "Not provided";
  const locations = lead.locations || "1";
  const message = lead.message ? lead.message.replace(/\n/g, "<br/>") : "No additional comments provided.";
  const ref = lead.ref || `AZ-${lead.id || Date.now()}`;
  const pageUrl = lead.page_url || "https://azorasolution.com/quote";
  const submittedAt = lead.created_at ? new Date(lead.created_at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "medium" }) + " (EST)" : new Date().toUTCString();

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
        🔔 ${leadType} — ${business}
      </span>
    </div>

    <!-- Main Card Body -->
    <div style="background:#ffffff;padding:28px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      
      <!-- Quick Action Buttons -->
      <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Instant Actions</div>
        <div style="display:inline-block;margin:0 4px;">
          ${lead.phone ? `<a href="tel:${lead.phone}" style="display:inline-block;background:#0b1320;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;">📞 Call Customer</a>` : ''}
        </div>
        <div style="display:inline-block;margin:0 4px;">
          ${lead.email ? `<a href="mailto:${lead.email}?subject=Regarding your Azora Solutions quote (${ref})" style="display:inline-block;background:#2469EB;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;">✉️ Reply by Email</a>` : ''}
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
            ${lead.email ? `<a href="mailto:${lead.email}" style="color:#2469EB;text-decoration:none;">${lead.email}</a>` : 'Not provided'}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Phone Number:</td>
          <td style="padding:8px 0;font-size:14px;font-weight:700;color:#0b1320;">
            ${lead.phone ? `<a href="tel:${lead.phone}" style="color:#0b1320;text-decoration:none;">${lead.phone}</a>` : 'Not provided'}
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
        <strong>Lead Database ID:</strong> #${lead.id || 'N/A'}
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

// Generate Plain Text Fallback
function generateEmailText(lead: any): string {
  const leadType = formatLeadType(lead.event_type, lead.items);
  const itemsText = Array.isArray(lead.items) && lead.items.length 
    ? lead.items.map((i: any) => typeof i === "string" ? `- ${i}` : `- ${i.name || i.id} (${i.lease || ''})`).join("\n")
    : "None specified";

  return `
NEW AZORA SOLUTIONS LEAD
============================================================
Lead Type:      ${leadType}
Reference:      ${lead.ref || 'N/A'}
Submitted:      ${lead.created_at || new Date().toISOString()}

CUSTOMER DETAILS:
Name:           ${lead.contact || 'N/A'}
Business:       ${lead.business || 'N/A'}
Email:          ${lead.email || 'N/A'}
Phone:          ${lead.phone || 'N/A'}
Locations:      ${lead.locations || '1'}

REQUESTED ITEMS / SERVICES:
${itemsText}

CUSTOMER MESSAGE:
${lead.message || 'No message provided.'}

SOURCE:
Page:           ${lead.page_url || 'https://azorasolution.com/quote'}
Lead ID:        #${lead.id || 'N/A'}

============================================================
Azora Solutions Dashboard: https://azorasolution.com/dashboard
`;
}

// Main Edge Function Handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    const payload = await req.json();
    
    // Support both Webhook payload (payload.record) and direct invocation (payload.lead or payload)
    const lead = payload.record || payload.lead || payload;

    if (!lead || (!lead.email && !lead.phone && !lead.business && !lead.contact)) {
      return new Response(
        JSON.stringify({ error: "Invalid lead payload. Missing customer contact data." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check: If lead is already marked as 'sent', don't send again
    if (lead.email_status === "sent") {
      return new Response(
        JSON.stringify({ ok: true, status: "skipped", message: "Email already sent for this lead." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadType = formatLeadType(lead.event_type, lead.items);
    const businessOrName = lead.business || lead.contact || "Prospect";
    const subject = `NEW AZORA LEAD — ${leadType} — ${businessOrName}`;

    let emailResult = { ok: false, error: null as any, data: null as any };

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY environment variable is not set. Email cannot be delivered.");
      emailResult = {
        ok: false,
        error: "RESEND_API_KEY is not configured in Supabase Edge Function secrets.",
        data: null
      };
    } else {
      // Send email via Resend REST API
      try {
        let fromSender = SENDER_EMAIL;
        let resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromSender,
            to: [PRIMARY_SALES_EMAIL],
            reply_to: lead.email || undefined,
            subject: subject,
            html: generateEmailHtml(lead),
            text: generateEmailText(lead)
          })
        });

        // If custom domain is not yet verified on Resend, attempt with onboarding fallback sender
        if (!resendResponse.ok && resendResponse.status === 403) {
          const errBody = await resendResponse.text();
          console.warn("Custom sender domain unverified on Resend. Trying fallback sender...", errBody);
          resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: FALLBACK_SENDER_EMAIL,
              to: [PRIMARY_SALES_EMAIL],
              reply_to: lead.email || undefined,
              subject: subject,
              html: generateEmailHtml(lead),
              text: generateEmailText(lead)
            })
          });
        }

        const resData = await resendResponse.json();

        if (resendResponse.ok) {
          emailResult = { ok: true, error: null, data: resData };
        } else {
          emailResult = { ok: false, error: resData.message || JSON.stringify(resData), data: null };
        }
      } catch (err: any) {
        emailResult = { ok: false, error: err.message || String(err), data: null };
      }
    }

    // Update lead record in Supabase with email delivery status
    if (supabaseUrl && supabaseServiceKey && lead.id) {
      try {
        const sb = createClient(supabaseUrl, supabaseServiceKey);
        await sb.from("azora_leads").update({
          email_status: emailResult.ok ? "sent" : "failed",
          email_sent_at: emailResult.ok ? new Date().toISOString() : null,
          email_error: emailResult.ok ? null : String(emailResult.error || "Delivery failed")
        }).eq("id", lead.id);
      } catch (dbErr) {
        console.error("Failed to update email status in azora_leads table:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        ok: emailResult.ok,
        subject: subject,
        recipient: PRIMARY_SALES_EMAIL,
        delivery: emailResult
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (globalErr: any) {
    console.error("Unhandled error in send-lead-email function:", globalErr);
    return new Response(
      JSON.stringify({ error: globalErr.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

