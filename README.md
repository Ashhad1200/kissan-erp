# KissanMall ERP

Full-stack ERP for KissanMall.pk - managing physical store + Shopify store.

## Tech Stack
- Next.js 16 App Router, React, Tailwind CSS, shadcn/ui
- PostgreSQL + Prisma ORM
- NextAuth.js v5 (JWT)
- Shopify Admin API + Webhooks

## Setup

1. `npm install`
2. Configure `.env` (see DATABASE_URL, NEXTAUTH_SECRET, SHOPIFY_* vars)
3. `npm run db:push && npm run db:seed`
4. `npm run dev`

**Default login:** admin@kissanmall.pk / admin123

## Shopify Webhooks
Point to: `https://your-domain/api/shopify/webhook`
Topics: orders/create, orders/updated, orders/cancelled


fix some thing 