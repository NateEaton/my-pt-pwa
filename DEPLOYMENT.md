# My PT - Deployment Guide

This guide covers deploying My PT to both production and development environments with proper PWA support.

## Build Commands

### Production Build
```bash
npm run build
```
- No BASE_PATH needed (defaults to `/`)
- Output: `build/` directory
- Deploy to: `/usr/share/nginx/html/my-pt/`

### Development Build
```bash
BASE_PATH=/my-pt-pwa-dev npm run build
```
- Sets base path to match nginx sub-path
- Output: `build/` directory
- Deploy to: `/usr/share/nginx/html/my-pt-pwa-dev/`

## Nginx Configuration

### Production
- Config file: `nginx-prod-recommended.conf`
- Domain: `my-pt.eatonfamily.net`
- Root path: `/`
- Service worker scope: `/`

### Development
- Config file: `nginx-dev-recommended.conf`
- Domain: `my-pt-dev.eatonfamily.net`
- Root path: `/my-pt-pwa-dev/`
- Service worker scope: `/my-pt-pwa-dev/`

## Critical Configuration Notes

### Service Worker Cache Headers

Both configs use `Cache-Control: no-cache, max-age=0` for service worker files:

```nginx
location = /sw.js {  # or /my-pt-pwa-dev/sw.js for dev
    add_header Cache-Control "no-cache, max-age=0" always;
    add_header Pragma "no-cache" always;
    expires 0;
}
```

**Why `no-cache` instead of `no-store`:**
- `no-cache`: Browser revalidates with server, but can use cached version if offline ✅
- `no-store`: Browser never caches, problematic for some offline scenarios ❌

This ensures:
- ✅ Updates are detected immediately when online
- ✅ App continues to work when offline (already-installed SW persists)
- ✅ No manual service worker unregistration needed

### Offline Functionality

The PWA will work fully offline AFTER the first online visit:

1. **First visit (online)**:
   - Browser downloads `sw.js`
   - Service worker registers and installs
   - Service worker caches all app assets

2. **Subsequent visits (offline)**:
   - Browser tries to check for sw.js updates → fails (offline)
   - Already-installed service worker continues to run
   - Service worker serves cached assets
   - **App works completely offline** ✅

## Deployment Steps

### 1. Build the app
```bash
# For production
npm run build

# For development
BASE_PATH=/my-pt-pwa-dev npm run build
```

### 2. Deploy build files
```bash
# Production
rsync -av build/ server:/usr/share/nginx/html/my-pt/

# Development
rsync -av build/ server:/usr/share/nginx/html/my-pt-pwa-dev/
```

### 3. Update nginx config
```bash
# Production
sudo cp nginx-prod-recommended.conf /etc/nginx/sites-available/my-pt.eatonfamily.net.conf

# Development
sudo cp nginx-dev-recommended.conf /etc/nginx/sites-available/my-pt-dev.eatonfamily.net.conf

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Verify deployment
- Visit site in browser
- Check console for "New version available" (if update)
- Go to Settings → Check for Updates
- Verify build number in About dialog
- Test offline: Disconnect internet, reload page, verify app works

## Troubleshooting

### Service worker not updating
- Check nginx config has `no-cache` headers on `sw.js`
- Check browser Network tab shows 200 (not 304) for sw.js
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

### App not working offline
- Ensure service worker installed (check Application tab in DevTools)
- Check that at least one online visit occurred
- Verify service worker is serving cached resources

### Path mismatch errors (dev only)
- Verify BASE_PATH matches nginx location path
- Check manifest.webmanifest has correct scope and start_url
- Ensure all routes use consistent base path

## Build Number Verification

After deploying, the build number should update:
1. Go to Settings → About
2. Build number format: `{git-hash}-{timestamp}` or `{git-hash}-dirty-{timestamp}`
3. Compare with git log to verify it matches latest commit

## Cache Headers Summary

| Resource Type | Cache-Control | Purpose |
|--------------|---------------|---------|
| `sw.js` | `no-cache, max-age=0` | Always check for updates, allow offline |
| `workbox-*.js` | `no-cache, max-age=0` | Always check for updates |
| `index.html` | `no-cache, max-age=0` | Always serve latest entry point |
| `manifest.webmanifest` | `public, max-age=3600` | 1 hour cache is fine |
| Hashed JS/CSS | `public, immutable, 1y` | Content hash changes = new file |
| Images/Fonts | `public, immutable, 1y` | Rarely change |

## Security Headers (Production Only)

Production includes additional security headers:
- `Content-Security-Policy`: Restricts resource loading
- `X-Frame-Options: DENY`: Prevents clickjacking
- `X-Content-Type-Options: nosniff`: Prevents MIME sniffing
- `X-XSS-Protection`: XSS filter for older browsers

Development omits some headers for easier debugging.
