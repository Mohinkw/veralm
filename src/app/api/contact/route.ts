import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hasResend =
      process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("placeholder");

    if (hasResend) {
      // Send via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "support@veralm.com",
          to: process.env.CONTACT_TO_EMAIL || "support@veralm.com",
          reply_to: email,
          subject: `[VeraLM Contact] ${subject || "General Inquiry"} from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        }),
      });

      if (!res.ok) {
        console.error("Resend API error:", await res.text());
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
      }
    } else {
      // No Resend configured — log to console (dev mode)
      console.log("[Contact Form]", { name, email, subject, message });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Contact API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
