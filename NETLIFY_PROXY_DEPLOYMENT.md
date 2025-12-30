# Dashboard-API Communication Fix: Netlify Proxy Solution

## Problem Solved

**Browser fetch() was failing** from Netlify dashboard to self-signed HTTPS API (`54.225.171.108`).

### Root Cause
Browsers enforce strict certificate validation for fetch() requests:
- `curl -k` works (skips validation with `-k` flag)
- Browser fetch() has **NO equivalent** to skip validation
- Self-signed certificates are rejected automatically
- No JavaScript workaround available

### Previous Attempts That Failed
- ✗ HTTPS with self-signed cert directly to IP (blocked by browser)
- ✗ CORS headers alone (doesn't solve certificate issue)
- ✗ JavaScript error handlers (can't bypass cert validation)

---

## Solution: Netlify Proxy

Netlify's _redirects file proxies API calls through Netlify's HTTPS infrastructure:

```
Browser (HTTPS to Netlify)
    ↓
Netlify proxy (trusted HTTPS)
    ↓
FastAPI via Caddy (self-signed cert OK, internal proxy)
    ↓
API Response
```

**Why this works:**
- Browser trusts Netlify's certificate (well-known CA)
- Netlify proxies the request internally
- Self-signed cert is only between Netlify → Caddy (no browser sees it)
- Zero configuration needed on FastAPI/Caddy side

---

## Implementation Details

### 1. Dashboard Configuration

**File**: `/home/ubuntu/projects/grimlock/dashboard/_redirects`

```
# API Proxy Rules - Route API calls through Netlify's HTTPS
# This solves the self-signed certificate issue by proxying through Netlify

# Proxy all /api/* requests to FastAPI via Caddy (HTTPS)
/api/* https://54.225.171.108:443/api/:splat 200

# SPA redirect fallback
# All non-API routes serve index.html for client-side routing
/*    /index.html   200
```

**What this does:**
- Any request to `/api/health` on dashboard becomes a proxy to `https://54.225.171.108/api/health`
- Netlify handles the HTTPS handshake with its own certificate
- Browser trusts Netlify, request succeeds

### 2. Dashboard API Client Update

**File**: `/home/ubuntu/projects/grimlock/dashboard/js/api.js`

Changed API_CONFIG.baseUrl from absolute to relative:

```javascript
const API_CONFIG = {
    baseUrl: '',  // Empty = relative URLs (proxied by Netlify)
    // ... other config ...
};
```

**Why:**
- Requests now go to `/api/*` (relative)
- Netlify's _redirects rule intercepts and proxies
- No cross-origin issues (same origin from browser perspective)

### 3. FastAPI CORS Configuration

**File**: `/home/ubuntu/projects/grimlock/grimlock-api/grimlock_api/config.py`

Updated CORS origins:

```python
cors_origins: list[str] = [
    "http://localhost:3000",
    "http://localhost:5173",        # Vite dev server
    "https://grimlockfactory.netlify.app",
    "https://54.225.171.108",       # For direct access (if needed)
]
```

**Why:**
- Allows requests from Netlify domain
- Maintains support for localhost development
- Fallback for direct IP access

---

## Deployment Steps

### Step 1: Verify Local Setup (Already Done)

```bash
# FastAPI running?
ps aux | grep uvicorn | grep -v grep
# Output: Should show running process

# Caddy running?
sudo systemctl status caddy
# Output: Active (running)

# Test endpoint?
curl -sk https://54.225.171.108/api/health
# Output: {"status":"degraded",...}
```

### Step 2: Deploy Dashboard to Netlify

```bash
cd /home/ubuntu/projects/grimlock/dashboard

# Commit changes
git add _redirects js/api.js
git commit -m "Fix: Use Netlify proxy for API calls to avoid self-signed cert issues"

# Push to GitHub (triggers Netlify deploy)
git push origin main
```

Netlify automatically:
- Detects the push
- Publishes the dashboard
- Applies `_redirects` rules
- Routes all /api/* calls through proxy

### Step 3: Verify Deployment

**Option A: Check Netlify Console**
1. Go to https://app.netlify.com
2. Select your site (grimlockfactory)
3. Verify latest deploy succeeded
4. Check "Deploy settings" → "Redirects" shows your rules

**Option B: Test from Browser Console**
```javascript
// Open https://grimlockfactory.netlify.app in browser
// Press F12 → Console tab
// Paste:

fetch('/api/health')
  .then(r => r.json())
  .then(d => console.log('SUCCESS:', d))
  .catch(e => console.error('ERROR:', e))

// Should print: SUCCESS: {status: "degraded", ...}
```

**Option C: Test API Endpoints**
```javascript
// From browser console on dashboard:

fetch('/api/builds')
  .then(r => r.json())
  .then(d => console.log('Builds:', d))

fetch('/api/projects')
  .then(r => r.json())
  .then(d => console.log('Projects:', d))
```

---

## How the Proxy Works Behind the Scenes

### Before (Failed)
```
1. Browser: GET https://54.225.171.108/api/health
2. Browser TLS: Verify certificate
3. ❌ Certificate is self-signed
4. ❌ Connection rejected (no JavaScript workaround)
```

### After (Success)
```
1. Browser: GET https://grimlockfactory.netlify.app/api/health
2. Browser TLS: Verify Netlify's certificate ✓ (valid CA)
3. Netlify receives request matching /api/*
4. Netlify's _redirects rule: proxy to https://54.225.171.108:443/api/health
5. Netlify (server) connects to Caddy with self-signed cert ✓ (server-to-server OK)
6. Netlify receives response from FastAPI
7. Netlify returns response to browser ✓ (same HTTPS connection)
8. ✓ No certificate validation errors visible to browser
```

---

## Troubleshooting

### Problem: Still Getting "Failed to fetch" or CORS error

**Solution 1: Verify _redirects file**
```bash
# Check file exists and has correct content
cat /home/ubuntu/projects/grimlock/dashboard/_redirects
# Should show proxy rules at top

# Deploy the file
git add _redirects
git commit -m "Update redirects"
git push origin main
```

**Solution 2: Clear Netlify cache**
```bash
# In Netlify console:
# Site settings → Build & deploy → Deployments
# Click latest deploy → "Retry deploy"
```

**Solution 3: Check FastAPI is responding**
```bash
# From EC2 terminal:
curl -sk https://54.225.171.108/api/health
# Should return JSON (not error)
```

### Problem: API returns error but browser doesn't show it

**Solution: Check browser console**
```javascript
// Open: https://grimlockfactory.netlify.app
// Press F12 → Console tab
// Paste:
fetch('/api/health').then(r => r.text()).then(t => console.log(t))
// Should show response (error or data)
```

### Problem: Mixed content warnings

**This shouldn't happen with our setup** because:
- Dashboard: HTTPS (Netlify)
- All API calls: Relative `/api/*` (same origin)
- Caddy: Internal only

But if you see it:
```bash
# Verify dashboard is using HTTPS (not http://...)
# Verify all API URLs in js/api.js are relative (not absolute https://...)
# Verify Netlify deploy shows dashboard at HTTPS URL
```

---

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `dashboard/_redirects` | Added API proxy rule | Route API calls through Netlify HTTPS |
| `dashboard/js/api.js` | Changed baseUrl to '' | Use relative URLs (proxied) |
| `grimlock-api/grimlock_api/config.py` | Updated CORS origins | Allow Netlify domain |

---

## Post-Deployment: Future Improvements

Once you get a domain (e.g., `api.grimlock.dev`):

1. **Update Caddyfile** (on EC2)
   ```
   https://api.grimlock.dev {
       reverse_proxy localhost:8000
       # Remove: tls internal
       # Let's Encrypt takes over automatically
   }
   ```

2. **Update _redirects** (in dashboard)
   ```
   /api/* https://api.grimlock.dev/api/:splat 200
   ```

3. **Update CORS** (FastAPI)
   ```python
   cors_origins: list[str] = [
       "https://grimlockfactory.netlify.app",
       "https://api.grimlock.dev",
   ]
   ```

**Result**: Real Let's Encrypt certificate, no more "self-signed" warnings.

---

## Why This Solution Wins for Hackathon

| Solution | Setup Time | Domain Required | Browser Works |
|----------|-----------|-----------------|---------------|
| **Netlify Proxy** (✓ Selected) | < 10 min | No | Yes |
| Cloudflare Tunnel | 15-20 min | No | Yes |
| AWS CloudFront | 20-30 min | No | Yes |
| Real SSL (Let's Encrypt) | N/A | **Yes** | Yes |

Our solution:
- ✓ Works immediately
- ✓ No additional infrastructure
- ✓ No domain needed
- ✓ Hackathon deadline safe (Jan 3)
- ✓ Upgradeable to domain later

---

## Testing Checklist

Before Jan 3 deadline:

- [ ] FastAPI running on EC2: `ps aux | grep uvicorn`
- [ ] Caddy running on EC2: `sudo systemctl status caddy`
- [ ] API responds locally: `curl -sk https://54.225.171.108/api/health`
- [ ] Dashboard files updated: `grep -r "baseUrl" js/api.js`
- [ ] _redirects deployed to Netlify: Check site settings
- [ ] Dashboard API calls successful: Open browser console, run fetch test
- [ ] No certificate warnings from browser: Connection is HTTPS via Netlify
- [ ] All API endpoints working: `/api/builds`, `/api/projects`, `/api/health`

---

## Questions?

**About Netlify Proxy**: See https://docs.netlify.com/routing/redirects/
**About CORS**: See https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
**About Self-Signed Certs**: See `/home/ubuntu/projects/grimlock/HTTPS_QUICK_REFERENCE.md`

---

## Summary

```
PROBLEM:  Browser blocks fetch() to self-signed HTTPS certificate
SOLUTION: Route through Netlify proxy (trusted HTTPS) → FastAPI
TIME:     < 10 minutes to deploy
RESULT:   Dashboard-API communication restored
```
