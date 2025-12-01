# Email System Testing Checklist

## ✅ Completed Steps

1. ✅ **Email function created** - `convex/email.ts` 
2. ✅ **Contact form connected** - Now uses Convex mutations
3. ✅ **Convex functions deployed** - Email action is live
4. ✅ **TypeScript errors fixed** - Code compiles successfully

## 🔧 Setup Steps (If Not Done Yet)

### Step 1: Get Resend API Key
- [ ] Go to [resend.com/api-keys](https://resend.com/api-keys)
- [ ] Create a new API key
- [ ] Copy the key (starts with `re_...`)

### Step 2: Add to Convex Environment Variables
- [ ] Go to [Convex Dashboard](https://dashboard.convex.dev)
- [ ] Select your project (dev or production)
- [ ] Go to **Settings** → **Environment Variables**
- [ ] Add these variables:

```
RESEND_API_KEY = re_xxxxxxxxxxxxx  (your API key)
CONTACT_EMAIL = contact@phugialy.com  (optional, defaults to this)
RESEND_FROM_EMAIL = Portfolio Contact <noreply@phugialy.com>  (optional)
```

**Note:** If you haven't set up a custom domain yet, use:
```
RESEND_FROM_EMAIL = Portfolio Contact <onboarding@resend.dev>
```

### Step 3: Test the Contact Form

1. **Fill out the form:**
   - Go to your contact page
   - Enter your name, email, and a test message
   - Click "Send Message"

2. **Check results:**
   - ✅ Form should show "Message Sent!" success message
   - ✅ Contact should be saved in Convex database
   - ✅ Email notification should arrive in your inbox

3. **Check Convex logs:**
   - Go to Convex Dashboard → Logs
   - Look for `email:sendContactNotification` action
   - Check for any errors

4. **Check Resend logs:**
   - Go to [Resend Dashboard](https://resend.com/emails)
   - Check "Logs" to see if email was sent
   - Check for delivery status

## 🐛 Troubleshooting

### "Email service not configured" error
- **Fix:** Make sure `RESEND_API_KEY` is set in Convex Dashboard

### Form works but no email received
1. Check Resend Dashboard → Logs
2. Check spam folder
3. Verify `CONTACT_EMAIL` is set correctly
4. Check Convex logs for errors

### "Could not find public function" error
- **Fix:** Run `npx convex dev --once` to sync functions
- ✅ Already done! Functions are deployed

## ✅ Next Steps After Testing

Once testing works:
1. Test reply-to functionality (reply to the email)
2. Set up custom domain (optional, for better deliverability)
3. Monitor email delivery rates

---

**Quick Test Command:**
```bash
# Verify Convex functions are deployed
npx convex dev --once
```

If you see "Convex functions ready!" - you're good to go! 🎉

