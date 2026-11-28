import { NextRequest, NextResponse } from 'next/server';
import { parseJsonObject } from '@/lib/auth/request';
import { extractClientIp, isRateLimited } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = extractClientIp(request);
  if (await isRateLimited(`contact:ip:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Too many contact submissions. Please wait a minute before trying again.' },
      { status: 429 }
    );
  }

  const parsed = await parseJsonObject(request);
  if ('error' in parsed) return parsed.error;

  try {
    const name = typeof parsed.data.name === 'string' ? parsed.data.name.trim() : '';
    const email = typeof parsed.data.email === 'string' ? parsed.data.email.trim() : '';
    const subject = typeof parsed.data.subject === 'string' ? parsed.data.subject.trim() : '';
    const message = typeof parsed.data.message === 'string' ? parsed.data.message.trim() : '';

    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Valid name is required (max 120 chars).' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }
    if (!message || message.length < 10 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 5,000 characters.' },
        { status: 400 }
      );
    }

    const safeSubject = subject.replace(/[\r\n]+/g, ' ').slice(0, 120) || 'General Inquiry';
    const hasResend =
      process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder');

    if (hasResend) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'support@veralm.com',
          to: process.env.CONTACT_TO_EMAIL || 'support@veralm.com',
          reply_to: email,
          subject: `[VeraLM Contact] ${safeSubject} from ${name.replace(/[\r\n]+/g, ' ')}`,
          text: `Name: ${name}\nEmail: ${email}\nSubject: ${safeSubject}\n\n${message}`,
        }),
      });

      if (!res.ok) {
        console.error('[Contact API] Resend error:', await res.text());
        return NextResponse.json({ error: 'Failed to send message.' }, { status: 502 });
      }
    } else {
      console.log('[Contact Form Received]', { name, email, subject: safeSubject });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Contact API] Error:', error);
    return NextResponse.json({ error: 'Unable to send message right now.' }, { status: 500 });
  }
}
