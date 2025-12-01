# Email System Setup Guide

## Overview
The contact form now sends email notifications using **Resend**, a modern email API service.

## How It Works

1. **User submits contact form** → Saves to Convex database
2. **Email notification sent** → You receive an email at your configured address
3. **Reply-to configured** → You can reply directly to the email to respond to the sender

## Setup Steps

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Get Your API Key
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Portfolio Contact Form")
4. Copy the API key (you won't see it again!)

### 3. Set Up Domain (Optional but Recommended)
For production, you should verify your domain:
1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain (e.g., `phugialy.com`)
3. Add the DNS records provided by Resend
4. Wait for verification (usually a few minutes)

**Note:** For testing, you can use the default `onboarding@resend.dev` sender (limited to receiving emails only).

### 4. Configure Environment Variables

#### For Local Development (.env.local)
```env
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email address to receive contact form submissions
CONTACT_EMAIL=contact@phugialy.com

# From email address (must be verified domain or use onboarding@resend.dev for testing)
RESEND_FROM_EMAIL=Portfolio Contact <noreply@phugialy.com>
```

#### For Convex (Production)
Set these in your Convex dashboard:

1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - `RESEND_API_KEY` = `re_xxxxxxxxxxxxxxxxxxxxx`
   - `CONTACT_EMAIL` = `contact@phugialy.com`
   - `RESEND_FROM_EMAIL` = `Portfolio Contact <noreply@phugialy.com>`

**Important:** For Convex, environment variables are set in the dashboard, not in `.env` files.

### 5. Test the Contact Form
1. Fill out the contact form on your site
2. Submit it
3. Check your email inbox for the notification
4. Try replying to test reply-to functionality

## Email Template

The email includes:
- **Subject:** "New Contact Form Submission from [Name]"
- **From:** Your configured sender email
- **To:** Your contact email
- **Reply-To:** The sender's email (so you can reply directly)

## Troubleshooting

### Emails Not Sending?

1. **Check Resend API Key**
   - Make sure `RESEND_API_KEY` is set correctly in Convex dashboard
   - Verify the key is active in Resend dashboard

2. **Check Email Addresses**
   - `CONTACT_EMAIL` should be a valid email you own
   - `RESEND_FROM_EMAIL` must use a verified domain (or use `onboarding@resend.dev` for testing)

3. **Check Convex Logs**
   - Go to Convex Dashboard → Logs
   - Look for errors in the `email.sendContactNotification` action
   - Check for "Email service not configured" warnings

4. **Test Resend API**
   - Go to [Resend Dashboard](https://resend.com/emails) → Logs
   - See if emails are being sent
   - Check for any API errors

### Using Test/Development Email

If you haven't set up a custom domain yet, use:
```env
RESEND_FROM_EMAIL=Portfolio Contact <onboarding@resend.dev>
```

**Limitation:** You can only send emails TO your verified email, but reply-to will still work.

## Alternative Email Services

If you prefer a different service:

### SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get API key
3. Update `convex/email.ts` to use SendGrid API instead

### Mailgun
1. Sign up at [mailgun.com](https://mailgun.com)
2. Get API key
3. Update `convex/email.ts` to use Mailgun API

The current implementation uses Resend, but you can modify `convex/email.ts` to use any email service.

## Cost

- **Resend Free Tier:** 100 emails/day, 3,000 emails/month
- **Resend Pro:** $20/month for 50,000 emails
- For a portfolio site, the free tier should be plenty!

## Security

- API keys are stored securely in Convex environment variables
- Never commit API keys to git
- Contact form has honeypot spam protection
- Rate limiting (5 submissions/minute per IP) prevents abuse

## Next Steps

1. ✅ Set up Resend account
2. ✅ Get API key
3. ✅ Add environment variables to Convex
4. ✅ Test contact form
5. ✅ Verify emails are received
6. ✅ (Optional) Set up custom domain for better deliverability

---

## Quick Reference

**Files Modified:**
- `app/contact/page.tsx` - Contact form now uses Convex mutations
- `convex/email.ts` - New email sending action
- `convex/contacts.ts` - Contact storage (already existed)

**Environment Variables Needed:**
- `RESEND_API_KEY` (required)
- `CONTACT_EMAIL` (optional, defaults to contact@phugialy.com)
- `RESEND_FROM_EMAIL` (optional, defaults to onboarding@resend.dev)

