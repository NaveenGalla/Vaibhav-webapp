# Vaibhav VFM Production Readiness

## Required Checks

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run build`
- `npm run check:prod`
- `GET /api/health` returns `200` and `status: "ready"`

## Required Environment

- `DATABASE_URL`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`

## Deployment Notes

- Use PostgreSQL with managed backups enabled.
- Run Prisma migrations before starting the app.
- Keep demo passwords out of production seed data.
- Set `NODE_ENV=production`.
- Serve over HTTPS only.
- Configure log collection for Next.js server logs.
- Monitor `/api/health` from the load balancer or uptime monitor.

## Current Document Upload Decision

Documents currently store `fileUrl` and `fileName`. Native upload storage is intentionally not enabled yet because it requires a business decision:

- S3-compatible object storage
- Cloudflare R2
- Existing internal document system URL

Until selected, users can paste a document URL and the app keeps metadata, expiry, amount, and remarks.

## Approval Workflow Baseline

- Indent requesters cannot approve their own requests unless they are platform admins.
- Branch scoped users can only act on their branch.
- Assignment validates vehicle and driver branch alignment.
- Fuel approvals are restricted to accounts/approver/admin roles and branch scope.
- Procurement and disposal lifecycle decisions are audited and notify stakeholders.
