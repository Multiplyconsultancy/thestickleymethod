#!/bin/bash
# Push to GitHub using the token in .env
# Usage: ./push.sh

set -e

if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

source .env

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN is empty in .env"
  exit 1
fi

REPO="Multiplyconsultancy/thestickleymethod"
git push "https://${GITHUB_TOKEN}@github.com/${REPO}.git" HEAD:main
