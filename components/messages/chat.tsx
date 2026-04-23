"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { Send, Paperclip, ImageIcon, ArrowLeft } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'
import { sendMessage, getMessages } from '@/lib/actions/messages'
import { useChannel } from '@/lib/ably/client'
import { toast } from 'sonner'

interface Message {
  _id: string
  sender: {
    _id: string
    name: string
    image?: string
  }
  content: string
  attachments?: Array<{
    url: string
    type: string
    name: string
  }>
  read: boolean
  createdAt: Date
}

interface ChatProps {
  conversationId: string
  currentUserId: string
  otherParticipant: {
    _id: string
    name: string
    image?: string
  }
  shipmentTitle: string
  initialMessages?: Message[]
}

export function Chat({
  conversationId,
  currentUserId,
  otherParticipant,
  shipmentTitle,
  initialMessages = [],
}: ChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Real-time message updates
  const handleNewMessage = useCallback((data: {
    messageId: string
    senderId: string
    senderName: string
    content: string
    createdAt: string
  }) => {
    // Don't add if it's our own message (already added optimistically)
    if (data.senderId === currentUserId) return

    setMessages((prev) => {
      // Check if message already exists
      if (prev.some((m) => m._id === data.messageId)) return prev

      return [
        ...prev,
        {
          _id: data.messageId,
          sender: {
            _id: data.senderId,
            name: data.senderName,
            image: otherParticipant.image,
          },
          content: data.content,
          read: true,
          createdAt: new Date(data.createdAt),
        },
      ]
    })

    // Scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }, 100)
  }, [currentUserId, otherParticipant.image])

  useChannel(`conversation:${conversationId}`, 'message:new', handleNewMessage)

  // Scroll to bottom on initial load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return

    setIsLoadingMore(true)
    try {
      const result = await getMessages(conversationId, {
        before: messages[0]._id,
        limit: 50,
      })

      if (result.success && result.data) {
        setMessages((prev) => [...result.data!.messages, ...prev])
        setHasMore(result.data.hasMore)
      }
    } catch (error) {
      console.error('Error loading more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      _id: tempId,
      sender: {
        _id: currentUserId,
        name: 'You',
      },
      content,
      read: false,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, optimisticMessage])

    // Scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }, 100)

    try {
      const result = await sendMessage(conversationId, content)

      if (result.success && result.data) {
        // Update the temp message with real ID
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId ? { ...m, _id: result.data!.messageId } : m
          )
        )
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m._id !== tempId))
        toast.error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.filter((m) => m._id !== tempId))
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd')
      if (msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ date: msgDate, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    })

    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <Card className="flex flex-col h-150">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipant.image} />
            <AvatarFallback>
              {otherParticipant.name?.split(' ').map((n) => n[0]).join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {otherParticipant.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {shipmentTitle}
            </p>
          </div>
        </div>
      </CardHeader>

      <ScrollArea
        ref={scrollRef}
        className="flex-1 p-4"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement
          if (target.scrollTop === 0 && hasMore) {
            loadMoreMessages()
          }
        }}
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {messageGroups.map((group) => (
          <div key={group.date} className="space-y-3">
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {isToday(new Date(group.date))
                  ? 'Today'
                  : isYesterday(new Date(group.date))
                  ? 'Yesterday'
                  : format(new Date(group.date), 'MMMM d, yyyy')}
              </span>
            </div>

            {group.messages.map((message) => {
              const isOwn = message.sender._id === currentUserId

              return (
                <div
                  key={message._id}
                  className={cn(
                    'flex gap-2',
                    isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8 flex-0">
                      <AvatarImage src={message.sender.image} />
                      <AvatarFallback className="text-xs">
                        {message.sender.name?.split(' ').map((n) => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap wrap-break-word">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        'text-xs mt-1',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}
                    >
                      {formatMessageDate(new Date(message.createdAt))}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Send a message to start the conversation
            </p>
          </div>
        )}
      </ScrollArea>

      <CardContent className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
