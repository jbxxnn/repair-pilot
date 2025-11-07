# Vercel Environment Variables Checklist

## Required Environment Variables

Make sure these are set in **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**:

### Database
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `DIRECT_URL` - Direct PostgreSQL connection string (if using connection pooling)

**Format Example**:
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DIRECT_URL=postgresql://user:password@host:port/database?sslmode=require
```

### Shopify
- ✅ `SHOPIFY_API_KEY` - Your Shopify app API key
- ✅ `SHOPIFY_API_SECRET` - Your Shopify app API secret
- ✅ `SCOPES` - Comma-separated scopes
- ✅ `SHOPIFY_APP_URL` - Your Vercel app URL (https://repair-pilot.vercel.app)

### Email (Resend)
- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `RESEND_FROM_EMAIL` - Verified email address

### Node Environment
- ✅ `NODE_ENV` - Set to `production`

## Important Notes

1. **Environment Scope**: Make sure variables are set for **Production** environment
   - Not just Preview/Branch environments
   - Check the "Environment" dropdown when adding variables

2. **After Adding Variables**: 
   - You MUST redeploy for changes to take effect
   - Go to Deployments → Latest → ... → Redeploy

3. **Database URL Format**:
   - Must include `?sslmode=require` for most cloud databases
   - Check your database provider's documentation

4. **Verify Variables Are Set**:
   - Check Vercel build logs - they should NOT show undefined values
   - Add a test endpoint to verify (but don't expose secrets in logs)

## Quick Test

After setting environment variables, check the Vercel function logs for:
- Database connection errors
- "Can't reach database server" errors
- Prisma Client initialization errors

If you see errors, double-check:
1. Database URL is correct
2. Database allows connections from Vercel IPs
3. SSL is properly configured
4. Database credentials are correct


