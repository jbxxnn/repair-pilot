# Database Connection Troubleshooting for Vercel

## Common Issues and Solutions

### 1. Prisma Client Not Generated

**Problem**: Prisma Client might not be generated during Vercel build.

**Solution**: 
- Added `postinstall` script to `package.json` to run `prisma generate` automatically
- Updated `build` script to include `prisma generate`

**Check**: Verify in Vercel build logs that `prisma generate` runs successfully.

### 2. Environment Variables Not Set

**Problem**: `DATABASE_URL` or `DIRECT_URL` not configured in Vercel.

**Solution**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `DIRECT_URL` - Your direct PostgreSQL connection string (if using connection pooling)

**Format**:
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DIRECT_URL=postgresql://user:password@host:port/database?sslmode=require
```

### 3. Connection Pooling for Serverless

**Problem**: Serverless functions can exhaust database connections.

**Solution**: 
- Updated `db.server.ts` to handle serverless environments better
- Each serverless function invocation gets its own Prisma Client instance
- Prisma handles connection pooling automatically

**For Better Performance**:
- Consider using a connection pooler like PgBouncer
- Or use a managed database service that handles pooling (e.g., Neon, Supabase)

### 4. SSL Connection Issues

**Problem**: Database requires SSL but connection string doesn't specify it.

**Solution**: Ensure your `DATABASE_URL` includes `?sslmode=require`:
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### 5. Database Not Accessible from Vercel

**Problem**: Database firewall/security groups blocking Vercel IPs.

**Solution**:
- Whitelist Vercel's IP ranges (they're dynamic, so allow all IPs if possible)
- Or use a database provider that allows connections from anywhere (with proper authentication)

### 6. Build-Time vs Runtime Issues

**Problem**: Database connection works in build but not at runtime.

**Check**:
- Verify environment variables are set for **Production** environment
- Not just for Preview/Branch environments
- Check Vercel function logs for specific error messages

## Debugging Steps

1. **Check Build Logs**:
   - Verify `prisma generate` runs successfully
   - Check for any Prisma-related errors

2. **Check Runtime Logs**:
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for database connection errors
   - Check for "Can't reach database server" errors

3. **Test Database Connection**:
   - Add a test endpoint to verify database connectivity
   - Check if Prisma Client is properly initialized

4. **Verify Environment Variables**:
   ```bash
   # In Vercel function, log (but don't expose) connection string
   console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
   console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
   ```

## Quick Fixes Applied

1. ✅ Added `postinstall` script to generate Prisma Client
2. ✅ Updated build script to include `prisma generate`
3. ✅ Improved Prisma Client initialization for serverless
4. ✅ Better error handling in database connection

## Next Steps

1. **Redeploy** after these changes
2. **Check Vercel logs** for any database errors
3. **Verify environment variables** are set correctly
4. **Test a simple database query** to confirm connection works

## If Still Not Working

1. Check Vercel function logs for specific error messages
2. Verify database is accessible from outside (test connection locally with production DATABASE_URL)
3. Check database provider's connection limits and pooling settings
4. Consider using a database connection pooler


