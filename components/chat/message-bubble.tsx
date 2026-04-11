'use client'

import { MarkdownRenderer } from './markdown-renderer'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  modelName?: string
}

export function MessageBubble({
  role,
  content,
  timestamp,
  modelName,
}: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs rounded-lg px-4 py-3 md:max-w-md lg:max-w-lg ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        {isUser ? (
          <p className="text-sm">{content}</p>
        ) : (
          <div className="text-sm">
            <MarkdownRenderer content={content} />
          </div>
        )}
        <div
          className={`mt-2 text-xs ${
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {modelName && <span className="block">{modelName}</span>}
          {timestamp && (
            <span>
              {timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
