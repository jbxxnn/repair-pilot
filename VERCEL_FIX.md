# Vercel Deployment Fix

The error you're seeing is because the `functions` configuration in `vercel.json` has an invalid runtime format.

## Solution

I've removed the `functions` section from `vercel.json`. Vercel will automatically:
- Detect Node.js runtime from your `package.json` (you have `"node": ">=20.10"`)
- Use the default settings for serverless functions
- The `api/index.js` file will still work as a serverless function

## What Changed

Removed this from `vercel.json`:
```json
"functions": {
  "api/index.js": {
    "runtime": "nodejs20.x",
    "maxDuration": 30
  }
}
```

Vercel will auto-detect and use Node.js 20.x based on your `package.json` engines field.

## Next Steps

1. Commit and push the updated `vercel.json`
2. Vercel will redeploy automatically
3. The build should now succeed

If you need to configure `maxDuration` later, you can add it back using Vercel's correct format, but for now, the default settings should work fine.

