'use client'

import { useRef, useEffect, useState, useCallback, FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageBubble } from './message-bubble'
import { ModelSelector } from './model-selector'
import { Send, Loader } from 'lucide-react'
import { captureAnalyticsEvent } from '@/lib/analytics-utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  modelUsed?: string
  createdAt: Date
}

interface ChatInterfaceProps {
  conversationId: string
  initialMessages: ChatMessage[]
  defaultModel: string
  onModelChange?: (modelId: string) => Promise<void>
}

export function ChatInterface({
  conversationId,
  initialMessages,
  defaultModel,
  onModelChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(defaultModel)
  const [isLoading, setIsLoading] = useState(false)
  const [isFirstMessage, setIsFirstMessage] = useState(
    initialMessages.length === 0,
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    if (onModelChange) {
      try {
        await onModelChange(modelId)
      } catch (error) {
        console.error('Failed to update model:', error)
        setSelectedModel(defaultModel)
      }
    }
  }

  const handleSendMessage = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault()

    if (!input.trim()) return

    const userContent = input

    // Track first message event
    if (isFirstMessage) {
      captureAnalyticsEvent('first-question-asked', {
        modelId: selectedModel,
        tier: 'default', // Add tier logic if available
      })
      setIsFirstMessage(false)
    }

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userContent,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        modelUsed: selectedModel,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      let buffer = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'content' && data.delta) {
                assistantContent += data.delta

                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1]
                  if (lastMessage.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...lastMessage,
                        content: assistantContent,
                      },
                    ]
                  }
                  return prev
                })
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          'Sorry, there was an error processing your request. Please try again.',
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border-border bg-card flex flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Header with Model Selector */}
      <div className="border-border bg-muted/30 border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Chat</h2>
          <div className="w-64">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground text-center">
              <p>No messages yet. Start a conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.createdAt}
              modelName={
                message.role === 'assistant' ? message.modelUsed : undefined
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-border bg-muted/30 border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder={isLoading ? 'Thinking...' : 'Type your message...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
        {isLoading && (
          <p className="text-muted-foreground mt-2 text-xs">Thinking...</p>
        )}
      </div>
    </div>
  )
}
