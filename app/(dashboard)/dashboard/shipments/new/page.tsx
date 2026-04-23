import { Metadata } from "next"
import { CreateShipmentWizard } from "@/components/shipments/create-shipment-wizard"

export const metadata: Metadata = {
  title: "Create Shipment",
  description: "Post a new shipment and get competitive quotes from verified carriers",
}

export default function NewShipmentPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Shipment</h1>
        <p className="mt-2 text-muted-foreground">
          Post your shipment and receive competitive bids from verified carriers
        </p>
      </div>
      <CreateShipmentWizard />
    </div>
  )
}
