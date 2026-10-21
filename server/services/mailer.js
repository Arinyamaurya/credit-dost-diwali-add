const nodemailer = require('nodemailer');
const { escapeHtml } = require('../utils/validate');
const { getPrice, formatInr } = require('../config/pricing');

function getOfferTitle(kind) {
  const price = getPrice(kind);
  const amount = price.gstPaise > 0
    ? `${formatInr(price.basePaise)} + GST = ${formatInr(price.totalPaise)}`
    : formatInr(price.totalPaise);
  return `${price.label} (${amount})`;
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}

async function sendLeadNotifications(lead) {
  const mailer = getTransporter();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!mailer || !adminEmail) {
    return; // SMTP not configured; silently skip without throwing
  }

  const sender = process.env.SMTP_USER;
  const offerTitle = getOfferTitle(lead.kind);
  const amountText = formatInr(getPrice(lead.kind).totalPaise);

  const safeName = escapeHtml(lead.name);
  const safeEmail = escapeHtml(lead.email);
  const safeCity = escapeHtml(lead.city);
  const safePin = escapeHtml(lead.pin);
  const safeMobile = escapeHtml(lead.mobile);

  // 1. Admin Email Alert
  const adminMailOptions = {
    from: `"Credit Dost Diwali" <${sender}>`,
    to: adminEmail,
    subject: `🪔 New Diwali Spot Claimed: ${lead.name} (${offerTitle})`,
    text: `New Diwali Offer Spot Claimed:\n\n` +
      `Offer: ${offerTitle}\n` +
      `Lead ID: ${lead._id || lead.id}\n` +
      `Name: ${lead.name}\n` +
      `Mobile: ${lead.mobile}\n` +
      `Email: ${lead.email}\n` +
      `City: ${lead.city}\n` +
      `PIN: ${lead.pin}\n` +
      `IP: ${lead.ip}\n` +
      `Time: ${new Date(lead.createdAt || Date.now()).toISOString()}\n`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #140a30; color: #fffdf8; border-radius: 12px; border: 1px solid #e9b949;">
        <h2 style="color: #f7c948; margin-top: 0;">🪔 New Diwali Spot Claimed!</h2>
        <p style="color: #ffe29a; font-weight: bold; font-size: 16px;">${offerTitle}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #fffdf8;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #2c1a66; color: #f7c948;">Full Name:</td><td style="padding: 8px; border-bottom: 1px solid #2c1a66;"><strong>${safeName}</strong></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #2c1a66; color: #f7c948;">Mobile:</td><td style="padding: 8px; border-bottom: 1px solid #2c1a66;"><a href="tel:${safeMobile}" style="color: #ffe29a;">${safeMobile}</a></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #2c1a66; color: #f7c948;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #2c1a66;"><a href="mailto:${safeEmail}" style="color: #ffe29a;">${safeEmail}</a></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #2c1a66; color: #f7c948;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #2c1a66;">${safeCity} (${safePin})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #2c1a66; color: #f7c948;">Lead ID:</td><td style="padding: 8px; border-bottom: 1px solid #2c1a66;"><code>${lead._id || lead.id}</code></td></tr>
          <tr><td style="padding: 8px; color: #f7c948;">IP:</td><td style="padding: 8px;">${escapeHtml(lead.ip || 'unknown')}</td></tr>
        </table>
      </div>
    `,
  };

  try {
    await mailer.sendMail(adminMailOptions);
  } catch (err) {
    console.error('Email alert delivery error (admin):', err.message);
  }

  // 2. Optional Confirmation Email to User
  try {
    const userMailOptions = {
      from: `"Credit Dost" <${sender}>`,
      to: lead.email,
      subject: `🪔 Your Diwali Festive Spot is Reserved — Credit Dost`,
      text: `Hello ${lead.name},\n\n` +
        `Greetings from Credit Dost! We have received your festive registration for "${offerTitle}".\n\n` +
        `Your Spot ID: ${lead._id || lead.id}\n` +
        `Amount: ${amountText}\n\n` +
        `Our team will reach out to you shortly at ${lead.mobile}.\n\n` +
        `Wishing you and your family a very happy and prosperous Diwali!\n` +
        `Team Credit Dost`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #140a30; color: #fffdf8; border-radius: 12px; border: 1px solid #e9b949;">
          <h2 style="color: #f7c948; margin-top: 0;">शुभ दीपावली, ${safeName}!</h2>
          <p style="color: #ffe29a; font-size: 15px;">Your festive spot has been successfully reserved with Credit Dost.</p>
          <div style="background-color: rgba(255,255,255,0.06); padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(247,201,72,0.3);">
            <p style="margin: 0 0 8px 0; color: #f7c948; font-weight: bold;">Offer: ${offerTitle}</p>
            <p style="margin: 0; color: #fffdf8;">Reference ID: <strong>${lead._id || lead.id}</strong></p>
          </div>
          <p style="font-size: 14px; color: #f6f1e6; line-height: 1.6;">
            Our festive consulting team will get in touch with you shortly at <strong>+91 ${safeMobile}</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="font-size: 12px; color: #8e88aa; margin: 0;">
            Credit Dost • Diwali Special Edition • Building financial freedom across India.
          </p>
        </div>
      `,
    };

    await mailer.sendMail(userMailOptions);
  } catch (err) {
    console.error('Email alert delivery error (user):', err.message);
  }
}

/**
 * Payment receipt to the customer plus a "payment received" alert to admin.
 */
async function sendPaymentConfirmation(lead) {
  const mailer = getTransporter();
  if (!mailer || !lead) return;

  const sender = process.env.SMTP_USER;
  const adminEmail = process.env.ADMIN_EMAIL;
  const price = getPrice(lead.kind);
  const basePaise = (lead.amountPaise || price.totalPaise) - (lead.gstPaise ?? price.gstPaise);
  const gstPaise = lead.gstPaise ?? price.gstPaise;
  const totalPaise = lead.amountPaise || price.totalPaise;
  const safeName = escapeHtml(lead.name);
  const safePaymentId = escapeHtml(lead.razorpayPaymentId || lead.paymentRef || '');
  const leadId = lead._id || lead.id;

  const gstRowHtml = gstPaise > 0
    ? `<tr><td style="padding: 6px 0; color: #f7c948;">GST (18%):</td><td style="padding: 6px 0; text-align: right;">${formatInr(gstPaise)}</td></tr>`
    : '';

  try {
    await mailer.sendMail({
      from: `"Credit Dost" <${sender}>`,
      to: lead.email,
      subject: `✅ Payment received — ${price.label} | Credit Dost`,
      text: `Hello ${lead.name},\n\n` +
        `We have received your payment for "${price.label}".\n\n` +
        `Amount: ${formatInr(basePaise)}` + (gstPaise > 0 ? ` + GST ${formatInr(gstPaise)}` : '') + ` = ${formatInr(totalPaise)}\n` +
        `Payment ID: ${lead.razorpayPaymentId || lead.paymentRef}\n` +
        `Reference ID: ${leadId}\n\n` +
        `Thank you for your payment! A member of our team will contact you at ${lead.mobile} within 24 hours.\n\n` +
        `Wishing you a very happy and prosperous Diwali!\n` +
        `Team Credit Dost`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #140a30; color: #fffdf8; border-radius: 12px; border: 1px solid #e9b949;">
          <h2 style="color: #f7c948; margin-top: 0;">Payment received, ${safeName}!</h2>
          <p style="color: #ffe29a; font-size: 15px;">Thank you — your ${escapeHtml(price.label)} is confirmed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #fffdf8;">
            <tr><td style="padding: 6px 0; color: #f7c948;">Offer price:</td><td style="padding: 6px 0; text-align: right;">${formatInr(basePaise)}</td></tr>
            ${gstRowHtml}
            <tr><td style="padding: 6px 0; color: #f7c948; border-top: 1px solid #2c1a66;"><strong>Total paid:</strong></td><td style="padding: 6px 0; text-align: right; border-top: 1px solid #2c1a66;"><strong>${formatInr(totalPaise)}</strong></td></tr>
          </table>
          <p style="margin: 0 0 4px 0;">Payment ID: <code>${safePaymentId}</code></p>
          <p style="margin: 0;">Reference ID: <code>${leadId}</code></p>
          <p style="font-size: 14px; color: #f6f1e6; line-height: 1.6;">
            Thank you for your payment! A member of our team will contact you at <strong>+91 ${escapeHtml(lead.mobile)}</strong> within 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="font-size: 12px; color: #8e88aa; margin: 0;">
            Credit Dost • Diwali Special Edition • Building financial freedom across India.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Payment email delivery error (user):', err.message);
  }

  if (adminEmail) {
    await sendPaymentAdminAlert(lead, {
      subject: `💰 Payment received: ${lead.name} (${formatInr(totalPaise)})`,
      detail: `Payment ${lead.razorpayPaymentId || lead.paymentRef} captured via ${lead.paymentSource || 'unknown'}.`,
    });
  }
}

/**
 * Plain-text operational alert to admin (payments, mismatches, duplicates).
 */
async function sendPaymentAdminAlert(lead, { subject, detail }) {
  const mailer = getTransporter();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!mailer || !adminEmail || !lead) return;

  try {
    await mailer.sendMail({
      from: `"Credit Dost Payments" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject,
      text: `${detail}\n\n` +
        `Offer: ${getOfferTitle(lead.kind)}\n` +
        `Lead ID: ${lead._id || lead.id}\n` +
        `Name: ${lead.name}\n` +
        `Mobile: ${lead.mobile}\n` +
        `Email: ${lead.email}\n` +
        `Order ID: ${lead.razorpayOrderId || '-'}\n` +
        `Payment ID: ${lead.razorpayPaymentId || lead.paymentRef || '-'}\n` +
        `Status: ${lead.status}\n`,
    });
  } catch (err) {
    console.error('Payment email delivery error (admin):', err.message);
  }
}

module.exports = { sendLeadNotifications, sendPaymentConfirmation, sendPaymentAdminAlert };
