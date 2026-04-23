"use client"

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Star, MessageSquare, ChevronDown, ChevronUp, Reply } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { respondToReview } from '@/lib/actions/reviews'
import { toast } from 'sonner'

interface Review {
  _id: string
  reviewer: {
    _id: string
    name: string
    image?: string
    role?: string
  }
  reviewee?: {
    _id: string
    name: string
    image?: string
  }
  shipment?: {
    _id: string
    title: string
  }
  rating: number
  categoryRatings?: {
    communication?: number
    timeliness?: number
    itemCondition?: number
    professionalism?: number
  }
  comment?: string
  photos?: string[]
  response?: string
  createdAt: Date
}

interface ReviewsListProps {
  reviews?: Review[]
  averageRating?: number
  totalReviews?: number
  currentUserId?: string
  showShipmentInfo?: boolean
  canRespond?: boolean
  emptyMessage?: string
}

export function ReviewsList({
  reviews = [],
  averageRating,
  totalReviews,
  currentUserId,
  showShipmentInfo = false,
  canRespond = false,
  emptyMessage = 'No reviews yet',
}: ReviewsListProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  const handleRespond = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error('Response cannot be empty')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await respondToReview(reviewId, responseText.trim())
      if (result.success) {
        toast.success('Response submitted')
        setRespondingTo(null)
        setResponseText('')
      } else {
        toast.error(result.error || 'Failed to submit response')
      }
    } catch (error) {
      console.error('Error responding to review:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
            star <= rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Star className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {averageRating !== undefined && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
                <StarDisplay rating={Math.round(averageRating)} size="md" />
                <p className="text-sm text-muted-foreground mt-1">
                  {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = reviews.filter((r) => r.rating === rating).length
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm w-3">{rating}</span>
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const isExpanded = expandedReviews.has(review._id)
          const isLongComment = review.comment && review.comment.length > 200
          const canRespondToThis =
            canRespond &&
            currentUserId &&
            review.reviewee?._id === currentUserId &&
            !review.response

          return (
            <Card key={review._id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.reviewer.image} />
                    <AvatarFallback>
                      {review.reviewer.name?.split(' ').map((n) => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{review.reviewer.name}</span>
                        {review.reviewer.role && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {review.reviewer.role}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay rating={review.rating} />
                    </div>

                    {showShipmentInfo && review.shipment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        For: {review.shipment.title}
                      </p>
                    )}

                    {review.comment && (
                      <div className="mt-3">
                        <p
                          className={cn(
                            'text-sm',
                            !isExpanded && isLongComment && 'line-clamp-3'
                          )}
                        >
                          {review.comment}
                        </p>
                        {isLongComment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(review._id)}
                            className="mt-1 h-auto py-1 px-2 text-xs"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Read more
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Category Ratings */}
                    {review.categoryRatings && Object.keys(review.categoryRatings).length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {review.categoryRatings.communication && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Communication: </span>
                            <span className="font-medium">{review.categoryRatings.communication}/5</span>
                          </div>
                        )}
                        {review.categoryRatings.timeliness && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Timeliness: </span>
                            <span className="font-medium">{review.categoryRatings.timeliness}/5</span>
                          </div>
                        )}
                        {review.categoryRatings.itemCondition && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Item Condition: </span>
                            <span className="font-medium">{review.categoryRatings.itemCondition}/5</span>
                          </div>
                        )}
                        {review.categoryRatings.professionalism && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Professionalism: </span>
                            <span className="font-medium">{review.categoryRatings.professionalism}/5</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Response */}
                    {review.response && (
                      <div className="mt-4 pl-4 border-l-2 border-muted">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Reply className="h-3 w-3" />
                          Response
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {review.response}
                        </p>
                      </div>
                    )}

                    {/* Respond Form */}
                    {canRespondToThis && (
                      <div className="mt-4">
                        {respondingTo === review._id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Write your response..."
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRespond(review._id)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  'Submit'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRespondingTo(null)
                                  setResponseText('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRespondingTo(review._id)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Respond
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
