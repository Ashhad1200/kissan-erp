#!/bin/sh
set -e

echo "▶ Pushing schema to database..."
node ./node_modules/prisma/build/index.js db push

echo "▶ Seeding database (upsert - safe to run multiple times)..."
node ./node_modules/tsx/dist/bin.mjs prisma/seed.ts

echo "▶ Starting Next.js server..."
exec node server.js
