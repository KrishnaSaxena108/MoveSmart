import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Forgot Password",
}

export default function ForgotPasswordPage() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Password reset is not wired up yet. Use support or add a reset flow before release.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/auth/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </CardContent>
    </Card>
  )
}
