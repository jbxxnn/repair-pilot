# Production Deployment Checklist

## Pre-Deployment

### Environment Setup
- [ ] Production PostgreSQL database created
- [ ] Database migrations tested
- [ ] Resend account created and domain verified
- [ ] Production domain purchased/configured
- [ ] Hosting platform account created

### Shopify App Configuration
- [ ] Production app created in Partner Dashboard
- [ ] Client ID and Client Secret copied
- [ ] App URLs configured in Partner Dashboard
- [ ] Webhook URLs configured
- [ ] Required scopes verified

### Code Preparation
- [ ] All features tested in development
- [ ] Code reviewed and tested
- [ ] Build process tested locally
- [ ] Environment variables documented
- [ ] `.env` files NOT committed to git

## Deployment Steps

### 1. Database Setup
- [ ] Production database created
- [ ] Connection string obtained
- [ ] Migrations run: `npm run migrate:deploy`
- [ ] Database connection tested

### 2. Environment Variables
- [ ] `SHOPIFY_API_KEY` set
- [ ] `SHOPIFY_API_SECRET` set
- [ ] `SCOPES` set
- [ ] `SHOPIFY_APP_URL` set to production URL
- [ ] `DATABASE_URL` set
- [ ] `DIRECT_URL` set (if required)
- [ ] `RESEND_API_KEY` set
- [ ] `RESEND_FROM_EMAIL` set to verified domain
- [ ] `NODE_ENV=production` set

### 3. Hosting Platform
- [ ] App deployed to hosting platform
- [ ] Environment variables configured
- [ ] Build successful
- [ ] App accessible at production URL
- [ ] SSL certificate active

### 4. Shopify Configuration
- [ ] `shopify.app.toml` updated with production URLs
- [ ] `shopify app deploy` run to sync configuration
- [ ] App URLs updated in Partner Dashboard
- [ ] Redirect URLs match production

### 5. Testing
- [ ] App installs successfully on test store
- [ ] Authentication works
- [ ] Create ticket works
- [ ] Photo upload works
- [ ] Status updates work
- [ ] Email notifications sent
- [ ] QR codes generate correctly
- [ ] Reports page loads
- [ ] All features functional

### 6. Monitoring
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring set up
- [ ] Log aggregation configured
- [ ] Alerts configured
- [ ] Database monitoring enabled

## Post-Deployment

### Immediate (First 24 hours)
- [ ] Monitor application logs
- [ ] Monitor error tracking
- [ ] Test on multiple stores
- [ ] Verify email delivery
- [ ] Check database performance

### Ongoing
- [ ] Regular backups scheduled
- [ ] Security updates applied
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Documentation updated

## Quick Commands Reference

```bash
# Build locally
npm run build

# Test production build
NODE_ENV=production npm start

# Run migrations
npm run migrate:deploy

# Deploy to Shopify
shopify app deploy

# Check environment variables (Fly.io)
fly secrets list

# View logs (Fly.io)
fly logs

# View logs (Heroku)
heroku logs --tail
```

## Environment Variables Template

```bash
# Copy this template and fill in your values
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=write_products,write_customers,read_customers,write_draft_orders,write_files
SHOPIFY_APP_URL=https://your-domain.com
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
DIRECT_URL=postgresql://user:password@host:port/database?sslmode=require
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=production
```

## Critical URLs to Update

1. **Partner Dashboard → App Setup**:
   - App URL: `https://your-domain.com`
   - Allowed redirection URL: `https://your-domain.com/api/auth`

2. **shopify.app.toml**:
   - `application_url = "https://your-domain.com"`
   - `redirect_urls = ["https://your-domain.com/api/auth"]`

3. **Webhooks** (in Partner Dashboard):
   - `https://your-domain.com/webhooks/app/uninstalled`
   - `https://your-domain.com/webhooks/app/scopes_update`


