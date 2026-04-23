import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "How It Works",
}

const steps = [
  {
    title: "Post a shipment",
    description: "Add pickup, delivery, cargo, and timing details in a few minutes.",
  },
  {
    title: "Get competitive bids",
    description: "Verified carriers review your load and bid for the work.",
  },
  {
    title: "Book and track",
    description: "Choose the right offer, then monitor progress end to end.",
  },
]

export default function HowItWorksPage() {
  return (
    <div className="container py-12 space-y-8">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">MoveSmart</p>
        <h1 className="text-4xl font-bold tracking-tight">How it works</h1>
        <p className="max-w-2xl text-muted-foreground">
          Move freight with fewer intermediaries. Shippers list loads, carriers compete on price,
          and everyone gets visibility throughout the shipment.
        </p>
        <Button asChild>
          <Link href="/auth/register">Get started</Link>
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle>0{index + 1}. {step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Built for shippers, carriers, and admins who need a simpler freight workflow.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
