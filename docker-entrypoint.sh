#!/bin/sh
set -e

echo "▶ Pushing schema to database..."
node ./node_modules/prisma/build/index.js db push

echo "▶ Seeding database..."
node prisma/docker-seed.mjs

echo "▶ Starting Next.js server..."
exec node server.js
