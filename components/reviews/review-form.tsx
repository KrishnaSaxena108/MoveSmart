"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Star, MessageSquare, Clock, Package, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitReview } from '@/lib/actions/reviews'
import { toast } from 'sonner'

interface ReviewFormProps {
  shipmentId: string
  revieweeName: string
  revieweeRole: 'shipper' | 'carrier'
  onSuccess?: () => void
}

export function ReviewForm({
  shipmentId,
  revieweeName,
  revieweeRole,
  onSuccess,
}: ReviewFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overallRating, setOverallRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [categoryRatings, setCategoryRatings] = useState({
    communication: 0,
    timeliness: 0,
    itemCondition: 0,
    professionalism: 0,
  })

  const categories = [
    { key: 'communication', label: 'Communication', icon: MessageSquare },
    { key: 'timeliness', label: 'Timeliness', icon: Clock },
    { key: 'itemCondition', label: revieweeRole === 'carrier' ? 'Item Condition' : 'Item Handling', icon: Package },
    { key: 'professionalism', label: 'Professionalism', icon: UserCheck },
  ] as const

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error('Please provide an overall rating')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitReview({
        shipmentId,
        rating: overallRating,
        categoryRatings: Object.fromEntries(
          Object.entries(categoryRatings).filter(([, v]) => v > 0)
        ),
        comment: comment.trim() || undefined,
      })

      if (result.success) {
        toast.success('Review submitted successfully!')
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to submit review')
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({
    value,
    onChange,
    onHover,
    size = 'md',
  }: {
    value: number
    onChange: (rating: number) => void
    onHover?: (rating: number) => void
    size?: 'sm' | 'md' | 'lg'
  }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    }

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors',
                star <= (onHover ? hoverRating || value : value)
                  ? 'fill-accent text-accent'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    )
  }

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Poor'
      case 2:
        return 'Fair'
      case 3:
        return 'Good'
      case 4:
        return 'Very Good'
      case 5:
        return 'Excellent'
      default:
        return ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Leave a Review
        </CardTitle>
        <CardDescription>
          Share your experience with {revieweeName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="space-y-3">
          <Label className="text-base">Overall Rating</Label>
          <div className="flex items-center gap-4">
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              onHover={setHoverRating}
              size="lg"
            />
            {(hoverRating || overallRating) > 0 && (
              <span className="text-sm font-medium">
                {getRatingLabel(hoverRating || overallRating)}
              </span>
            )}
          </div>
        </div>

        {/* Category Ratings */}
        <div className="space-y-4">
          <Label className="text-base">Rate by Category (Optional)</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
                <StarRating
                  value={categoryRatings[key]}
                  onChange={(rating) =>
                    setCategoryRatings((prev) => ({ ...prev, [key]: rating }))
                  }
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">Your Review (Optional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Share details about your experience with this ${revieweeRole}...`}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Your review will be visible to other users
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={isSubmitting || overallRating === 0}
        >
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
