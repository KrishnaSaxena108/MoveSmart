import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, FileText, Upload, CheckCircle2, Clock3, AlertTriangle } from "lucide-react"

export default async function VerificationSettingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const status = session.user.verificationStatus
  const statusLabel =
    status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"
  const statusTone =
    status === "approved"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : "secondary"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <p className="text-muted-foreground">
          Review your account verification status and submit any required documents.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Account Status
            </CardTitle>
            <CardDescription>
              Your current verification state in MoveSmart.
            </CardDescription>
          </div>
          <Badge variant={statusTone}>{statusLabel}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock3 className="h-4 w-4 text-warning" />
                Pending Review
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Submit your business and identity documents for manual review.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Required Documents
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Government ID, business registration, and insurance proof.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Approved Accounts
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Verified users can post shipments, place bids, and access more features.
              </p>
            </div>
          </div>

          {status !== "approved" ? (
            <div className="rounded-lg border border-dashed p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 text-warning" />
                <div className="space-y-2">
                  <h2 className="font-semibold">Finish verification</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload the requested documents from your profile page or contact support if your review is delayed.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button asChild>
                      <a href="/dashboard/profile">
                        <Upload className="mr-2 h-4 w-4" />
                        Go to Profile
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/help">Contact Support</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-success/20 bg-success/5 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-success" />
                <div className="space-y-1">
                  <h2 className="font-semibold">Verification complete</h2>
                  <p className="text-sm text-muted-foreground">
                    Your account is verified. You now have access to the full platform.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
