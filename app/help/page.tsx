import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, CircleHelp, MessageSquare, ShieldCheck, Truck } from "lucide-react"

export const metadata = {
  title: "Help Center",
}

export default function HelpPage() {
  return (
    <div className="container py-10 space-y-8">
      <section className="rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-background p-6 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">Support Control Panel</Badge>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Help Center</h1>
            <p className="max-w-2xl text-muted-foreground">
              Find answers, account guidance, and support entry points for common MoveSmart workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">
                Go to dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/messages">
                <MessageSquare className="mr-2 h-4 w-4" />
                Open messages
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Account access
            </CardTitle>
            <CardDescription>Login, registration, and verification issues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use auth screens to create an account, recover access, or complete verification steps.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login">Open login</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Shipments
            </CardTitle>
            <CardDescription>Posting, editing, and tracking freight.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Manage routes, booking flow, disputes, and shipment lifecycle from dashboard tools.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-primary" />
              Support
            </CardTitle>
            <CardDescription>Contact the team when you need manual help.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>If an issue blocks your workflow, use in-app messaging and provide shipment/order context.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/messages">Contact via messages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
