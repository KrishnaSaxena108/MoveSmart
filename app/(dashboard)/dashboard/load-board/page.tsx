import { Metadata } from "next"
import { LoadBoard } from "@/components/load-board/load-board"

export const metadata: Metadata = {
  title: "Load Board",
  description: "Browse available shipments and find loads along your route",
}

export default function LoadBoardPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Load Board</h1>
        <p className="mt-2 text-muted-foreground">
          Find available shipments by location, route, or browse instant pickups
        </p>
      </div>
      <LoadBoard />
    </div>
  )
}
