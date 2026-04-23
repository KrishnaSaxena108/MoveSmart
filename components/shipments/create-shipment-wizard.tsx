"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AddressAutocomplete } from "@/components/maps/address-autocomplete"
import { createShipment } from "@/lib/actions/shipments"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  ArrowRight, 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign,
  Truck,
  Zap,
  Check,
  Upload,
  X,
  Plus,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressData {
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  coordinates: {
    lat: number
    lng: number
  }
  displayName: string
}

function extractLocationParts(displayName: string) {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  const city = parts[1] || ""
  const stateZip = parts[3] || parts[2] || ""
  const stateZipMatch = stateZip.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)

  return {
    city,
    state: stateZipMatch?.[1] || "",
    zipCode: stateZipMatch?.[2] || "",
  }
}

function normalizeAddress(address: AddressData) {
  const fallback = extractLocationParts(address.displayName || "")

  return {
    address: address.address,
    city: address.city || fallback.city,
    state: address.state || fallback.state,
    zipCode: address.zipCode || fallback.zipCode,
    country: address.country,
    coordinates: address.coordinates,
  }
}

interface ItemData {
  id: string
  description: string
  category: string
  quantity: number
  weight?: number
  weightUnit: "lbs" | "kg"
  dimensions?: {
    length: number
    width: number
    height: number
    unit: "in" | "ft" | "cm" | "m"
  }
}

const CATEGORIES = [
  { value: "vehicle", label: "Vehicle" },
  { value: "furniture", label: "Furniture" },
  { value: "freight", label: "Freight/Palletized" },
  { value: "household", label: "Household Goods" },
  { value: "equipment", label: "Equipment/Machinery" },
  { value: "palletized", label: "Palletized Goods" },
  { value: "other", label: "Other" },
]

const SPECIAL_REQUIREMENTS = [
  { id: "fragile", label: "Fragile" },
  { id: "hazmat", label: "Hazardous Materials" },
  { id: "temperature", label: "Temperature Controlled" },
  { id: "liftgate", label: "Liftgate Required" },
  { id: "inside_delivery", label: "Inside Delivery" },
  { id: "appointment", label: "Appointment Required" },
  { id: "stackable", label: "Stackable" },
]

const STEPS = [
  { id: 1, title: "Locations", icon: MapPin },
  { id: 2, title: "Items", icon: Package },
  { id: 3, title: "Schedule", icon: Calendar },
  { id: 4, title: "Pricing", icon: DollarSign },
  { id: 5, title: "Review", icon: Check },
]

export function CreateShipmentWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [pickup, setPickup] = useState<AddressData | null>(null)
  const [delivery, setDelivery] = useState<AddressData | null>(null)
  const [items, setItems] = useState<ItemData[]>([
    { id: "1", description: "", category: "", quantity: 1, weightUnit: "lbs" }
  ])
  const [pickupDateEarliest, setPickupDateEarliest] = useState("")
  const [pickupDateLatest, setPickupDateLatest] = useState("")
  const [deliveryDateLatest, setDeliveryDateLatest] = useState("")
  const [listingType, setListingType] = useState<"auction" | "instant">("auction")
  const [budget, setBudget] = useState("")
  const [fixedPrice, setFixedPrice] = useState("")
  const [specialRequirements, setSpecialRequirements] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<string[]>([])

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", category: "", quantity: 1, weightUnit: "lbs" }
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof ItemData, value: unknown) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const toggleRequirement = (reqId: string) => {
    setSpecialRequirements(prev =>
      prev.includes(reqId)
        ? prev.filter(r => r !== reqId)
        : [...prev, reqId]
    )
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!pickup && !!delivery
      case 2:
        return items.every(item => item.description && item.category)
      case 3:
        return !!pickupDateEarliest
      case 4:
        return listingType === "auction" ? !!budget : !!fixedPrice
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
    } else {
      toast.error("Please fill in all required fields")
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!pickup || !delivery || !pickupDateEarliest) {
      toast.error("Missing required information")
      return
    }

    const normalizedPickup = normalizeAddress(pickup)
    const normalizedDelivery = normalizeAddress(delivery)

    if (!normalizedPickup.city || !normalizedDelivery.city) {
      toast.error("Please select pickup and delivery from the address suggestions")
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createShipment({
        pickup: normalizedPickup,
        delivery: normalizedDelivery,
        pickupDate: {
          earliest: pickupDateEarliest,
          latest: pickupDateLatest || undefined,
        },
        deliveryDate: deliveryDateLatest ? {
          latest: deliveryDateLatest,
        } : undefined,
        items: items.map(item => ({
          description: item.description,
          category: item.category as "vehicle" | "furniture" | "freight" | "household" | "equipment" | "palletized" | "other",
          quantity: item.quantity,
          weight: item.weight,
          weightUnit: item.weightUnit,
          dimensions: item.dimensions,
        })),
        specialRequirements,
        listingType,
        pricing: {
          type: listingType === "instant" ? "fixed" : "auction",
          budget: budget ? parseFloat(budget) : undefined,
          fixedPrice: fixedPrice ? parseFloat(fixedPrice) : undefined,
          currency: "USD",
        },
        photos,
        notes,
      })

      if (result.success) {
        toast.success("Shipment created successfully!")
        router.push(`/dashboard/shipments/${result.shipmentId}`)
      } else {
        toast.error(result.error || "Failed to create shipment")
      }
    } catch (error) {
      console.error("Error creating shipment:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary bg-background text-primary"
                      : "border-muted bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-12 sm:w-20 lg:w-28",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Pickup & Delivery Locations"}
            {currentStep === 2 && "Item Details"}
            {currentStep === 3 && "Schedule"}
            {currentStep === 4 && "Listing Type & Pricing"}
            {currentStep === 5 && "Review & Submit"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter the pickup and delivery addresses for your shipment"}
            {currentStep === 2 && "Describe the items you need to ship"}
            {currentStep === 3 && "Set your preferred pickup and delivery dates"}
            {currentStep === 4 && "Choose how you want to price your shipment"}
            {currentStep === 5 && "Review your shipment details before posting"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Locations */}
          {currentStep === 1 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pickup Location *</Label>
                  <AddressAutocomplete
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Enter pickup address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Location *</Label>
                  <AddressAutocomplete
                    value={delivery}
                    onChange={setDelivery}
                    placeholder="Enter delivery address"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 2: Items */}
          {currentStep === 2 && (
            <>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={item.id} className="relative">
                    <CardContent className="pt-6">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <div className="mb-4 text-sm font-medium text-muted-foreground">
                        Item {index + 1}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Description *</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            placeholder="e.g., 2019 Honda Civic, Leather Sofa..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category *</Label>
                          <Select
                            value={item.category}
                            onValueChange={(value) => updateItem(item.id, "category", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={item.weight || ""}
                              onChange={(e) => updateItem(item.id, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder="0"
                            />
                            <Select
                              value={item.weightUnit}
                              onValueChange={(value: "lbs" | "kg") => updateItem(item.id, "weightUnit", value)}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lbs">lbs</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addItem} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Item
                </Button>
              </div>

              <div className="space-y-3">
                <Label>Special Requirements</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIAL_REQUIREMENTS.map(req => (
                    <div key={req.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={req.id}
                        checked={specialRequirements.includes(req.id)}
                        onCheckedChange={() => toggleRequirement(req.id)}
                      />
                      <label
                        htmlFor={req.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {req.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information carriers should know..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Earliest Pickup Date *</Label>
                    <Input
                      type="date"
                      value={pickupDateEarliest}
                      onChange={(e) => setPickupDateEarliest(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Latest Pickup Date (optional)</Label>
                    <Input
                      type="date"
                      value={pickupDateLatest}
                      onChange={(e) => setPickupDateLatest(e.target.value)}
                      min={pickupDateEarliest || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Latest Delivery Date (optional)</Label>
                  <Input
                    type="date"
                    value={deliveryDateLatest}
                    onChange={(e) => setDeliveryDateLatest(e.target.value)}
                    min={pickupDateEarliest || new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: Pricing */}
          {currentStep === 4 && (
            <>
              <div className="space-y-6">
                <RadioGroup
                  value={listingType}
                  onValueChange={(value: "auction" | "instant") => setListingType(value)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div>
                    <RadioGroupItem
                      value="auction"
                      id="auction"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="auction"
                      className="flex cursor-pointer flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Truck className="mb-3 h-8 w-8" />
                      <span className="text-lg font-semibold">Auction</span>
                      <span className="mt-1 text-center text-sm text-muted-foreground">
                        Carriers compete with bids. Get the best price.
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="instant"
                      id="instant"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="instant"
                      className="flex cursor-pointer flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <Zap className="mb-3 h-8 w-8" />
                      <span className="text-lg font-semibold">Instant</span>
                      <span className="mt-1 text-center text-sm text-muted-foreground">
                        Set a fixed price. First carrier wins.
                      </span>
                    </Label>
                  </div>
                </RadioGroup>

                {listingType === "auction" ? (
                  <div className="space-y-2">
                    <Label>Your Budget *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="Enter your budget"
                        className="pl-10"
                        min={0}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Carriers will see this as a reference. You can accept any bid.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Fixed Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        value={fixedPrice}
                        onChange={(e) => setFixedPrice(e.target.value)}
                        placeholder="Enter fixed price"
                        className="pl-10"
                        min={0}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The first carrier to accept will get the job at this price.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <>
              <div className="space-y-6">
                {/* Locations Summary */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold">Locations</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup</p>
                      <p className="font-medium">{pickup?.address}</p>
                      <p className="text-sm">{pickup?.city}, {pickup?.state} {pickup?.zipCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery</p>
                      <p className="font-medium">{delivery?.address}</p>
                      <p className="text-sm">{delivery?.city}, {delivery?.state} {delivery?.zipCode}</p>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold">Items ({items.length})</h4>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.description || `Item ${index + 1}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {CATEGORIES.find(c => c.value === item.category)?.label} • Qty: {item.quantity}
                            {item.weight && ` • ${item.weight} ${item.weightUnit}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule Summary */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold">Schedule</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup Window</p>
                      <p className="font-medium">
                        {new Date(pickupDateEarliest).toLocaleDateString()}
                        {pickupDateLatest && ` - ${new Date(pickupDateLatest).toLocaleDateString()}`}
                      </p>
                    </div>
                    {deliveryDateLatest && (
                      <div>
                        <p className="text-sm text-muted-foreground">Deliver By</p>
                        <p className="font-medium">
                          {new Date(deliveryDateLatest).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-semibold">Pricing</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Listing Type</p>
                      <p className="font-medium capitalize">{listingType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {listingType === "auction" ? "Budget" : "Fixed Price"}
                      </p>
                      <p className="text-xl font-bold">
                        ${listingType === "auction" ? budget : fixedPrice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Special Requirements */}
                {specialRequirements.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-semibold">Special Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {specialRequirements.map(req => (
                        <span
                          key={req}
                          className="rounded-full bg-secondary px-3 py-1 text-sm"
                        >
                          {SPECIAL_REQUIREMENTS.find(r => r.id === req)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-semibold">Additional Notes</h4>
                    <p className="text-sm">{notes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentStep < 5 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Post Shipment"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
