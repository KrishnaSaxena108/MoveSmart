import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "For Carriers",
}

export default function CarriersPage() {
  return (
    <div className="container py-12 space-y-8">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">For carriers</p>
        <h1 className="text-4xl font-bold tracking-tight">Find more loads and win better freight</h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse available shipments, bid on the ones that fit your lanes, and build stronger shipper relationships.
        </p>
        <Button asChild>
          <Link href="/auth/register?role=carrier">Join as a carrier</Link>
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Load discovery</CardTitle>
            <CardDescription>Search by lane, route, and urgency.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bidding</CardTitle>
            <CardDescription>Compete on price and win recurring freight.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verification</CardTitle>
            <CardDescription>Get approved once and unlock the full marketplace.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
