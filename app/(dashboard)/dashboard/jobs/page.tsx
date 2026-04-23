import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getShipments } from "@/lib/actions/shipments"
import { formatDistanceToNow } from "date-fns"

export default async function JobsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }

  const jobsResult = await getShipments({
    carrierId: session.user.id,
    limit: 25,
  })
  const jobs = jobsResult.success ? jobsResult.shipments : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
        <p className="text-muted-foreground">Carrier job assignments will appear here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Assigned Shipments</CardTitle>
          <CardDescription>{jobs.length} jobs loaded from shipment records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobs.length > 0 ? (
            jobs.map((job: any) => (
              <div key={job._id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/80 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{job.items?.[0]?.description || "Shipment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.pickup?.city || "-"}, {job.pickup?.state || "-"} to {job.delivery?.city || "-"}, {job.delivery?.state || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{job.status?.replace("_", " ")}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/shipments/${job._id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No jobs found in the database for your account yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
