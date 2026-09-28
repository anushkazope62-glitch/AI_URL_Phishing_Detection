#!/usr/bin/env bash
# Render build script for Python + React + Playwright
set -o errexit

echo "--- 1. Installing Python Dependencies ---"
pip install --upgrade pip
pip install -r requirements.txt

echo "--- 2. Installing Playwright Chromium Browser ---"
playwright install --with-deps chromium || playwright install chromium || true

echo "--- 3. Building React Frontend (if node is available) ---"
if command -v npm &> /dev/null && [ -d "frontend-react" ]; then
    echo "Building frontend-react..."
    cd frontend-react
    npm install
    npm run build
    cd ..
else
    echo "Node/npm not detected or pre-built dist already present. Using static bundle."
fi

echo "--- 4. Ensuring Required Storage Directories ---"
mkdir -p screenshots

echo "--- Build completed successfully ---"
