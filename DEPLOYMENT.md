# Production Deployment Guide for RepairPilot

This guide will walk you through deploying your RepairPilot Shopify app to production.

## Prerequisites

- [ ] Shopify Partner account
- [ ] Production Shopify app created in Partner Dashboard
- [ ] Domain name (for production URL)
- [ ] Hosting platform account (Heroku, Fly.io, Railway, Render, etc.)
- [ ] PostgreSQL database (managed or self-hosted)
- [ ] Resend account for email notifications

## Step 1: Set Up Production Database

### Option A: Managed PostgreSQL (Recommended)

Choose a managed PostgreSQL provider:

1. **Neon** (https://neon.tech) - Free tier available
2. **Supabase** (https://supabase.com) - Free tier available
3. **Railway** (https://railway.app) - PostgreSQL addon
4. **Render** (https://render.com) - Managed PostgreSQL
5. **DigitalOcean** (https://www.digitalocean.com) - Managed Databases
6. **AWS RDS** (https://aws.amazon.com/rds) - For enterprise

### Steps:

1. Create a new PostgreSQL database
2. Note the connection string (DATABASE_URL)
3. Note the direct connection string if provided (DIRECT_URL)
4. Enable SSL connections (required for most providers)

### Option B: Self-Hosted PostgreSQL

If you prefer to self-host, ensure:
- PostgreSQL 14+ is installed
- SSL is configured
- Database is accessible from your hosting platform
- Firewall rules allow connections

## Step 2: Run Database Migrations

After setting up your production database:

```bash
# Set your production database URL
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
export DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"

# Run migrations
npm run migrate:deploy
```

Or if using Prisma migrations:

```bash
npx prisma migrate deploy
```

## Step 3: Set Up Email Service (Resend)

1. **Create a Resend account**: https://resend.com
2. **Get your API key**: Dashboard → API Keys → Create API Key
3. **Verify your domain** (required for production):
   - Add DNS records to your domain
   - Wait for verification
   - Use your verified domain email (e.g., `noreply@yourdomain.com`)

## Step 4: Configure Shopify App in Partner Dashboard

1. Go to https://partners.shopify.com
2. Select your app
3. Navigate to **App Setup** tab
4. Update these URLs with your production domain:

   - **App URL**: `https://your-domain.com`
   - **Allowed redirection URL(s)**: `https://your-domain.com/api/auth`
   - **Webhook URLs**: 
     - `https://your-domain.com/webhooks/app/uninstalled`
     - `https://your-domain.com/webhooks/app/scopes_update`

5. Save changes

## Step 5: Choose a Hosting Platform

### Option A: Fly.io (Recommended for ease of use)

#### Setup:

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Create app:
   ```bash
   fly launch
   ```

4. Set environment variables:
   ```bash
   fly secrets set SHOPIFY_API_KEY=your_api_key
   fly secrets set SHOPIFY_API_SECRET=your_api_secret
   fly secrets set SCOPES="write_products,write_customers,read_customers,write_draft_orders,write_files"
   fly secrets set SHOPIFY_APP_URL=https://your-domain.com
   fly secrets set DATABASE_URL=your_database_url
   fly secrets set DIRECT_URL=your_direct_url
   fly secrets set RESEND_API_KEY=your_resend_key
   fly secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
   fly secrets set NODE_ENV=production
   ```

5. Deploy:
   ```bash
   fly deploy
   ```

### Option B: Railway

1. Create account: https://railway.app
2. New Project → Deploy from GitHub (or CLI)
3. Add PostgreSQL service
4. Set environment variables in Railway dashboard
5. Deploy automatically on push

### Option C: Render

1. Create account: https://render.com
2. New → Web Service
3. Connect GitHub repository
4. Build command: `npm run build`
5. Start command: `npm start`
6. Add PostgreSQL database
7. Set environment variables
8. Deploy

### Option D: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`
5. Set environment variables: `heroku config:set KEY=value`
6. Deploy: `git push heroku main`

### Option E: Docker Deployment

If you prefer Docker:

1. Build image:
   ```bash
   docker build -t repairpilot .
   ```

2. Run container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e SHOPIFY_API_KEY=... \
     -e SHOPIFY_API_SECRET=... \
     -e DATABASE_URL=... \
     -e RESEND_API_KEY=... \
     --name repairpilot \
     repairpilot
   ```

## Step 6: Environment Variables Checklist

Set these environment variables in your hosting platform:

### Required Variables:

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_api_secret_from_partner_dashboard
SCOPES=write_products,write_customers,read_customers,write_draft_orders,write_files
SHOPIFY_APP_URL=https://your-production-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DIRECT_URL=postgresql://user:password@host:port/database?sslmode=require

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Node Environment
NODE_ENV=production

# Optional: Custom Shop Domain (if needed)
# SHOP_CUSTOM_DOMAIN=your-custom-shop-domain.com
```

### How to Get Shopify Credentials:

1. Go to Partner Dashboard → Your App
2. Navigate to **App Setup** tab
3. Find **Client ID** (this is your `SHOPIFY_API_KEY`)
4. Find **Client secret** (this is your `SHOPIFY_API_SECRET`)

## Step 7: Update shopify.app.toml

Update `shopify.app.toml` with your production URLs:

```toml
application_url = "https://your-production-domain.com"

[auth]
redirect_urls = [ "https://your-production-domain.com/api/auth" ]
```

## Step 8: Build and Deploy

### Local Build Test:

```bash
# Test build locally first
npm run build

# Test production start locally
NODE_ENV=production npm start
```

### Deploy to Production:

Depending on your hosting platform:

**Fly.io:**
```bash
fly deploy
```

**Railway/Render:**
- Push to main branch (auto-deploys)

**Heroku:**
```bash
git push heroku main
```

**Manual:**
```bash
# Build
npm run build

# Start production server
npm start
```

## Step 9: Verify Deployment

1. **Check app is running**:
   - Visit `https://your-domain.com`
   - Should see your app (or redirect to Shopify auth)

2. **Test installation**:
   - Install app on a test store
   - Verify authentication works
   - Test creating a ticket
   - Test email notifications

3. **Check logs**:
   - Monitor application logs for errors
   - Verify database connections
   - Check email sending

## Step 10: Update Shopify App Configuration

After deployment, update your app configuration:

```bash
shopify app deploy
```

This will sync your `shopify.app.toml` configuration with Shopify.

## Step 11: Set Up Monitoring & Logging

### Recommended Tools:

1. **Error Tracking**: Sentry, Rollbar, or LogRocket
2. **Uptime Monitoring**: UptimeRobot, Pingdom
3. **Application Logs**: Use your hosting platform's logging
4. **Database Monitoring**: Use your database provider's monitoring tools

### Add Health Check Endpoint (Optional):

Create a health check route for monitoring:

```typescript
// app/routes/health.tsx
export const loader = async () => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response("Unhealthy", { status: 500 });
  }
};
```

## Step 12: SSL/HTTPS Certificate

Most hosting platforms provide SSL automatically:

- **Fly.io**: Automatic Let's Encrypt
- **Railway**: Automatic SSL
- **Render**: Automatic SSL
- **Heroku**: Automatic SSL

If self-hosting, use:
- Let's Encrypt with Certbot
- Cloudflare (free SSL proxy)

## Step 13: Domain Configuration

1. **Point DNS to your hosting platform**:
   - Add A record or CNAME pointing to your host
   - Wait for DNS propagation (can take up to 48 hours)

2. **Verify domain**:
   ```bash
   # Check DNS
   dig your-domain.com
   nslookup your-domain.com
   ```

## Step 14: Production Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] Database migrations run successfully
- [ ] SSL certificate active
- [ ] Shopify app URLs updated in Partner Dashboard
- [ ] Email domain verified in Resend
- [ ] Test installation on a development store
- [ ] Test all major features:
  - [ ] Create ticket
  - [ ] Upload photos
  - [ ] Update ticket status
  - [ ] Add parts
  - [ ] Email notifications
  - [ ] QR code generation
  - [ ] Reports & Analytics
- [ ] Error tracking configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated

## Step 15: Post-Deployment

1. **Monitor closely** for the first 24-48 hours
2. **Check logs** regularly for errors
3. **Test email delivery** to ensure notifications work
4. **Monitor database performance**
5. **Set up alerts** for critical errors

## Troubleshooting

### Common Issues:

1. **Database connection errors**:
   - Verify DATABASE_URL is correct
   - Check SSL mode is set correctly
   - Verify firewall allows connections

2. **Shopify authentication fails**:
   - Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET
   - Check app URLs in Partner Dashboard match production
   - Ensure redirect URLs are correct

3. **Email not sending**:
   - Verify RESEND_API_KEY is set
   - Check RESEND_FROM_EMAIL is from verified domain
   - Check Resend dashboard for delivery status

4. **Build fails**:
   - Check Node.js version (requires >= 20.10)
   - Verify all dependencies are installed
   - Check build logs for specific errors

5. **App not loading**:
   - Verify SHOPIFY_APP_URL matches production domain
   - Check SSL certificate is valid
   - Verify app is accessible from internet

## Security Considerations

1. **Never commit** `.env` files or secrets to git
2. **Use environment variables** for all sensitive data
3. **Enable SSL** for all connections
4. **Use database connection pooling**
5. **Regular security updates** for dependencies
6. **Monitor** for suspicious activity
7. **Backup** database regularly

## Backup Strategy

1. **Database backups**:
   - Most managed providers offer automatic backups
   - Set up daily backups
   - Test restore process

2. **Code backups**:
   - Use Git for version control
   - Tag releases
   - Keep deployment history

## Scaling Considerations

As your app grows:

1. **Database**:
   - Monitor query performance
   - Add indexes as needed
   - Consider read replicas for high traffic

2. **Application**:
   - Use connection pooling
   - Consider horizontal scaling
   - Cache frequently accessed data

3. **Email**:
   - Resend has rate limits
   - Consider queue system for high volume

## Support & Resources

- **Shopify App Development**: https://shopify.dev/docs/apps
- **React Router Docs**: https://reactrouter.com
- **Prisma Docs**: https://www.prisma.io/docs
- **Resend Docs**: https://resend.com/docs

## Need Help?

If you encounter issues:
1. Check application logs
2. Check database logs
3. Check Shopify Partner Dashboard for app status
4. Review error tracking (if configured)
5. Consult documentation links above


