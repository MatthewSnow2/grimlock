#!/bin/bash

# GRIMLOCK Dashboard-API Proxy Setup Verification
# Run this script to verify all components are correctly configured

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "GRIMLOCK Dashboard-API Proxy Setup Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0

# Test function
test_component() {
    local name="$1"
    local command="$2"
    local expected="$3"

    echo -n "Checking: $name ... "

    result=$(eval "$command" 2>&1)

    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Command: $command"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((CHECKS_FAILED++))
    fi
}

# 1. Check FastAPI is running
echo "1. FastAPI Service"
echo "─────────────────────────────────────────────────────────────────"
test_component "FastAPI process" \
    "ps aux | grep uvicorn | grep -v grep" \
    "uvicorn"

# 2. Check FastAPI responds locally
echo ""
echo "2. FastAPI Health Check"
echo "─────────────────────────────────────────────────────────────────"
test_component "FastAPI responds to localhost:8000" \
    "curl -s http://localhost:8000/api/health" \
    "status"

# 3. Check Caddy is running
echo ""
echo "3. Caddy Reverse Proxy"
echo "─────────────────────────────────────────────────────────────────"
test_component "Caddy service" \
    "sudo systemctl status caddy" \
    "active.*running"

# 4. Check Caddy forwards HTTPS correctly
echo ""
echo "4. HTTPS Proxy (Caddy)"
echo "─────────────────────────────────────────────────────────────────"
test_component "HTTPS API access" \
    "curl -sk https://54.225.171.108/api/health" \
    "status"

# 5. Check dashboard _redirects file
echo ""
echo "5. Netlify Redirect Rules"
echo "─────────────────────────────────────────────────────────────────"
test_component "_redirects has API proxy rule" \
    "cat /home/ubuntu/projects/grimlock/dashboard/_redirects" \
    "/api/.*54.225.171.108"

# 6. Check dashboard API client uses relative URLs
echo ""
echo "6. Dashboard API Configuration"
echo "─────────────────────────────────────────────────────────────────"
test_component "API client baseUrl is relative" \
    "grep 'baseUrl.*:' /home/ubuntu/projects/grimlock/dashboard/js/api.js | head -1" \
    "baseUrl.*''"

# 7. Check FastAPI CORS config
echo ""
echo "7. FastAPI CORS Configuration"
echo "─────────────────────────────────────────────────────────────────"
test_component "CORS allows Netlify domain" \
    "grep -A 5 'cors_origins' /home/ubuntu/projects/grimlock/grimlock-api/grimlock_api/config.py" \
    "grimlockfactory.netlify.app"

# 8. Check API builds endpoint
echo ""
echo "8. API Functionality"
echo "─────────────────────────────────────────────────────────────────"
test_component "API /builds endpoint responds" \
    "curl -s http://localhost:8000/api/builds" \
    "\\[\\|\\{" # JSON array or object

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Setup is ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Commit changes: git add -A && git commit -m 'Setup: Netlify proxy for API'"
    echo "2. Push to GitHub: git push origin main"
    echo "3. Verify on Netlify: Check deploy status in console"
    echo "4. Test dashboard: Open https://grimlockfactory.netlify.app in browser"
    echo "5. Check browser console: fetch('/api/health') should work"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "- FastAPI: ps aux | grep uvicorn"
    echo "- Caddy: sudo systemctl status caddy"
    echo "- Logs: tail -f /tmp/grimlock-api.log"
    echo "- Caddy logs: sudo journalctl -u caddy -f"
    exit 1
fi
