#!/bin/bash
cd /home/mazin/website-creation/lms-deploy-clean
echo "=== Running prisma migrate deploy ==="
npx prisma migrate deploy 2>&1
echo "EXIT_CODE=$?"
echo "=== Running prisma generate ==="
npx prisma generate 2>&1
echo "EXIT_CODE=$?"
