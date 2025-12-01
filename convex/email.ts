import { action } from "./_generated/server";
import { v } from "convex/values";

// Declare globals for TypeScript (Convex provides these at runtime)
declare const process: { env: { [key: string]: string | undefined } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const fetch: (url: string, options?: any) => Promise<any>;

/**
 * Send email notification for contact form submission
 * Uses Resend API to send emails
 */
export const sendContactNotification = action({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      // In Convex, we can't use console.warn, so we'll just return an error
      return { success: false, error: "Email service not configured" };
    }

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const safeName = escapeHtml(args.name);
    const safeEmail = escapeHtml(args.email);
    const safeMessage = escapeHtml(args.message).replace(/\n/g, "<br>");

    try {
      // Send email using Resend API
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>",
          to: process.env.CONTACT_EMAIL || "contact@phugialy.com",
          subject: `New Contact Form Submission from ${safeName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Contact Form Submission</h2>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
              </div>
              
              <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Message:</h3>
                <p style="white-space: pre-wrap; line-height: 1.6;">${safeMessage}</p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>You can reply directly to this email to respond to ${safeName}.</p>
              </div>
            </div>
          `,
          reply_to: args.email, // Allow reply-to to send directly to the sender
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        // Log error details for debugging (will appear in Convex dashboard logs)
        return { success: false, error: "Failed to send email", details: errorData };
      }

      const data = await response.json();
      return { success: true, id: data.id };
    } catch (error) {
      // Return error details for debugging
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

