#!/bin/bash
# Deployment Verification Script for LMS on Vercel
# Run this after Vercel deployment completes

set -e

BASE_URL="${1:-https://llms-git-master-d3fault1.vercel.app}"
echo "🔍 Testing deployment at: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_route() {
    local path=$1
    local expected_status=${2:-200}
    local description=$3

    echo -n "Testing $description ($path)... "

    # Get HTTP status and check for Vercel SSO redirect
    response=$(curl -s -I -L "$BASE_URL$path" 2>/dev/null | head -1)
    status=$(echo "$response" | grep -oE 'HTTP/[0-9.]+ [0-9]+' | awk '{print $2}')

    # Check if response contains Vercel SSO redirect
    if curl -s "$BASE_URL$path" 2>/dev/null | grep -q "vercel.com/sso-api"; then
        echo -e "${RED}❌ BLOCKED BY VERCEL SSO${NC}"
        return 1
    fi

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK ($status)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (got $status, expected $expected_status)${NC}"
        return 1
    fi
}

# Test all critical routes
echo "=== PUBLIC ROUTES (should return 200) ==="
test_route "/" 200 "Landing page"
test_route "/login/student" 200 "Student login page"
test_route "/login/teacher" 200 "Teacher login page"
test_route "/api/health" 200 "Health check API"
test_route "/api/auth/signin" 200 "NextAuth signin page"
test_route "/robots.txt" 200 "Robots.txt"

echo ""
echo "=== PROTECTED ROUTES (should return 302 redirect to login) ==="
test_route "/dashboard" 302 "Student dashboard (redirect to login)"
test_route "/admin" 302 "Admin dashboard (redirect to login)"
test_route "/quiz/1" 302 "Quiz page (redirect to login)"

echo ""
echo "=== API ROUTES ==="
test_route "/api/auth/session" 200 "NextAuth session API"

echo ""
echo "=== SUMMARY ==="
if curl -s "$BASE_URL/" 2>/dev/null | grep -q "vercel.com/sso-api"; then
    echo -e "${RED}⚠️  DEPLOYMENT PROTECTION IS ENABLED!${NC}"
    echo -e "${YELLOW}   Go to Vercel Dashboard → Settings → Deployment Protection → Disable${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Deployment protection is DISABLED - site is publicly accessible${NC}"
fi

echo ""
echo "🎉 Verification complete!"