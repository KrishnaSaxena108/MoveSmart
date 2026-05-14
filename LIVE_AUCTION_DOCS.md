# Live Auction Bidding System Documentation

## Overview

The live auction bidding system allows shippers to create time-based auctions where carriers can bid in real-time. The lowest bidder automatically wins the auction after a 10-second cooldown period.

## System Architecture

### Auction Timeline

1. **Auction Setup** (Shipper creates auction)
   - Shipper sets a "desired time" when they want the auction to end
   - Bidding automatically starts 5 minutes before the desired time
   - Bidding ends at the desired time
   - Winner is selected 10 seconds after the end time (cooldown period)

2. **Active Phase** (5 min before → desired time)
   - Carriers can view and place bids
   - Each carrier can place only one bid per auction
   - Bids must be lower than current lowest bid
   - Bids are updated in real-time

3. **Cooldown Phase** (desired time → 10 seconds after)
   - No more bids accepted
   - System calculates winner (lowest bid)
   - UI shows "Selecting winner..." message

4. **Completed Phase** (after cooldown)
   - Winner is automatically selected and notified
   - All other bids marked as "auction_lost"
   - Shipment status changed to "booked"
   - Lowest bidder becomes the assigned carrier

## Database Schema

### Bid Model Extensions

```typescript
// Live auction specific fields
isLiveAuction?: boolean
auctionStartTime?: Date      // 5 minutes before desired time
auctionEndTime?: Date        // At desired time  
cooldownEndTime?: Date       // 10 seconds after end
isWinner?: boolean
winnerSelectedAt?: Date
```

### Shipment Model Extensions

```typescript
liveAuction?: {
  desiredTime: Date          // When auction should end
  startTime: Date            // 5 minutes before
  endTime: Date              // At desired time
  cooldownEndTime: Date      // 10 seconds after
  winnerId?: ObjectId        // Winning carrier
  winningBidId?: ObjectId    // Winning bid
  winningAmount?: number
  winnerSelectedAt?: Date
}
```

## API Endpoints

### 1. Create Live Auction
**POST** `/api/dashboard/create-live-auction`
```typescript
{
  shipmentId: string
  desiredTime: string (ISO 8601)
}
```

### 2. Place Live Bid
**POST** `/api/dashboard/place-live-bid`
```typescript
{
  shipmentId: string
  amount: number
  estimatedPickup?: Date
  estimatedDelivery?: Date
}
```

### 3. Get Live Auction Bids
**GET** `/api/live-auction/bids?shipmentId=xxx`

### 4. Get Live Auctions
**GET** `/api/live-auction/shipments?limit=20`

### 5. Auto-Select Winner (Cron)
**POST** `/api/shipments/live-auction-winner`
- Requires: `x-api-secret` header with `CRON_SECRET`
- Automatically processes completed auctions and selects winners

## Frontend Components

### 1. CreateLiveAuctionDialog
```typescript
<CreateLiveAuctionDialog
  shipmentId="..."
  isOpen={open}
  onOpenChange={setOpen}
/>
```

Creates a new live auction with:
- Desired end time picker
- Real-time timeline preview
- Validation (minimum 15 minutes from now)

### 2. LiveBidding
```typescript
<LiveBidding
  shipmentId="..."
  liveAuction={auctionInfo}
  bids={bidsList}
  isCarrier={true}
  currentUserId="..."
/>
```

Features:
- Real-time countdown timer
- Live bid updates
- Phase indicator (Pending/Active/Cooldown/Completed)
- Bid placement dialog
- Lowest bid highlighting
- Winner display

### 3. Live Auctions Page
**Route:** `/dashboard/auctions`
- Browse active and completed auctions
- Real-time countdown for each auction
- Quick stats (active, completed, total bids)
- Filter by status

## Server Actions

### createLiveAuction
```typescript
createLiveAuction(input: {
  shipmentId: string
  desiredTime: string
})
```

Creates a new live auction and sets up the timeline.

### placeLiveAuctionBid
```typescript
placeLiveAuctionBid(input: {
  shipmentId: string
  amount: number
  estimatedPickup?: Date
  estimatedDelivery?: Date
})
```

Places or updates a carrier's bid in a live auction.

### getLiveAuctionBids
```typescript
getLiveAuctionBids(shipmentId: string)
```

Fetches all bids for a live auction, sorted by amount (lowest first).

### getLiveAuctionShipments
```typescript
getLiveAuctionShipments(filters?: {
  status?: string
  limit?: number
})
```

Fetches active and upcoming live auction shipments.

### autoSelectWinner
```typescript
autoSelectWinner(shipmentId: string)
```

Automatically selects the winner after cooldown period. Should be called via cron job.

## Setting Up Cron Job

### Option 1: Using EasyCron (Free Service)

1. Visit [easycron.com](https://easycron.com)
2. Create an account
3. Click "Cron Jobs" → "Add"
4. Configure:
   - **URL:** `https://your-app.com/api/shipments/live-auction-winner`
   - **Frequency:** Every 10 seconds
   - **Request method:** POST
   - **HTTP Headers:** Add header `x-api-secret: YOUR_CRON_SECRET`
5. Save

### Option 2: Using GitHub Actions

Create `.github/workflows/live-auction-winner.yml`:

```yaml
name: Live Auction Winner Selection

on:
  schedule:
    - cron: '*/1 * * * *'  # Every minute
  workflow_dispatch:

jobs:
  select-winner:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-winner endpoint
        run: |
          curl -X POST https://your-app.com/api/shipments/live-auction-winner \
            -H "x-api-secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### Option 3: Using Node-Cron (Local/Self-hosted)

Create `lib/cron/live-auction-winner.ts`:

```typescript
import cron from 'node-cron'
import { autoSelectWinner } from '@/lib/actions/live-auction'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Shipment } from '@/lib/db/models/shipment'

// Run every 10 seconds
cron.schedule('*/10 * * * * *', async () => {
  try {
    await connectToDatabase()
    
    const now = new Date()
    const auctions = await Shipment.find({
      'liveAuction.cooldownEndTime': {
        $lte: now,
        $gt: new Date(now.getTime() - 60000)
      },
      'liveAuction.winnerId': { $exists: false }
    })

    for (const auction of auctions) {
      await autoSelectWinner(auction._id.toString())
    }
  } catch (error) {
    console.error('Cron error:', error)
  }
})
```

## Environment Variables

Add to `.env.local`:

```
CRON_SECRET=your-secret-key-here
```

The cron endpoint validates this secret to prevent unauthorized access.

## Real-Time Updates

The system uses Ably for real-time bid updates. Ensure you have Ably integration set up:

```
NEXT_PUBLIC_ABLY_KEY=your-ably-key
```

See [lib/ably/client.ts](../../lib/ably/client.ts) for Ably configuration.

## User Flows

### As a Shipper

1. Create a shipment with "auction" listing type
2. View shipment detail page
3. Click "Create Live Auction"
4. Set desired end time
5. Review auction timeline
6. Confirm creation
7. View live bids in real-time
8. Winner automatically selected after cooldown

### As a Carrier

1. Go to `/dashboard/auctions`
2. Browse active live auctions
3. Click on an auction
4. If auction is active, click "Place Bid"
5. Enter bid amount (must be lower than current lowest)
6. Submit bid
7. Bid updates in real-time
8. If you have the lowest bid when auction ends, you automatically win
9. Shipment assigned and notification sent

## Testing

### Test Auction Creation

```bash
curl -X POST http://localhost:3000/api/live-auction/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "shipmentId": "...",
    "desiredTime": "2026-05-14T16:00:00Z"
  }'
```

### Test Bid Placement

```bash
curl -X POST http://localhost:3000/api/live-auction/bid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "shipmentId": "...",
    "amount": 250
  }'
```

### Test Auto-Winner Selection

```bash
curl -X POST http://localhost:3000/api/shipments/live-auction-winner \
  -H "x-api-secret: YOUR_CRON_SECRET"
```

Response:
```json
{
  "success": true,
  "message": "Processed X auctions, Y failed",
  "data": {
    "processed": 5,
    "failed": 0,
    "total": 5
  }
}
```

## Troubleshooting

### Bids not appearing in real-time
- Check Ably key configuration
- Verify WebSocket connection in browser dev tools
- Check browser console for errors

### Winner not auto-selected
- Verify cron job is running
- Check CRON_SECRET is correct
- Check server logs for errors
- Verify MongoDB connection

### Bid validation errors
- Ensure bid amount is lower than current lowest
- Verify carrier is verified (verificationStatus === 'approved')
- Check auction hasn't ended

## Future Enhancements

1. **Reserve Price**: Minimum bid threshold
2. **Proxy Bidding**: Automatic bid increments
3. **Sniping Protection**: Extend auction if bid placed near end
4. **Bid History**: Track all bid changes
5. **Instant Re-bid**: Quickly rebid if outbid
6. **Auction Analytics**: Performance metrics and statistics
7. **Smart Notifications**: Push/email notifications for bid events
8. **Multi-lot Auctions**: Bundle multiple shipments
