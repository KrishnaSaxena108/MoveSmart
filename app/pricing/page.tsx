import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Pricing",
}

const plans = [
  {
    name: "Shipper",
    price: "Free to start",
    description: "List shipments, receive bids, and book carriers.",
  },
  {
    name: "Carrier",
    price: "Free to browse",
    description: "Find loads, submit bids, and win new business.",
  },
  {
    name: "Platform",
    price: "Transaction-based",
    description: "A small fee is applied only when shipments are booked.",
  },
]

export default function PricingPage() {
  return (
    <div className="container py-12 space-y-8">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Pricing</p>
        <h1 className="text-4xl font-bold tracking-tight">Simple pricing for freight teams</h1>
        <p className="max-w-2xl text-muted-foreground">
          Start free, keep your costs tied to actual shipping activity, and scale when your volume grows.
        </p>
        <Button asChild>
          <Link href="/auth/register">Create an account</Link>
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.price}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {plan.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
