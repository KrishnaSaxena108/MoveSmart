import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Authentication Error",
}

export default function AuthErrorPage() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Authentication error</CardTitle>
        <CardDescription>
          We couldn’t complete the sign-in flow. Try again or return to login.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button asChild>
          <Link href="/auth/login">Back to login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
