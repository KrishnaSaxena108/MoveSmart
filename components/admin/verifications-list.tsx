"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Truck,
  User,
} from 'lucide-react'
import { format } from 'date-fns'
import { approveVerification, rejectVerification } from '@/lib/actions/admin'
import { toast } from 'sonner'

interface VerificationUser {
  _id: string
  name: string
  email: string
  role: string
  documents: Array<{
    type: string
    url: string
    uploadedAt: Date
  }>
  createdAt: Date
}

interface VerificationsListProps {
  initialUsers: VerificationUser[]
  totalCount: number
}

export function VerificationsList({
  initialUsers,
  totalCount,
}: VerificationsListProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [selectedUser, setSelectedUser] = useState<VerificationUser | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleApprove = async (userId: string) => {
    setIsLoading(userId)
    try {
      const result = await approveVerification(userId)
      if (result.success) {
        toast.success('User verified successfully')
        setUsers((prev) => prev.filter((u) => u._id !== userId))
        setSelectedUser(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve verification')
      }
    } catch (error) {
      console.error('Error approving verification:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selectedUser || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setIsLoading(selectedUser._id)
    try {
      const result = await rejectVerification(selectedUser._id, rejectReason)
      if (result.success) {
        toast.success('Verification rejected')
        setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id))
        setShowRejectDialog(false)
        setSelectedUser(null)
        setRejectReason('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject verification')
      }
    } catch (error) {
      console.error('Error rejecting verification:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(null)
    }
  }

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      drivers_license: "Driver's License",
      dot_number: 'DOT Number',
      mc_number: 'MC Number',
      insurance: 'Insurance Certificate',
      business_license: 'Business License',
    }
    return labels[type] || type
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-success mb-4" />
          <p className="text-lg font-medium">All Caught Up!</p>
          <p className="text-muted-foreground">
            No pending verifications at this time
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Verifications
          </CardTitle>
          <CardDescription>
            {totalCount} users awaiting verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.role === 'carrier' ? (
                        <>
                          <Truck className="h-3 w-3 mr-1" />
                          Carrier
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Shipper
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.documents.map((doc, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {getDocumentLabel(doc.type)}
                        </Badge>
                      ))}
                      {user.documents.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          No documents
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(user._id)}
                        disabled={isLoading === user._id}
                      >
                        {isLoading === user._id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={!!selectedUser && !showRejectDialog}
        onOpenChange={() => setSelectedUser(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Verification</DialogTitle>
            <DialogDescription>
              Review the user&apos;s submitted documents and information
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="secondary">{selectedUser.role}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied On</p>
                  <p className="font-medium">
                    {format(new Date(selectedUser.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Submitted Documents</p>
                {selectedUser.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.documents.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">
                              {getDocumentLabel(doc.type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded{' '}
                              {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No documents submitted
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(true)
              }}
              disabled={isLoading !== null}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={() => selectedUser && handleApprove(selectedUser._id)}
              disabled={isLoading !== null}
            >
              {isLoading === selectedUser?._id ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request.
              The user will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isLoading !== null || !rejectReason.trim()}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
