import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'

export default async function AdminDashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminDashboard user={session.user} />
}
