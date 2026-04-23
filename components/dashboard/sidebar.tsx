"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  Package,
  LayoutDashboard,
  PlusCircle,
  Search,
  MessageSquare,
  Star,
  Settings,
  LogOut,
  ChevronUp,
  Route,
  Clock,
  DollarSign,
  Users,
  Shield,
  FileText,
  HelpCircle,
  Bell,
} from "lucide-react"
import { logoutUser } from "@/lib/actions/auth"
import type { UserRole, VerificationStatus } from "@/lib/db/models/user"

interface DashboardSidebarProps {
  user: {
    id: string
    name: string
    email: string
    image?: string
    role: UserRole
    verificationStatus: VerificationStatus
  }
}

const shipperNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Shipments",
    href: "/dashboard/shipments",
    icon: Package,
  },
  {
    title: "Create Shipment",
    href: "/dashboard/shipments/new",
    icon: PlusCircle,
  },
  {
    title: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    title: "Reviews",
    href: "/dashboard/reviews",
    icon: Star,
  },
]

const carrierNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Find Loads",
    href: "/dashboard/loads",
    icon: Search,
  },
  {
    title: "Route Search",
    href: "/dashboard/loads/route",
    icon: Route,
  },
  {
    title: "Instant Pickups",
    href: "/dashboard/loads/instant",
    icon: Clock,
  },
  {
    title: "My Bids",
    href: "/dashboard/bids",
    icon: DollarSign,
  },
  {
    title: "My Jobs",
    href: "/dashboard/jobs",
    icon: Truck,
  },
  {
    title: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    title: "Reviews",
    href: "/dashboard/reviews",
    icon: Star,
  },
]

const adminNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Verifications",
    href: "/dashboard/admin/verifications",
    icon: Shield,
  },
  {
    title: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    title: "Shipments",
    href: "/dashboard/admin/shipments",
    icon: Package,
  },
  {
    title: "Disputes",
    href: "/dashboard/admin/disputes",
    icon: FileText,
  },
  {
    title: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
]

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  
  const navItems = user.role === "admin" 
    ? adminNavItems 
    : user.role === "carrier" 
      ? carrierNavItems 
      : shipperNavItems

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const roleLabel = user.role === "admin" ? "Admin" : user.role === "carrier" ? "Carrier" : "Shipper"

  const verificationTone =
    user.verificationStatus === "approved"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : user.verificationStatus === "pending"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-rose-500/10 text-rose-700 dark:text-rose-400"

  return (
    <Sidebar className="border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur-sm">
      <SidebarHeader className="border-b border-sidebar-border/70 p-3">
        <Link
          href="/dashboard"
          className="group relative overflow-hidden rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 px-3 py-3"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_55%)]" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">MoveSmart</p>
              <p className="text-xs text-muted-foreground">Operations Control</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
              {roleLabel}
            </Badge>
          </div>
        </Link>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 px-2 py-1.5">
          <span className="text-xs text-muted-foreground">Account Status</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${verificationTone}`}>
            {user.verificationStatus}
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Verification Status */}
        {user.verificationStatus === "pending" && (
          <div className="mx-3 mt-3 rounded-lg bg-warning/10 p-3">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-medium text-warning">Verification Pending</p>
                <p className="text-xs text-muted-foreground">
                  Complete your profile to unlock all features
                </p>
              </div>
            </div>
          </div>
        )}
        
        <SidebarGroup className="pt-3">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60">
            {roleLabel} Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-9 rounded-lg text-[13px] data-[active=true]:bg-primary/12 data-[active=true]:text-foreground data-[active=true]:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/help"}
                  className="h-9 rounded-lg text-[13px] data-[active=true]:bg-primary/12 data-[active=true]:text-foreground"
                >
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4" />
                    <span>Help Center</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 bg-sidebar-accent/10 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto rounded-lg border border-sidebar-border/60 bg-sidebar px-2 py-2 shadow-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutUser} className="w-full">
                    <button type="submit" className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
