import { redirect } from 'next/navigation'

interface LoadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LoadDetailPage({ params }: LoadDetailPageProps) {
  const { id } = await params
  
  // Redirect to shipment detail page (loads are essentially shipments from carrier perspective)
  redirect(`/dashboard/shipments/${id}`)
}
