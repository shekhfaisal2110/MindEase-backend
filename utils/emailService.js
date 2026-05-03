// const SibApiV3Sdk = require('sib-api-v3-sdk');

// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// let brevoActivated = true;
// let defaultClient = null;

// const initBrevo = () => {
//   if (!defaultClient && process.env.NODE_ENV === 'production' && process.env.BREVO_API_KEY) {
//     defaultClient = SibApiV3Sdk.ApiClient.instance;
//     const apiKey = defaultClient.authentications['api-key'];
//     apiKey.apiKey = process.env.BREVO_API_KEY;
//   }
// };

// const sendOTPEmail = async (toEmail, otp, username) => {
//   // Development or known inactive → log only
//   if (!brevoActivated || process.env.NODE_ENV !== 'production') {
//     console.log(`\n🔐 OTP for ${toEmail} is: ${otp}\n`);
//     return;
//   }

//   initBrevo();

//   const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
//   const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

//   sendSmtpEmail.subject = 'Your OTP for MindEase';
//   sendSmtpEmail.sender = {
//     name: 'MindEase',
//     email: process.env.BREVO_SENDER_EMAIL,
//   };
//   sendSmtpEmail.to = [{ email: toEmail, name: username }];

//   // Professional, attractive HTML email
//   sendSmtpEmail.htmlContent = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>MindEase OTP</title>
//       <style>
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         body {
//           font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//           background-color: #f4f6fc;
//           margin: 0;
//           padding: 0;
//         }
//         .container {
//           max-width: 520px;
//           margin: 0 auto;
//           background: #ffffff;
//           border-radius: 28px;
//           box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.05);
//           overflow: hidden;
//         }
//         .header {
//           background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
//           padding: 32px 24px;
//           text-align: center;
//         }
//         .header h1 {
//           margin: 0;
//           font-size: 28px;
//           font-weight: 700;
//           color: white;
//           letter-spacing: -0.3px;
//         }
//         .content {
//           padding: 40px 32px 32px;
//         }
//         .greeting {
//           font-size: 20px;
//           font-weight: 600;
//           color: #1e293b;
//           margin-bottom: 12px;
//         }
//         .message {
//           color: #475569;
//           line-height: 1.5;
//           margin-bottom: 28px;
//         }
//         .otp-box {
//           background: #f8fafc;
//           border: 1px solid #e2e8f0;
//           border-radius: 20px;
//           padding: 20px;
//           text-align: center;
//           margin: 24px 0;
//         }
//         .otp-code {
//           font-size: 48px;
//           font-weight: 800;
//           letter-spacing: 8px;
//           color: #4F46E5;
//           font-family: monospace;
//           background: white;
//           display: inline-block;
//           padding: 12px 24px;
//           border-radius: 60px;
//           box-shadow: 0 2px 6px rgba(0,0,0,0.05);
//         }
//         .validity {
//           font-size: 13px;
//           color: #64748b;
//           margin-top: 12px;
//         }
//         .footer {
//           background: #f1f5f9;
//           padding: 24px;
//           text-align: center;
//           border-top: 1px solid #e2e8f0;
//         }
//         .footer p {
//           margin: 0;
//           font-size: 13px;
//           color: #64748b;
//         }
//         .button {
//           background: #4F46E5;
//           color: white;
//           text-decoration: none;
//           padding: 12px 28px;
//           border-radius: 40px;
//           font-weight: 500;
//           display: inline-block;
//           margin-top: 8px;
//         }
//         @media (max-width: 560px) {
//           .content { padding: 28px 20px; }
//           .otp-code { font-size: 36px; letter-spacing: 4px; }
//         }
//       </style>
//     </head>
//     <body style="margin:0;padding:20px 12px;background:#f4f6fc">
//       <div class="container">
//         <div class="header">
//           <h1>🌿 MindEase</h1>
//         </div>
//         <div class="content">
//           <div class="greeting">Hello ${escapeHtml(username)},</div>
//           <div class="message">
//             You’re one step away from a calmer mind. Use the secure code below to verify your account.
//           </div>
//           <div class="otp-box">
//             <div class="otp-code">${otp}</div>
//             <div class="validity">⏱️ Valid for 10 minutes</div>
//           </div>
//           <div class="message" style="font-size:14px">
//             If you didn’t request this, you can safely ignore this email.
//           </div>
//         </div>
//         <div class="footer">
//           <p>© MindEase — Your daily mental health companion</p>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;

//   // Plain‑text version (for email clients that disable HTML)
//   sendSmtpEmail.textContent = `
//     Hello ${username},\n\nYour verification OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\n— MindEase, your mental health companion
//   `;

//   try {
//     const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
//     console.log(`✅ OTP email sent to ${toEmail}`, data.messageId);
//   } catch (error) {
//     const errMsg = error.response?.body?.message || error.message;
//     if (errMsg && errMsg.includes('not yet activated')) {
//       console.warn('⚠️ Brevo not activated – falling back to console logging.');
//       brevoActivated = false;
//       console.log(`🔐 OTP for ${toEmail} is: ${otp}`);
//     } else {
//       console.error('Email sending failed:', errMsg);
//       throw new Error('Failed to send OTP email. Check Brevo settings.');
//     }
//   }
// };

// // Helper to prevent HTML injection (though otp is numeric, username may contain characters)
// function escapeHtml(str) {
//   if (!str) return '';
//   return str.replace(/[&<>]/g, function(m) {
//     if (m === '&') return '&amp;';
//     if (m === '<') return '&lt;';
//     if (m === '>') return '&gt;';
//     return m;
//   });
// }

// module.exports = { generateOTP, sendOTPEmail };



















const SibApiV3Sdk = require('sib-api-v3-sdk');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

let brevoActivated = true;
let defaultClient = null;

const initBrevo = () => {
  if (!defaultClient && process.env.BREVO_API_KEY) {
    defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    console.log('✅ Brevo initialized with API key');
  }
};

const sendOTPEmail = async (toEmail, otp, username, type = 'verification') => {
  // If no API key, log only
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️ BREVO_API_KEY not set – OTP logged below.');
    console.log(`🔐 OTP for ${toEmail} (${type}) is: ${otp}`);
    return;
  }

  initBrevo();

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  const subject = type === 'verification' 
    ? 'Verify Your Email – MindEase' 
    : 'Reset Your Password – MindEase';

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.sender = {
    name: 'MindEase',
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@mindease.com',
  };
  sendSmtpEmail.to = [{ email: toEmail, name: username }];

  // Full HTML template (well-styled, mobile-friendly)
  sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6fc;
      margin: 0;
      padding: 20px 12px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: white;
      letter-spacing: -0.3px;
    }
    .content {
      padding: 40px 32px 32px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .message {
      color: #475569;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .otp-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #4F46E5;
      font-family: monospace;
      background: white;
      display: inline-block;
      padding: 12px 24px;
      border-radius: 60px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    .validity {
      font-size: 13px;
      color: #64748b;
      margin-top: 12px;
    }
    .footer {
      background: #f1f5f9;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    @media (max-width: 560px) {
      .content { padding: 28px 20px; }
      .otp-code { font-size: 36px; letter-spacing: 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌿 MindEase</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${escapeHtml(username)},</div>
      <div class="message">
        ${type === 'verification' 
          ? 'You’re one step away from a calmer mind. Use the secure code below to verify your account.'
          : 'We received a request to reset your password. Use the OTP below to continue.'}
      </div>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="validity">⏱️ Valid for 10 minutes</div>
      </div>
      <div class="message" style="font-size:14px">
        If you didn’t request this, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>© MindEase — Your daily mental health companion</p>
    </div>
  </div>
</body>
</html>
  `;

  sendSmtpEmail.textContent = `Hello ${username},\n\n${type === 'verification' ? 'Your verification OTP' : 'Your password reset OTP'} is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\n— MindEase`;

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ OTP email sent to ${toEmail} (${type})`, data.messageId);
  } catch (error) {
    const errMsg = error.response?.body?.message || error.message;
    console.error(`❌ Failed to send email to ${toEmail}:`, errMsg);
    if (errMsg && errMsg.includes('not yet activated')) {
      console.warn('⚠️ Brevo account not activated – falling back to console OTP');
      brevoActivated = false;
    }
    // Always log OTP to console as fallback
    console.log(`🔐 FALLBACK OTP for ${toEmail} (${type}) is: ${otp}`);
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

module.exports = { generateOTP, sendOTPEmail };