# Live Auction System - Setup Checklist

## Status: ✅ IMPLEMENTATION COMPLETE

All code is in place and error-free. Follow this checklist to enable the system.

---

## Step 1: Environment Variables

Add these to `.env.local`:

```bash
# Live Auction Cron Secret
CRON_SECRET=your-random-secure-secret-here
```

**How to generate a secure secret:**
```bash
# Option A: Using openssl
openssl rand -base64 32

# Option B: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 2: Configure Cron Job

Choose ONE of these options to run the auto-winner selection every 10-15 seconds:

### Option A: EasyCron (Recommended for Most Users)

1. Go to https://easycron.com and sign up (free)
2. Click "Cron Jobs" → "Add"
3. Fill in:
   - **Cron URL**: `https://yourdomain.com/api/shipments/live-auction-winner`
   - **Cron Expression**: `*/1 * * * * *` (every 1 second) or `*/10 * * * * *` (every 10 seconds)
   - **HTTP Method**: `POST`
   - **Custom HTTP Headers**: Add the following header
     ```
     x-api-secret: YOUR_CRON_SECRET_VALUE
     Content-Type: application/json
     ```
4. Click "Save"
5. Test it: Click "Run now" to verify it works

**Verification:**
- Go to `/api/shipments/live-auction-winner?action=stats` to see cron stats
- Should return JSON with activeAuctions, pendingWinners, completedAuctions

### Option B: GitHub Actions (Self-hosted on GitHub)

1. Create file: `.github/workflows/live-auction-cron.yml`

```yaml
name: Live Auction Winner Selection

on:
  schedule:
    # Run every 10 seconds (GitHub's minimum is every minute)
    # For more frequent execution, use a different service
    - cron: '* * * * *'  
  workflow_dispatch:

jobs:
  select-winner:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-winner endpoint
        run: |
          curl -X POST \
            -H "x-api-secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://yourdomain.com/api/shipments/live-auction-winner
```

2. Add `CRON_SECRET` to GitHub repository secrets
3. Commit and push

**Note**: GitHub Actions has a minimum frequency of 1 minute. For 10-second intervals, use EasyCron or self-hosted option.

### Option C: Vercel Crons (If using Vercel hosting)

1. Update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/shipments/live-auction-winner",
      "schedule": "0 * * * *"
    }
  ]
}
```

2. Add `CRON_SECRET` to Vercel environment variables
3. Deploy

### Option D: Node-Cron (Self-hosted/Local)

1. Install dependency:
```bash
npm install node-cron
```

2. Create file: `lib/cron/live-auction-winner.ts`

```typescript
import cron from 'node-cron'
import { Shipment } from '@/lib/db/models/shipment'
import { autoSelectWinner } from '@/lib/actions/live-auction'
import { connectToDatabase } from '@/lib/db/mongodb'

export function startLiveAuctionCron() {
  // Run every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    try {
      await connectToDatabase()
      
      const now = new Date()
      const completed = await Shipment.find({
        'liveAuction.cooldownEndTime': {
          $lte: now,
          $gte: new Date(now.getTime() - 60000) // Last 1 minute
        },
        'liveAuction.winnerId': { $exists: false }
      })

      for (const shipment of completed) {
        await autoSelectWinner(shipment._id.toString())
      }
      
      console.log(`[LiveAuctionCron] Processed ${completed.length} completed auctions`)
    } catch (error) {
      console.error('[LiveAuctionCron] Error:', error)
    }
  })
  
  console.log('[LiveAuctionCron] Started - running every 10 seconds')
}
```

3. Initialize in server startup (`server.ts` or `app.ts`):

```typescript
import { startLiveAuctionCron } from '@/lib/cron/live-auction-winner'

// In your server initialization
if (process.env.NODE_ENV === 'production') {
  startLiveAuctionCron()
}
```

---

## Step 3: Verify Setup

### 1. Check Environment Variable
```bash
echo $CRON_SECRET
# Should output your secret (not empty)
```

### 2. Test Cron Endpoint Manually

```bash
curl -X POST http://localhost:3000/api/shipments/live-auction-winner \
  -H "x-api-secret: your-secret-here" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Processed 0 auctions, 0 failed",
  "data": {
    "processed": 0,
    "failed": 0
  }
}
```

### 3. Check Cron Stats

```bash
curl http://localhost:3000/api/shipments/live-auction-winner?action=stats \
  -H "x-api-secret: your-secret-here"
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "activeAuctions": 0,
    "pendingWinners": 0,
    "completedAuctions": 0
  }
}
```

---

## Step 4: Test the Live Auction Feature

### Create Test Auction

1. Go to `/dashboard` (as shipper)
2. Create a shipment with "auction" listing type
3. View shipment detail
4. Click "Create Live Auction"
5. Set desired end time to 2 minutes from now
6. Click "Create"
7. Copy the shipment ID

### Place Test Bids

1. Switch to carrier account (different browser/incognito)
2. Go to `/dashboard/auctions`
3. Find your test auction
4. Click it
5. Wait for bidding to start
6. Click "Place Bid"
7. Enter amount (must be lower than any existing bid)
8. Submit

### Verify Auto-Winner

1. Wait for auction to end
2. Verify winner automatically selected
3. Check shipment status changed to "booked"
4. Winner carrier should receive notification

---

## Troubleshooting

### Cron Not Running
- Verify `CRON_SECRET` is set correctly
- Check cron endpoint logs for errors
- Verify header name is exactly `x-api-secret` (case-sensitive)
- Test endpoint manually with curl

### Winner Not Selected
- Check browser console for errors
- Check server logs for auction processing
- Verify cron is running every 10-15 seconds
- Check database for `liveAuction.winnerId` being set

### Bids Not Updating in Real-Time
- Check Ably configuration (`NEXT_PUBLIC_ABLY_KEY`)
- Verify WebSocket connection in browser Network tab
- Check browser console for JavaScript errors
- Restart development server

### Bid Validation Errors
- Verify bid amount is lower than current lowest bid
- Verify carrier account is verified (verificationStatus = 'approved')
- Check auction hasn't ended yet
- Check carrier has placed bid before (should update, not create new)

---

## Monitoring

### Check Active Auctions
```bash
curl http://localhost:3000/api/live-auction/shipments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Auction Bids
```bash
curl "http://localhost:3000/api/live-auction/bids?shipmentId=SHIPMENT_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Cron Audit Log
Check MongoDB collection: `shipments` 
Filter by `liveAuction.winnerId: { $exists: true }`

---

## Next Steps

1. ✅ Code implementation - DONE
2. ⬜ Set environment variable `CRON_SECRET`
3. ⬜ Configure cron job (choose one option above)
4. ⬜ Test live auction feature
5. ⬜ Deploy to production
6. ⬜ Monitor first live auctions

---

## File Reference

### Core Files
- Database Models: `/lib/db/models/bid.ts`, `/lib/db/models/shipment.ts`
- Server Actions: `/lib/actions/live-auction.ts`
- Cron Endpoint: `/app/api/shipments/live-auction-winner/route.ts`
- Components: `/components/auctions/live-bidding.tsx`, `/components/auctions/create-live-auction-dialog.tsx`
- Pages: `/app/(dashboard)/dashboard/auctions/page.tsx`

### Documentation
- Full documentation: `/LIVE_AUCTION_DOCS.md`
- API reference included in `/lib/actions/live-auction.ts` comments

---

## Support

For issues or questions:
1. Check `/LIVE_AUCTION_DOCS.md` for detailed documentation
2. Review error messages in browser console and server logs
3. Verify all environment variables are set
4. Test cron endpoint manually with curl
