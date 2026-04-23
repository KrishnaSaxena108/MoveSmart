"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, MessageSquare, DollarSign, User, Clock } from "lucide-react"
import { toast } from "sonner"

interface Dispute {
  _id: string
  shipmentId: string
  shipmentTitle: string
  reportedBy: {
    _id: string
    name: string
    email: string
    image?: string
    role: string
  }
  reportedAgainst: {
    _id: string
    name: string
    email: string
    image?: string
    role: string
  }
  reason: string
  description: string
  amount?: number
  status: "open" | "investigating" | "resolved" | "closed"
  createdAt: string
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [resolution, setResolution] = useState("")
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    setDisputes([
      {
        _id: "1",
        shipmentId: "ship1",
        shipmentTitle: "Furniture Delivery - NYC to Boston",
        reportedBy: {
          _id: "user1",
          name: "John Smith",
          email: "john@example.com",
          role: "shipper",
        },
        reportedAgainst: {
          _id: "carrier1",
          name: "Express Logistics",
          email: "express@example.com",
          role: "carrier",
        },
        reason: "Damaged goods",
        description:
          "Several items arrived with visible damage. The dining table has scratches and one chair leg is broken.",
        amount: 450,
        status: "open",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "2",
        shipmentId: "ship2",
        shipmentTitle: "Vehicle Transport - LA to Phoenix",
        reportedBy: {
          _id: "carrier2",
          name: "Auto Movers Inc",
          email: "auto@example.com",
          role: "carrier",
        },
        reportedAgainst: {
          _id: "user2",
          name: "Jane Doe",
          email: "jane@example.com",
          role: "shipper",
        },
        reason: "Non-payment",
        description:
          "Shipper has not released payment code after confirmed delivery. Delivery was completed 5 days ago.",
        amount: 1200,
        status: "investigating",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ])
    setLoading(false)
  }, [])

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.trim()) return

    setResolving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setDisputes((prev) =>
        prev.map((dispute) =>
          dispute._id === selectedDispute._id ? { ...dispute, status: "resolved" as const } : dispute,
        ),
      )

      toast.success("Dispute resolved successfully")
      setSelectedDispute(null)
      setResolution("")
    } catch {
      toast.error("Failed to resolve dispute")
    } finally {
      setResolving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>
      case "investigating":
        return <Badge className="bg-warning text-warning-foreground">Investigating</Badge>
      case "resolved":
        return <Badge className="bg-success text-success-foreground">Resolved</Badge>
      case "closed":
        return <Badge variant="secondary">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispute Resolution</h1>
        <p className="text-muted-foreground">Review and resolve disputes between shippers and carriers</p>
      </div>

      <div className="grid gap-4">
        {disputes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No active disputes</p>
            </CardContent>
          </Card>
        ) : (
          disputes.map((dispute) => (
            <Card key={dispute._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{dispute.reason}</CardTitle>
                    <CardDescription>{dispute.shipmentTitle}</CardDescription>
                  </div>
                  {getStatusBadge(dispute.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{dispute.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={dispute.reportedBy.image} />
                      <AvatarFallback>{dispute.reportedBy.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{dispute.reportedBy.name}</p>
                      <p className="text-xs text-muted-foreground">Reported by ({dispute.reportedBy.role})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={dispute.reportedAgainst.image} />
                      <AvatarFallback>{dispute.reportedAgainst.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{dispute.reportedAgainst.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Reported against ({dispute.reportedAgainst.role})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {dispute.amount && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>${dispute.amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact Parties
                  </Button>
                  <Button variant="outline" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    View Shipment
                  </Button>
                  {dispute.status !== "resolved" && dispute.status !== "closed" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedDispute(dispute)}>
                          Resolve Dispute
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolve Dispute</DialogTitle>
                          <DialogDescription>
                            Provide a resolution for this dispute. Both parties will be notified.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Enter resolution details..."
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <DialogFooter>
                          <Button onClick={handleResolve} disabled={!resolution.trim() || resolving}>
                            {resolving ? "Resolving..." : "Submit Resolution"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}