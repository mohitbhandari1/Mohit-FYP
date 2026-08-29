// Email service using Nodemailer with Gmail SMTP
// Uses Gmail app password for SMTP authentication

import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — emails will log to console only');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    // Dev mode - log email to console
    console.log(`\n📧 [DEV EMAIL — Gmail not configured]`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Preview: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
    console.log(`   📌 Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env to send real emails\n`);
    return { success: true, devMode: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"Smart Connects" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}: "${subject}" (ID: ${info.messageId})`);
    return { success: true, id: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Email send failed: ${errorMessage}`);
    return { success: false, error: { message: errorMessage } };
  }
}

// ─── Email Templates ───

export function verificationCodeEmail(name: string, code: string): { subject: string; html: string } {
  return {
    subject: 'Your Verification Code - Smart Connects',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 10px;">Welcome to Smart Connects! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thanks for creating an account! Please use the verification code below to complete your registration.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: #1e293b; padding: 20px 40px; border-radius: 12px; display: inline-block; border: 2px dashed #22d3ee;">
            <span style="font-size: 36px; font-weight: bold; color: #22d3ee; letter-spacing: 8px; font-family: monospace;">${code}</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #ef4444; text-align: center; margin-top: 20px;">
          ⚠️ This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function passwordResetCodeEmail(name: string, code: string): { subject: string; html: string } {
  return {
    subject: 'Password Reset Code - Smart Connects',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f87171; font-size: 24px; margin-bottom: 10px;">Password Reset Request</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Use the code below to proceed.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: #1e293b; padding: 20px 40px; border-radius: 12px; display: inline-block; border: 2px dashed #f87171;">
            <span style="font-size: 36px; font-weight: bold; color: #f87171; letter-spacing: 8px; font-family: monospace;">${code}</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #ef4444; text-align: center; margin-top: 20px;">
          ⚠️ This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function eventReminderEmail(
  name: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventLocation: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Reminder: ${eventTitle} is tomorrow! ⏰`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 10px;">Event Reminder ⏰</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          This is a friendly reminder that <strong>${eventTitle}</strong> is happening tomorrow!
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="font-size: 15px; margin: 8px 0;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>🕐 Time:</strong> ${eventTime || 'TBA'}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>📍 Location:</strong> ${eventLocation || 'TBA'}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>🏢 Community:</strong> ${communityName}</p>
        </div>
        <p style="font-size: 14px; color: #94a3b8; text-align: center;">
          Don't forget to add this event to your calendar!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #f59e0b; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Event Details</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function communityJoinedEmail(
  name: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Welcome to ${communityName}! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 10px;">Welcome to the Community! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          You've successfully joined <strong>${communityName}</strong>! You're now a member of this community.
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="font-size: 15px; margin: 0 0 8px 0;"><strong>What's next?</strong></p>
          <p style="font-size: 14px; margin: 0; color: #94a3b8; line-height: 1.6;">
            • Browse upcoming events<br>
            • Join discussions with other members<br>
            • Stay updated with announcements
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #22c55e; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Community</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function communityLeftEmail(
  name: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `You left ${communityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #64748b; font-size: 24px; margin-bottom: 10px;">You've Left the Community</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          You've successfully left <strong>${communityName}</strong>.
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #64748b;">
          <p style="font-size: 14px; margin: 0; color: #94a3b8; line-height: 1.6;">
            You won't receive community announcements or event notifications from this community anymore.
          </p>
        </div>
        <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-top: 20px;">
          Changed your mind? You can always rejoin the community.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #64748b; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Browse Communities</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function applicationSubmittedEmail(
  name: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Application Submitted: ${communityName} 📋`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 10px;">Application Received! 📋</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for applying to start <strong>${communityName}</strong> on Smart Connects!
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22d3ee;">
          <p style="font-size: 15px; margin: 0 0 8px 0;"><strong>Community:</strong> ${communityName}</p>
          <p style="font-size: 15px; margin: 0;"><strong>Status:</strong> <span style="color: #f59e0b;">Under Review</span></p>
        </div>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Our team will review your application shortly. You'll receive an email once it's approved or if we need additional information.
        </p>
        <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 20px;">
          This usually takes 1-2 business days.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

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
        ${notes
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

// ─── RSVP & Event Email Templates ───

export function rsvpConfirmationEmail(
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `You're Attending: ${eventTitle}! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 10px;">You're Going! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          You've successfully registered for <strong>${eventTitle}</strong>! Here are the details:
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 15px; margin: 8px 0;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>📍 Location:</strong> ${eventLocation || 'TBA'}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>🏢 Community:</strong> ${communityName}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">
          We look forward to seeing you there! Add this event to your calendar so you don't forget.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #22d3ee; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Event</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function rsvpDocumentPendingEmail(
  name: string,
  eventTitle: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Document Under Review: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 10px;">Document Under Review 📋</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for registering for <strong>${eventTitle}</strong>! Your verification document has been received and is currently under review by the event organizer.
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="font-size: 15px; margin: 0;">
            <strong>⏳ Status:</strong> <span style="color: #f59e0b;">Pending Review</span>
          </p>
          <p style="font-size: 14px; margin: 10px 0 0 0; color: #94a3b8;">
            The organizer of <strong>${communityName}</strong> will review your document shortly. You'll receive an email once it's approved or if additional information is needed.
          </p>
        </div>
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          You can also check the status on the event page.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function rsvpDocumentApprovedEmail(
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Registration Confirmed: ${eventTitle}! ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 10px;">Registration Confirmed! ✅</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Great news! Your document has been approved and your registration for <strong>${eventTitle}</strong> is now confirmed!
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="font-size: 15px; margin: 8px 0;"><strong>📅 Date:</strong> ${eventDate}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>📍 Location:</strong> ${eventLocation || 'TBA'}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>🏢 Community:</strong> ${communityName}</p>
          <p style="font-size: 15px; margin: 8px 0;"><strong>✅ Status:</strong> <span style="color: #22c55e;">Approved & Confirmed</span></p>
        </div>
        <p style="font-size: 14px; color: #94a3b8; text-align: center;">
          We look forward to seeing you there! Don't forget to add this event to your calendar.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #22c55e; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Event</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function answerVerifiedEmail(
  name: string,
  eventTitle: string,
  questionText: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Answer Approved: ${eventTitle} ✅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 10px;">Answer Approved! ✅</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your answer to a registration question for <strong>${eventTitle}</strong> has been approved by the organizer.
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="font-size: 15px; margin: 0 0 8px 0;"><strong>Question:</strong></p>
          <p style="font-size: 14px; margin: 0; color: #94a3b8;">${questionText}</p>
          <p style="font-size: 15px; margin: 12px 0 0 0;"><strong>Status:</strong> <span style="color: #22c55e;">Approved</span></p>
        </div>
        <p style="font-size: 14px; color: #64748b; text-align: center;">
          Your registration for this event is progressing. You'll be notified of any further updates.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function answerRejectedEmail(
  name: string,
  eventTitle: string,
  questionText: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Answer Update Needed: ${eventTitle} 📝`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f87171; font-size: 24px; margin-bottom: 10px;">Answer Update Needed 📝</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          After reviewing your submission for <strong>${eventTitle}</strong>, the organizer has requested an update to one of your answers.
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f87171;">
          <p style="font-size: 15px; margin: 0 0 8px 0;"><strong>Question:</strong></p>
          <p style="font-size: 14px; margin: 0; color: #94a3b8;">${questionText}</p>
          <p style="font-size: 15px; margin: 12px 0 0 0;"><strong>Status:</strong> <span style="color: #f87171;">Needs Update</span></p>
        </div>
        <p style="font-size: 14px; color: #94a3b8; text-align: center;">
          Please visit the event page to update your answer or contact the organizer of <strong>${communityName}</strong> for more details.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function rsvpDocumentRejectedEmail(
  name: string,
  eventTitle: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Document Update Needed: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f87171; font-size: 24px; margin-bottom: 10px;">Document Update Needed 📝</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          After reviewing your submission for <strong>${eventTitle}</strong>, the organizer has requested an update to your verification document.
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f87171;">
          <p style="font-size: 15px; margin: 0;">
            <strong>❌ Status:</strong> <span style="color: #f87171;">Document Rejected</span>
          </p>
          <p style="font-size: 14px; margin: 10px 0 0 0; color: #94a3b8;">
            Please visit the event page to re-submit your document or contact the organizer of <strong>${communityName}</strong> for more details.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #f87171; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Event</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

// ─── Membership Application Emails ───

export function membershipApprovedEmail(
  name: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Membership Approved - ${communityName} 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 10px;">Membership Approved! 🎉</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Great news! Your membership application for <strong>${communityName}</strong> has been <strong style="color: #22c55e;">approved</strong>!
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <p style="font-size: 15px; margin: 0 0 8px 0;"><strong>🏢 Community:</strong> ${communityName}</p>
          <p style="font-size: 15px; margin: 0;"><strong>✅ Status:</strong> <span style="color: #22c55e;">Approved</span></p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          You are now an official member of this organization. Welcome aboard!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #22c55e; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Community</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function membershipRejectedEmail(
  name: string,
  communityName: string,
  notes?: string
): { subject: string; html: string } {
  return {
    subject: `Membership Application Update - ${communityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #f87171; font-size: 24px; margin-bottom: 10px;">Application Update</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for your interest in <strong>${communityName}</strong>. After careful review, we are unable to approve your membership application at this time.
        </p>
        ${notes
          ? `<div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f87171;"><p style="font-size: 14px; margin: 0; color: #94a3b8;"><strong>Admin Notes:</strong><br/>${notes}</p></div>`
          : ''
        }
        <p style="font-size: 16px; line-height: 1.6;">
          You are welcome to submit a new application with updated information.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #f87171; color: #0f172a; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reapply</a>
        </div>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}

export function membershipSubmittedEmail(
  name: string,
  communityName: string
): { subject: string; html: string } {
  return {
    subject: `Membership Application Received - ${communityName} 📋`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #22d3ee; font-size: 24px; margin-bottom: 10px;">Application Received! 📋</h1>
        <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for applying to become a member of <strong>${communityName}</strong>!
        </p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22d3ee;">
          <p style="font-size: 15px; margin: 0 0 8px 0;"><strong>🏢 Community:</strong> ${communityName}</p>
          <p style="font-size: 15px; margin: 0;"><strong>Status:</strong> <span style="color: #f59e0b;">Under Review</span></p>
        </div>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Our team will review your application shortly. You'll receive an email once it's approved or if we need additional information.
        </p>
        <hr style="border: 1px solid #1e293b; margin: 30px 0;" />
        <p style="font-size: 13px; color: #64748b; text-align: center;">Smart Connects - Community & Event Discovery Platform</p>
      </div>
    `,
  };
}
