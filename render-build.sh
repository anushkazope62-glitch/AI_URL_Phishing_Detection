#!/usr/bin/env bash
set -e

echo "=== Installing dependencies ==="
pip install -r requirements.txt

echo "=== Installing Playwright Chromium ==="
PLAYWRIGHT_BROWSERS_PATH=0 python -m playwright install chromium

echo "=== Verifying Chromium installation ==="
PLAYWRIGHT_BROWSERS_PATH=0 python -m playwright install --list

echo "=== Build completed ==="