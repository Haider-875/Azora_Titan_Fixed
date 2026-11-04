// Azora Solutions — Titan SMTP Email Verification Tool
// Run from terminal:
//   node test-titan-email.mjs [your_titan_password] [port]
// Example:
//   node test-titan-email.mjs Admin@12345 587
// Or set in .env file:
//   SMTP_PASSWORD=Admin@12345

import 'dotenv/config';
import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.titan.email';
const user = process.env.SMTP_USER || 'sales@azorasolution.com';
const recipient = process.env.SALES_EMAIL || 'sales@azorasolution.com';
const password = process.argv[2] || process.env.SMTP_PASSWORD || process.env.TITAN_PASSWORD || '';
const customPort = process.argv[3] ? Number(process.argv[3]) : (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null);

console.log('====================================================');
console.log('  AZORA SOLUTIONS — TITAN SMTP VERIFICATION TEST');
console.log('====================================================');
console.log(`SMTP Host:      ${host}`);
console.log(`Sender (User):  ${user}`);
console.log(`Recipient:      ${recipient}`);
console.log(`Password Set:   ${password ? 'YES (length: ' + password.length + ')' : 'NO (Missing!)'}`);
console.log('----------------------------------------------------');

if (!password) {
  console.error('\n❌ ERROR: Titan SMTP password is not provided.');
  console.log('\nUsage:');
  console.log('  node test-titan-email.mjs your_password [port]');
  console.log('Example:');
  console.log('  node test-titan-email.mjs Admin@12345 587\n');
  process.exit(1);
}

const portsToTry = customPort ? [customPort] : [465, 587];

async function trySend(port) {
  console.log(`\nAttempting connection on Port ${port} (${port === 465 ? 'SSL' : 'STARTTLS'})...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass: password },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000
  });

  await transporter.verify();
  console.log(`✅ Port ${port}: Connected and authenticated successfully!`);

  console.log('Sending test lead email to ' + recipient + '...');
  const testRef = 'TEST-' + Date.now().toString(36).toUpperCase();

  const info = await transporter.sendMail({
    from: `"Azora Solutions Lead System" <${user}>`,
    to: recipient,
    subject: `🔔 TEST LEAD — Azora Website Quote Test [${testRef}]`,
    text: `This is a verification test from your Azora Solutions website lead system.\n\nTitan SMTP has been successfully configured and verified for ${recipient}.\nTest Reference: ${testRef}\nPort: ${port}\nTimestamp: ${new Date().toISOString()}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0b1320;color:#fff;border-radius:12px;">
        <h2 style="color:#2469EB;margin-top:0;">Azora Solutions — Titan SMTP Working!</h2>
        <p style="color:#cbd5e1;line-height:1.6;">Your Titan Email system on <strong>${recipient}</strong> is now properly receiving lead and quote notifications from your website.</p>
        <div style="background:#162238;padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);margin:20px 0;">
          <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Test Reference:</strong> <span style="color:#2469EB;">${testRef}</span></p>
          <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Port:</strong> ${port}</p>
          <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Sent via:</strong> ${host}:${port} (${user})</p>
          <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Target Inbox:</strong> ${recipient}</p>
          <p style="margin:4px 0;font-size:13px;color:#94a3b8;"><strong>Status:</strong> <span style="color:#10b981;font-weight:bold;">Active & Working</span></p>
        </div>
        <p style="font-size:12px;color:#64748b;">Whenever any customer submits a quote on azorasolution.com, an alert will be sent immediately here.</p>
      </div>
    `
  });

  console.log('----------------------------------------------------');
  console.log('🎉 SUCCESS! Test email sent successfully.');
  console.log('Message ID:  ', info.messageId);
  console.log('Accepted by: ', info.accepted);
  console.log(`\nPlease check your Titan Webmail at https://app.titan.email for ${recipient}!`);
  console.log('====================================================\n');
  return true;
}

let succeeded = false;
for (const port of portsToTry) {
  try {
    await trySend(port);
    succeeded = true;
    break;
  } catch (err) {
    console.error(`❌ Port ${port} Failed:`, err.message);
  }
}

if (!succeeded) {
  console.log('\n====================================================');
  console.log('ℹ️  EXPLANATION FOR LOCAL CONNECTION TIMEOUT:');
  console.log('----------------------------------------------------');
  console.log('1. Pakistani / Home Wi-Fi ISPs (PTCL, Nayatel, etc.) frequently');
  console.log('   block outbound SMTP (Ports 465 & 587) to prevent local PC spam.');
  console.log('2. This only affects your LOCAL computer testing.');
  console.log('3. When deployed to Netlify (or Vercel), the code runs inside');
  console.log('   US/EU cloud datacenters where outbound SMTP to Titan is 100%');
  console.log('   unrestricted and allowed.');
  console.log('====================================================\n');
  process.exit(1);
}
