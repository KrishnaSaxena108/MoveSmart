"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Chat } from "@/components/messages/chat"
import { Search, MessageSquare, Package, Clock, BellRing, MessageCircleHeart } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getConversations } from "@/lib/actions/messages"

interface Conversation {
  _id: string
  shipmentId: string
  shipmentTitle: string
  participant: {
    _id: string
    name: string
    image?: string
    role: string
  }
  lastMessage?: {
    content: string
    createdAt: string
    senderId: string
  }
  unreadCount: number
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true)
      const result = await getConversations()

      if (!result.success || !result.data) {
        setConversations([])
        setLoading(false)
        return
      }

      const mapped = result.data.map((conv) => ({
        _id: conv._id,
        shipmentId: conv.shipment._id,
        shipmentTitle: conv.shipment.title,
        participant: {
          _id: conv.otherParticipant._id,
          name: conv.otherParticipant.name,
          image: conv.otherParticipant.image,
          role: "participant",
        },
        lastMessage: conv.lastMessage
          ? {
              content: conv.lastMessage.content,
              createdAt: new Date(conv.lastMessage.createdAt).toISOString(),
              senderId: "",
            }
          : undefined,
        unreadCount: conv.unreadCount,
      }))

      setConversations(mapped)
      if (!selectedConversation && mapped.length > 0) {
        setSelectedConversation(mapped[0])
      }
      setLoading(false)
    }

    loadConversations()
  }, [session?.user?.id])

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
  const activeConversations = conversations.length

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.shipmentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-background p-6 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">Message Control Panel</Badge>
            {totalUnread > 0 && <Badge variant="destructive">{totalUnread} unread</Badge>}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Coordinate with shippers and carriers, track active shipment conversations, and respond faster.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Threads</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{activeConversations}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Unread Messages</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{totalUnread}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Response Flow</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageCircleHeart className="h-4 w-4 text-primary" />
                  Keep conversations warm and timely
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 h-[calc(100vh-280px)] min-h-125">
        <Card className="md:col-span-1 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <BellRing className="h-3.5 w-3.5" />
              {filteredConversations.length} visible thread(s)
            </CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-430px)] min-h-75">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No conversations found</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv._id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedConversation?._id === conv._id
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.participant.image} />
                          <AvatarFallback>
                            {conv.participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{conv.participant.name}</p>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {conv.shipmentTitle}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {conv.lastMessage.content}
                            </p>
                          )}
                          {conv.lastMessage && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 overflow-hidden">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.participant.image} />
                    <AvatarFallback>
                      {selectedConversation.participant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedConversation.participant.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {selectedConversation.shipmentTitle}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100vh-430px)] min-h-75">
                <Chat
                  conversationId={selectedConversation._id}
                  currentUserId={session?.user?.id || ""}
                  otherParticipant={selectedConversation.participant}
                  shipmentTitle={selectedConversation.shipmentTitle}
                />
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Choose a conversation from the list to start messaging
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
