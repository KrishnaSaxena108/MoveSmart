"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createLiveAuction } from "@/lib/actions/live-auction"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, Clock, Gavel } from "lucide-react"
import { format } from "date-fns"

interface CreateLiveAuctionProps {
  shipmentId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateLiveAuctionDialog({
  shipmentId,
  isOpen,
  onOpenChange,
}: CreateLiveAuctionProps) {
  const router = useRouter()
  const [desiredTime, setDesiredTime] = useState("")
  const [, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!desiredTime) {
      toast.error("Please select a desired auction time")
      return
    }

    setIsLoading(true)
    try {
      startTransition(async () => {
        const result = await createLiveAuction({
          shipmentId,
          desiredTime,
        })

        if (result.success) {
          toast.success("Live auction created successfully!")
          onOpenChange(false)
          setDesiredTime("")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to create live auction")
        }
      })
    } catch (error) {
      console.error("Error creating live auction:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate minimum time (15 minutes from now for testing, can be adjusted)
  const now = new Date()
  const minTime = new Date(now.getTime() + 15 * 60 * 1000)
  const minTimeISO = minTime.toISOString().slice(0, 16)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Create Live Auction
          </DialogTitle>
          <DialogDescription>
            Set when you want the auction to start receiving bids. Bidding will start 5 minutes before the desired time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Timeline Info */}
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-muted-foreground flex-0" />
              <div>
                <p className="font-medium">Auction Timeline</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Bidding starts 5 minutes before your desired time
                </p>
              </div>
            </div>

            <div className="ml-8 space-y-2 text-xs text-muted-foreground border-l-2 border-muted pl-3 py-2">
              <p>• <strong>5 min before:</strong> Bidding opens</p>
              <p>• <strong>At desired time:</strong> Bidding closes</p>
              <p>• <strong>10 seconds after:</strong> Lowest bid automatically wins</p>
            </div>
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label htmlFor="desired-time">Desired Auction End Time</Label>
            <Input
              id="desired-time"
              type="datetime-local"
              value={desiredTime}
              onChange={(e) => setDesiredTime(e.target.value)}
              min={minTimeISO}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 15 minutes from now
            </p>
          </div>

          {/* Preview */}
          {desiredTime && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Auction Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bidding Starts:</span>
                  <span className="font-medium">
                    {format(
                      new Date(new Date(desiredTime).getTime() - 5 * 60 * 1000),
                      "MMM d, h:mm a"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bidding Ends:</span>
                  <span className="font-medium">
                    {format(new Date(desiredTime), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Winner Selected:</span>
                  <span className="font-medium">
                    {format(
                      new Date(new Date(desiredTime).getTime() + 10 * 1000),
                      "MMM d, h:mm:ss a"
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !desiredTime}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Creating...
              </>
            ) : (
              "Create Auction"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
