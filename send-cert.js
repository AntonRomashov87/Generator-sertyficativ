// Netlify-функція: надсилає сертифікат PDF-вкладенням через ваш Gmail.
// Пароль додатку і адреса беруться із захищених змінних Netlify:
//   GMAIL_USER     = ваш email, напр. romashov1987@gmail.com
//   GMAIL_APP_PASS = 16-значний пароль додатку (без пробілів)
//
// Нічого секретного в цьому файлі немає — його можна тримати на GitHub.

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  // дозволяємо лише POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    return {
      statusCode: 500,
      body: 'Не налаштовані змінні GMAIL_USER / GMAIL_APP_PASS у Netlify (Site settings → Environment variables).'
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Некоректний JSON у запиті' };
  }

  const { to_email, to_name, tournament_name, cert_type, pdf_base64, filename } = data;

  if (!to_email || !pdf_base64) {
    return { statusCode: 400, body: 'Відсутній to_email або pdf_base64' };
  }

  // транспорт Gmail через пароль додатку
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }
  });

  // тіло листа
  const tournamentLine = tournament_name ? `турніру «${tournament_name}»` : 'турніру';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e2b22;">
      <div style="background:#12211a;color:#d4af37;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">♞ КЗ ДЮСШ "Дебют"</h2>
      </div>
      <div style="padding:24px;background:#f7f5ee;border-radius:0 0 8px 8px;">
        <p>Вітаємо, <b>${escapeHtml(to_name || 'учаснику')}</b>!</p>
        <p>Надсилаємо Вашу грамоту (${escapeHtml(cert_type || 'за участь')}) за результатами ${escapeHtml(tournamentLine)}.</p>
        <p>Сертифікат — у вкладенні до цього листа (файл PDF).</p>
        <p style="margin-top:24px;color:#5a6b5f;font-size:14px;">
          Дякуємо за участь і бажаємо подальших шахових успіхів!<br>
          — Тренерський склад КЗ ДЮСШ "Дебют"
        </p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `КЗ ДЮСШ "Дебют" <${GMAIL_USER}>`,
      to: to_email,
      subject: `Ваша грамота${tournament_name ? ' — ' + tournament_name : ''}`,
      html,
      attachments: [{
        filename: filename || 'certificate.pdf',
        content: pdf_base64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }]
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('sendMail error:', err);
    return { statusCode: 500, body: 'Помилка відправлення: ' + (err.message || err) };
  }
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
