"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Search } from "lucide-react"
import type { UserRole, VerificationStatus } from "@/lib/db/models/user"
import Link from "next/link"
import { getConversations } from "@/lib/actions/messages"

interface DashboardHeaderProps {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    verificationStatus: VerificationStatus
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const loadUnreadCount = async () => {
      const result = await getConversations()
      if (!result.success || !result.data) {
        setUnreadCount(0)
        return
      }

      const totalUnread = result.data.reduce((sum, conversation) => {
        return sum + conversation.unreadCount
      }, 0)

      setUnreadCount(totalUnread)
    }

    loadUnreadCount()
  }, [])

  const hasUnreadNotifications = unreadCount > 0
  const pathSegments = pathname.split("/").filter(Boolean)
  const activeSegment = pathSegments[pathSegments.length - 1] ?? "dashboard"
  const pageLabel = activeSegment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur supports-backdrop-filter:bg-background/70">
      <SidebarTrigger className="-ml-1 rounded-md border border-border/60 bg-background/70 shadow-sm" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-semibold tracking-tight">{pageLabel}</p>
        <p className="text-xs text-muted-foreground">Control Panel Workspace</p>
      </div>
      
      {/* Quick Actions based on role */}
      <div className="flex flex-1 items-center gap-2">
        {user.role === "shipper" && user.verificationStatus === "approved" && (
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/dashboard/shipments/new">
              Create Shipment
            </Link>
          </Button>
        )}
        {user.role === "carrier" && user.verificationStatus === "approved" && (
          <Button asChild size="sm" variant="outline" className="hidden md:inline-flex border-border/70 bg-background/70">
            <Link href="/dashboard/loads">
              <Search className="mr-2 h-4 w-4" />
              Find Loads
            </Link>
          </Button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Role Badge */}
        <Badge variant="outline" className="hidden border-border/70 bg-background/70 capitalize md:inline-flex">
          {user.role}
        </Badge>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-md border border-border/60 bg-background/70 shadow-sm hover:bg-accent/70">
              <Bell className="h-4 w-4" />
              {hasUnreadNotifications && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 border-border/70 bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium">Notifications</span>
              {hasUnreadNotifications && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <Separator />
            <div className="p-4 text-center text-sm text-muted-foreground">
              {hasUnreadNotifications ? (
                <Link href="/dashboard/messages" className="text-primary hover:underline">
                  You have {unreadCount} unread message{unreadCount === 1 ? "" : "s"}
                </Link>
              ) : (
                "No new notifications"
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
