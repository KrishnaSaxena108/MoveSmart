import Link from "next/link"
import { Truck } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary-foreground">MoveSmart</span>
        </Link>
        
        <div>
          <blockquote className="space-y-4">
            <p className="text-xl font-medium text-primary-foreground/90">
              &ldquo;MoveSmart saved us 40% on shipping costs. The bidding system is 
              brilliant - we got 5 quotes within an hour of posting.&rdquo;
            </p>
            <footer className="text-sm text-primary-foreground/70">
              <cite className="not-italic">
                Sarah Chen, Operations Manager at TechFlow Inc.
              </cite>
            </footer>
          </blockquote>
        </div>
        
        <div className="flex items-center gap-8 text-sm text-primary-foreground/70">
          <div>
            <div className="text-2xl font-bold text-primary-foreground">50K+</div>
            <div>Shipments</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-foreground">10K+</div>
            <div>Carriers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-foreground">4.8</div>
            <div>Avg Rating</div>
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">MoveSmart</span>
          </Link>
          
          {children}
        </div>
      </div>
    </div>
  )
}
