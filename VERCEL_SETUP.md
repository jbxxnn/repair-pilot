# Vercel Deployment Setup for RepairPilot

## ✅ Already Done
- ✅ Updated `shopify.app.toml` with your Vercel URL: `https://repair-pilot.vercel.app`

## 🔧 Required Updates

### 1. Update Vercel Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Make sure you have ALL these variables set (especially `SHOPIFY_APP_URL`):

```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_products,write_customers,read_customers,write_draft_orders,write_files
SHOPIFY_APP_URL=https://repair-pilot.vercel.app
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=production
```

**⚠️ IMPORTANT**: After adding/updating `SHOPIFY_APP_URL`, you need to **redeploy** your app for the changes to take effect.

### 2. Update Shopify Partner Dashboard

1. Go to https://partners.shopify.com
2. Select your app → **App Setup** tab
3. Update these URLs:
   - **App URL**: `https://repair-pilot.vercel.app`
   - **Allowed redirection URL(s)**: `https://repair-pilot.vercel.app/api/auth`
4. **Save changes**

### 3. Sync Shopify Configuration

After updating the files, run this command to sync with Shopify:

```bash
shopify app deploy
```

This will sync your `shopify.app.toml` configuration with Shopify.

### 4. Redeploy on Vercel

After updating environment variables:
- Either push a new commit to trigger a redeploy
- Or manually redeploy from Vercel Dashboard → **Deployments** → **Redeploy**

## 🧪 Testing

1. Visit `https://repair-pilot.vercel.app`
2. You should be redirected to Shopify authentication
3. Install the app on a test store
4. Verify all features work:
   - Create ticket
   - Upload photos
   - Update status
   - Email notifications
   - QR codes
   - Reports

## 📝 Notes

- Vercel automatically provides SSL (HTTPS)
- Your URL `repair-pilot.vercel.app` is already live
- If you want a custom domain, you can add it in Vercel Settings → Domains
- Make sure your database is accessible from Vercel's IP ranges (if using firewall rules)

## 🔍 Troubleshooting

### App not loading?
- Check Vercel deployment logs
- Verify all environment variables are set
- Check that `SHOPIFY_APP_URL` matches your Vercel URL exactly

### Authentication fails?
- Verify URLs in Shopify Partner Dashboard match Vercel URL
- Check `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Ensure redirect URL is: `https://repair-pilot.vercel.app/api/auth`

### Database connection issues?
- Verify `DATABASE_URL` is set correctly
- Check database allows connections from Vercel
- Ensure SSL is enabled in connection string (`?sslmode=require`)

