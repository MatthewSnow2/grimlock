# MCP Factory Dashboard

A modern, dark-themed dashboard UI for the GRIMLOCK MCP Server Factory.

## Quick Start

### Local Development

```bash
cd /home/ubuntu/projects/grimlock/dashboard
python3 -m http.server 8080
```

Then open: http://localhost:8080

### Routes

| Route | View | Description |
|-------|------|-------------|
| `#/` | Landing | Main dashboard with PRD options |
| `#/progress` | Progress | Build progress monitoring |
| `#/complete` | Complete | Build completion recap |

## Architecture

**Stack:**
- Pure HTML + Tailwind CSS (CDN)
- Vanilla JavaScript (no framework)
- Hash-based SPA routing

**No build process required** - files are served directly.

## Files

```
dashboard/
├── index.html          # Main SPA shell with all views
├── js/
│   ├── router.js       # Hash-based navigation
│   └── app.js          # Event handlers and logic
├── netlify.toml        # Netlify configuration
├── _redirects          # SPA redirect fallback
└── README.md           # This file
```

## Navigation Flow

```
Landing (#/)
  ├── "Begin Wizard" → External n8n form (new tab)
  └── "Upload File" → Modal overlay
        └── "Process File" → #/progress
              └── "Simulate Complete" → #/complete
                    └── "Create Another" → #/
```

## Deployment

### Netlify

1. Push to GitHub
2. Connect repository to Netlify
3. Set publish directory to `dashboard/`
4. Deploy

The `netlify.toml` handles SPA routing automatically.

## External Dependencies (CDN)

- Tailwind CSS: https://cdn.tailwindcss.com
- Google Fonts (Inter): https://fonts.googleapis.com
- Material Symbols: https://fonts.googleapis.com

## Integration Points (Future)

The dashboard is prepared for integration with:
- n8n webhooks for PRD upload
- Real-time build status updates
- Artifact download endpoints

See `js/app.js` CONFIG object for API endpoints.

## Source

Original design exported from Google Stitch (Figma).
Source files: `/home/ubuntu/projects/grimlock/stitch_mcp_factory_dashboard/`
