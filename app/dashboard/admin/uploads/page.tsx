import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getPendingVerifications } from '@/lib/actions/admin'
import { FileText, Download, Eye, Trash2, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

export const metadata = {
  title: 'Document Management',
}

export default async function UploadsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all pending verifications to show uploaded documents
  const result = await getPendingVerifications({ limit: 100 })
  const users = result.data?.users || []

  // Collect all documents from all users
  const allDocuments = users.flatMap((user: any) =>
    (user.documents || []).map((doc: any) => ({
      _id: `${user._id}-${doc.type}`,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      ...doc,
    }))
  )

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      drivers_license: "Driver's License",
      dot_number: 'DOT Number',
      mc_number: 'MC Number',
      insurance: 'Insurance Certificate',
      business_license: 'Business License',
      vehicle_registration: 'Vehicle Registration',
      operating_authority: 'Operating Authority',
      cargo_insurance: 'Cargo Insurance',
      liability_insurance: 'Liability Insurance',
    }
    return labels[type] || type.replace(/_/g, ' ')
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'carrier':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
      case 'shipper':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
            <p className="text-sm text-muted-foreground sm:text-base mt-2">
              Review and manage all uploaded verification documents from users.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/admin/verifications">
                Review Verifications
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{allDocuments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              From {users.length} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Users awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Document Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {new Set(allDocuments.map(d => d.type)).size}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Unique document types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Uploaded Documents</CardTitle>
          <CardDescription>
            {allDocuments.length} documents from verification submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDocuments.map((doc: any) => (
                    <TableRow key={doc._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.userName}</p>
                          <p className="text-sm text-muted-foreground">{doc.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getRoleColor(doc.userRole)}>
                          {doc.userRole === 'carrier' ? 'Carrier' : 'Shipper'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {getDocumentTypeLabel(doc.type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            title="View document"
                          >
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            title="Download document"
                          >
                            <a 
                              href={doc.url} 
                              download
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="View user verification"
                            asChild
                          >
                            <Link href={`/dashboard/admin/verifications?userId=${doc.userId}`}>
                              Review
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">No documents uploaded</p>
              <p className="text-sm text-muted-foreground">
                Uploaded documents from user verifications will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
