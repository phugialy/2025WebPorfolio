# Google OAuth Redirect URIs - Complete List

## Required Redirect URIs for Your App

Copy and paste these **exact** URIs into Google Cloud Console:

### Development (Local)
```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
http://localhost:3002/api/auth/callback/google
```

### Production (Vercel)
```
https://2025-web-porfolio-git-master-phulys-projects.vercel.app/api/auth/callback/google
```

**Note:** If you have a custom domain, also add:
```
https://your-custom-domain.com/api/auth/callback/google
```

## Quick Setup Steps

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Scroll to "Authorized redirect URIs"
4. **Delete** any URIs that don't end with `/callback/google`
5. **Add** all the URIs listed above
6. Click "Save"
7. Wait 1-2 minutes for changes to propagate

## Important Notes

- ✅ **MUST** end with `/callback/google`
- ✅ **MUST** match exactly (including `http://` vs `https://`)
- ✅ **MUST** include the port number for localhost
- ❌ **DO NOT** use `/callback` without `/google`
- ❌ **DO NOT** use `/api/auth` without `/callback/google`

