"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface UsersTableProps {
  users: Array<{
    _id: string
    name: string
    email: string
    role: string
    rating?: number
    completedShipments?: number
    verificationStatus: string
    createdAt: Date
    lastLogin?: Date
  }>
  totalCount: number
  currentPage: number
  pageSize: number
  filters: {
    role?: string
    status?: string
    search?: string
  }
}

const verificationBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
}

export function UsersTable({
  users,
  totalCount,
  currentPage,
  pageSize,
  filters,
}: UsersTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const createPageHref = (page: number) => {
    const params = new URLSearchParams()

    if (filters.role) params.set("role", filters.role)
    if (filters.status) params.set("status", filters.status)
    if (filters.search) params.set("search", filters.search)
    params.set("page", page.toString())

    return `/dashboard/admin/users?${params.toString()}`
  }

  const formatDate = (value: Date | string) => {
    return format(new Date(value), "dd/MM/yyyy")
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {users.length} of {totalCount} users
          </div>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No users match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={verificationBadgeVariant[user.verificationStatus] ?? "outline"}>
                      {user.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{typeof user.rating === "number" ? user.rating.toFixed(1) : "N/A"}</TableCell>
                  <TableCell>{user.completedShipments ?? 0}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <Link
            href={createPageHref(Math.max(1, currentPage - 1))}
            className={`text-sm ${currentPage <= 1 ? "pointer-events-none text-muted-foreground/50" : "text-primary hover:underline"}`}
          >
            Previous
          </Link>
          <Link
            href={createPageHref(Math.min(totalPages, currentPage + 1))}
            className={`text-sm ${currentPage >= totalPages ? "pointer-events-none text-muted-foreground/50" : "text-primary hover:underline"}`}
          >
            Next
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
