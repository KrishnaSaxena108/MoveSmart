import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Package, 
  Shield, 
  DollarSign, 
  MapPin, 
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingDown
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

const features = [
  {
    icon: TrendingDown,
    title: "Competitive Bidding",
    description: "Carriers compete for your shipment, driving prices down while maintaining quality service.",
  },
  {
    icon: Shield,
    title: "Secure Escrow",
    description: "Your payment is held securely until delivery is confirmed. Full protection for both parties.",
  },
  {
    icon: MapPin,
    title: "Real-Time Tracking",
    description: "Track your shipment every step of the way with live GPS updates and status notifications.",
  },
  {
    icon: Clock,
    title: "Instant Bookings",
    description: "Need it shipped now? Use instant booking for time-sensitive shipments with fixed pricing.",
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Make informed decisions with genuine reviews from completed shipments.",
  },
  {
    icon: Users,
    title: "Verified Carriers",
    description: "All carriers are vetted with license and insurance verification before they can bid.",
  },
]

const stats = [
  { value: "50K+", label: "Shipments Completed" },
  { value: "10K+", label: "Verified Carriers" },
  { value: "4.8", label: "Average Rating" },
  { value: "35%", label: "Average Savings" },
]

const steps = [
  {
    number: "01",
    title: "List Your Shipment",
    description: "Describe what you are shipping, where it is going, and when it needs to arrive.",
  },
  {
    number: "02",
    title: "Receive Competitive Bids",
    description: "Verified carriers compete for your business with real-time bidding.",
  },
  {
    number: "03",
    title: "Choose Your Carrier",
    description: "Review profiles, ratings, and quotes. Select the best fit for your needs.",
  },
  {
    number: "04",
    title: "Track & Confirm",
    description: "Monitor your shipment in real-time and release payment upon delivery.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-background px-4 py-20 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <Badge variant="secondary" className="mb-6">
                <Truck className="mr-2 h-3 w-3" />
                Trusted by 10,000+ shippers
              </Badge>
              
              <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Ship Smarter with{" "}
                <span className="text-primary">Competitive Bidding</span>
              </h1>
              
              <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
                Connect directly with verified carriers who compete for your shipment. 
                Save up to 35% while getting reliable, tracked delivery.
              </p>
              
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-8">
                  <Link href="/auth/register?role=shipper">
                    Ship Something
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8">
                  <Link href="/auth/register?role=carrier">
                    Become a Carrier
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-border bg-card px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary md:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <Badge variant="outline" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Simple, Transparent Shipping
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                List your shipment and let carriers compete for your business. 
                It is that simple.
              </p>
            </div>
            
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number} className="relative">
                  <div className="mb-4 text-5xl font-bold text-primary/20">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-y border-border bg-muted/30 px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Everything You Need
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                A complete platform for shippers and carriers to connect, transact, 
                and build trust.
              </p>
            </div>
            
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-20 md:py-28">
          <div className="mx-auto max-w-4xl">
            <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card">
              <CardContent className="flex flex-col items-center p-8 text-center md:p-12">
                <Package className="mb-6 h-12 w-12 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Ready to Ship Smarter?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                  Join thousands of shippers saving money with competitive bidding. 
                  List your first shipment in minutes.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Button asChild size="lg" className="h-12 px-8">
                    <Link href="/auth/register">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-8">
                    <Link href="/how-it-works">
                      Learn More
                    </Link>
                  </Button>
                </div>
                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Free to list
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    No obligation
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Cancel anytime
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* For Carriers Section */}
        <section className="border-t border-border bg-muted/30 px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <Badge variant="outline" className="mb-4">For Carriers</Badge>
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Fill Your Truck, Maximize Profits
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Find loads along your route, bid on shipments, and grow your business. 
                  Our platform helps you minimize deadhead miles and maximize revenue.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Search loads by location or along your route",
                    "Set your own prices with competitive bidding",
                    "Instant pickup opportunities for quick jobs",
                    "Build your reputation with verified reviews",
                    "Fast, reliable payouts after delivery",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8" size="lg">
                  <Link href="/auth/register?role=carrier">
                    Join as a Carrier
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="relative">
                <Card className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <Badge>Instant Pickup</Badge>
                      <span className="text-sm text-muted-foreground">2.5 mi away</span>
                    </div>
                    <h3 className="text-lg font-semibold">Furniture Set</h3>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Austin, TX
                      </span>
                      <span>to</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Houston, TX
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-primary">$450</div>
                        <div className="text-sm text-muted-foreground">Fixed price</div>
                      </div>
                      <Button>Accept Job</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
