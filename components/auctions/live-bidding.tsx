"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow, formatRelative } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { placeLiveAuctionBid } from "@/lib/actions/live-auction"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Gavel, TrendingDown, Clock, CheckCircle, AlertCircle, Flame } from "lucide-react"

interface Bid {
  _id: string
  carrier: {
    _id: string
    name: string
    email: string
    image?: string
    rating?: number
  }
  amount: number
  isWinner?: boolean
  createdAt: Date
}

interface LiveAuctionInfo {
  startTime: Date
  endTime: Date
  cooldownEndTime: Date
  winnerId?: string
  winningAmount?: number
  winnerSelectedAt?: Date
}

interface LiveBiddingProps {
  shipmentId: string
  liveAuction: LiveAuctionInfo
  bids: Bid[]
  isCarrier: boolean
  currentUserId: string
  onBidsUpdate?: (bids: Bid[]) => void
}

export function LiveBidding({
  shipmentId,
  liveAuction,
  bids: initialBids,
  isCarrier,
  currentUserId,
  onBidsUpdate,
}: LiveBiddingProps) {
  const router = useRouter()
  const [bids, setBids] = useState<Bid[]>(initialBids)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isActive, setIsActive] = useState(false)
  const [inCooldown, setInCooldown] = useState(false)
  const [showBidDialog, setShowBidDialog] = useState(false)
  const [bidAmount, setBidAmount] = useState("")
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [phase, setPhase] = useState<"pending" | "active" | "cooldown" | "completed">("pending")

  // Update auction state based on current time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()

      if (now >= liveAuction.cooldownEndTime) {
        setPhase("completed")
        setIsActive(false)
        setInCooldown(false)
        setTimeLeft("Auction Ended")
      } else if (now >= liveAuction.endTime) {
        setPhase("cooldown")
        setIsActive(false)
        setInCooldown(true)
        const secondsLeft = Math.floor(
          (liveAuction.cooldownEndTime.getTime() - now.getTime()) / 1000
        )
        setTimeLeft(`Winner selecting in ${secondsLeft}s`)
      } else if (now >= liveAuction.startTime) {
        setPhase("active")
        setIsActive(true)
        setInCooldown(false)
        const secondsLeft = Math.floor(
          (liveAuction.endTime.getTime() - now.getTime()) / 1000
        )
        setTimeLeft(`${secondsLeft}s left`)
      } else {
        setPhase("pending")
        setIsActive(false)
        setInCooldown(false)
        const secondsLeft = Math.floor(
          (liveAuction.startTime.getTime() - now.getTime()) / 1000
        )
        const minutes = Math.floor(secondsLeft / 60)
        const seconds = secondsLeft % 60
        setTimeLeft(`Starts in ${minutes}m ${seconds}s`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [liveAuction])

  const handlePlaceBid = async () => {
    if (!bidAmount || isNaN(parseFloat(bidAmount))) {
      toast.error("Please enter a valid bid amount")
      return
    }

    const amount = parseFloat(bidAmount)
    const lowestBid = bids.length > 0 ? Math.min(...bids.map((b) => b.amount)) : Infinity

    if (amount >= lowestBid) {
      toast.error(`Your bid must be lower than current lowest bid ($${lowestBid.toFixed(2)})`)
      return
    }

    setIsPlacingBid(true)
    try {
      const result = await placeLiveAuctionBid({
        shipmentId,
        amount,
      })

      if (result.success) {
        toast.success("Bid placed successfully!")
        setBidAmount("")
        setShowBidDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to place bid")
      }
    } catch (error) {
      console.error("Error placing bid:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsPlacingBid(false)
    }
  }

  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount)
  const lowestBid = sortedBids[0]
  const userBid = bids.find((b) => b.carrier._id === currentUserId)

  const getPhaseColor = () => {
    switch (phase) {
      case "pending":
        return "bg-slate-500/10"
      case "active":
        return "bg-green-500/10"
      case "cooldown":
        return "bg-yellow-500/10"
      case "completed":
        return "bg-blue-500/10"
      default:
        return "bg-slate-500/10"
    }
  }

  const getPhaseIcon = () => {
    switch (phase) {
      case "pending":
        return <Clock className="h-5 w-5 text-slate-600" />
      case "active":
        return <Flame className="h-5 w-5 text-green-600 animate-pulse" />
      case "cooldown":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Auction Header */}
      <Card className={cn("border-2", getPhaseColor())}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPhaseIcon()}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Live Auction
                </CardTitle>
                <CardDescription className="mt-1">
                  {phase === "pending" && "Auction hasn't started yet"}
                  {phase === "active" && "Auction is live - Place your bid now!"}
                  {phase === "cooldown" && "Auction ended - Selecting winner..."}
                  {phase === "completed" && "Auction completed"}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{timeLeft}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {phase === "pending" && `Starts at ${formatRelative(liveAuction.startTime, new Date())}`}
                {phase === "active" && `Ends at ${formatRelative(liveAuction.endTime, new Date())}`}
                {phase !== "pending" && phase !== "active" && `Cooldown until ${formatRelative(liveAuction.cooldownEndTime, new Date())}`}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bids Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Live Bids ({bids.length})
            </CardTitle>
            <CardDescription>
              {isActive
                ? "Lowest bid wins when auction ends"
                : "Auction is not active"}
            </CardDescription>
          </div>
          {isCarrier && isActive && (
            <Button onClick={() => setShowBidDialog(true)}>
              Place Bid
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedBids.length > 0 ? (
            sortedBids.map((bid, index) => (
              <div
                key={bid._id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  index === 0 && "border-green-500 bg-green-500/5",
                  bid.carrier._id === currentUserId && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={bid.carrier.image} />
                    <AvatarFallback>
                      {bid.carrier.name?.split(" ").map((n) => n[0]).join("") || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{bid.carrier.name}</p>
                      {index === 0 && <Badge>Lowest</Badge>}
                      {bid.isWinner && <Badge className="bg-green-600">Winner</Badge>}
                      {bid.carrier._id === currentUserId && <Badge variant="outline">Your Bid</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    ${bid.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bids yet</p>
              {isCarrier && isActive && (
                <p className="text-sm text-muted-foreground mt-2">Be the first to bid!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Bid Section */}
      {userBid && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle>Your Current Bid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bid Amount</p>
                <p className="text-3xl font-bold">${userBid.amount.toFixed(2)}</p>
              </div>
              {isActive && (
                <Button onClick={() => setShowBidDialog(true)} variant="outline">
                  Update Bid
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bid Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place a Bid</DialogTitle>
            <DialogDescription>
              Enter an amount lower than the current lowest bid to win the auction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {lowestBid && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Lowest Bid</p>
                <p className="text-2xl font-bold">${lowestBid.amount.toFixed(2)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bid-amount">Your Bid Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">$</span>
                <Input
                  id="bid-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  disabled={isPlacingBid}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your bid must be lower than ${lowestBid?.amount.toFixed(2) || "∞"} to win
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBidDialog(false)}
              disabled={isPlacingBid}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlaceBid}
              disabled={isPlacingBid || !isActive}
            >
              {isPlacingBid ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Placing Bid...
                </>
              ) : (
                "Place Bid"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
