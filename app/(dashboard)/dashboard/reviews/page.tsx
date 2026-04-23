import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUserReviews } from "@/lib/actions/reviews"
import { formatDistanceToNow } from "date-fns"

export default async function ReviewsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }

  const reviewsResult = await getUserReviews(session.user.id, { limit: 20, offset: 0 })
  const reviewData = reviewsResult.success ? reviewsResult.data : undefined
  const reviews = reviewData?.reviews || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">Feedback from completed shipments will show here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
          <CardDescription>
            {reviewData?.total || 0} reviews from database • Average rating {Number(reviewData?.averageRating || 0).toFixed(1)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review._id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/80 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{review.shipment.title}</p>
                  <p className="text-xs text-muted-foreground">By {review.reviewer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {review.comment || "No comment"} • {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{review.rating.toFixed(1)} / 5</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={review.shipment._id ? `/dashboard/shipments/${review.shipment._id}` : "/dashboard/shipments"}>
                      Shipment
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No reviews found in the database for your account yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
