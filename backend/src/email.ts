// Email service using Node.js built-in fetch (Node 18+)
// Falls back to console.log when no API key is configured (development mode)
//
// To send real emails:
// 1. Sign up at https://resend.com
// 2. Verify a domain (e.g., yourdomain.com)
// 3. Create an API key in the Resend dashboard
// 4. Set RESEND_API_KEY and FROM_EMAIL in backend/.env
//    Example:
//      RESEND_API_KEY=re_xxxxxxxxxxxx
//      FROM_EMAIL=noreply@your-verified-domain.com

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    // Dev mode - log email to console
    console.log(`\n\u{1F4E7} [DEV EMAIL — No RESEND_API_KEY set]`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Preview: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
    console.log(`   \u{1F4CE} To send real emails, set RESEND_API_KEY and FROM_EMAIL in backend/.env`);
    console.log(`      Get a free API key at https://resend.com\n`);
    return { success: true, devMode: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Smart Connects <${FROM_EMAIL}>`,
        to,
        subject,
        html,
      }),
    });

    // Parse response body safely (Resend may return non-JSON on some errors)
    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = { rawBody: await response.text().catch(() => 'Unable to read response body') };
    }

    if (!response.ok) {
      const errorMessage = data.message || data.error?.message || JSON.stringify(data);
      const errorCode = data.statusCode || data.name || 'UNKNOWN';
      console.error(`\u{274C} Resend API error [${response.status}] (${errorCode}): ${errorMessage}`);
      console.error(`   Full response:`, JSON.stringify(data, null, 2));
      return {
        success: false,
        error: {
          status: response.status,
          code: errorCode,
          message: errorMessage,
        },
      };
    }

    console.log(`\u2705 Email sent successfully to ${to}: "${subject}" (ID: ${data.id})`);
    return { success: true, id: data.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\u{274C} Email send failed — network or unexpected error:`);
    console.error(`   ${errorMessage}`);
    return { success: false, error: { message: errorMessage } };
  }
}

// ─── Email Templates ───

export function applicationApprovedEmail(
  name: string,
  communityName: string,
  tempPassword: string
): { subject: string; html: string } {
  return {
    subject: `Application Approved - ${communityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 10px;">Application Approved! 🎉</h1>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Smart Connects</p>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your application to start <strong>${communityName}</strong> has been approved! You are now a community organizer.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">Here are your login credentials:</p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 15px; margin: 5px 0;"><strong>Username:</strong> Your email address</p>
          <p style="font-size: 15px; margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #0f172a; padding: 4px 8px; border-radius: 4px; color: #22d3ee;">${tempPassword}</code></p>
        </div>
        <p style="font-size: 14px; color: #ef4444;">⚠️ You will be required to change this password on your first login.</p>
        <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
          <a href="${FRONTEND_URL}/login" style="display: inline-block; background: #22d3ee; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Log In Now</a>
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function verificationEmail(name: string, token: string): { subject: string; html: string } {
  const verificationLink = `${FRONTEND_URL}/verify-email?token=${token}`;
  return {
    subject: 'Verify your email - Smart Connects',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 10px;">Welcome to Smart Connects! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thanks for creating an account! Please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="display: inline-block; background: #22d3ee; color: #0f172a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          Or copy this link into your browser:<br/>
          <a href="${verificationLink}" style="color: #22d3ee;">${verificationLink}</a>
        </p>
        <p style="font-size: 14px; color: #ef4444; text-align: center; margin-top: 20px;">
          This link expires in 24 hours.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, token: string): { subject: string; html: string } {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
  return {
    subject: 'Reset your password - Smart Connects',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f87171; font-size: 24px; margin-bottom: 10px;">Password Reset Request</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new one.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background: #f87171; color: #0f172a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          Or copy this link into your browser:<br/>
          <a href="${resetLink}" style="color: #f87171;">${resetLink}</a>
        </p>
        <p style="font-size: 14px; color: #ef4444; text-align: center; margin-top: 20px;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function applicationRejectedEmail(
  name: string,
  communityName: string,
  notes: string
): { subject: string; html: string } {
  return {
    subject: `Application Update - ${communityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f87171; font-size: 24px; margin-bottom: 10px;">Application Update</h1>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Smart Connects</p>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for your interest in starting <strong>${communityName}</strong>.
          After careful review, we are unable to approve your application at this time.
        </p>
        ${
          notes
            ? `<p style="font-size: 15px; line-height: 1.6; background: #1e293b; padding: 16px; border-radius: 8px;"><strong>Admin Notes:</strong><br/>${notes}</p>`
            : ''
        }
        <p style="font-size: 16px; line-height: 1.6;">
          You are welcome to submit a new application with updated information.
          <a href="${FRONTEND_URL}/apply" style="color: #22d3ee; text-decoration: underline;">Submit a new application</a>
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}
