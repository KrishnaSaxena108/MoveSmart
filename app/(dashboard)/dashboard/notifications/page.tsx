import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDashboardNotifications } from "@/lib/actions/dashboard"
import { formatDistanceToNow } from "date-fns"

export default async function NotificationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const feedResult = await getDashboardNotifications(session.user.id)
  const notifications = feedResult.success ? feedResult.data.notifications : []
  const unreadCount = feedResult.success ? feedResult.data.unreadCount : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Alerts and activity updates from your live database records.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            {notifications.length} recent updates • {unreadCount} unread messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/80 p-4 transition-colors hover:bg-accent/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.unread && <Badge variant="default" className="h-5 px-1.5 text-[10px]">Unread</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No notifications found in the database for your account yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
