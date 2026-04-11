'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="mt-6 mb-4 text-2xl font-bold" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-5 mb-3 text-xl font-bold" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-4 mb-2 text-lg font-bold" {...props} />
          ),
          // Paragraphs
          p: ({ node, ...props }) => (
            <p className="mb-3 leading-7" {...props} />
          ),
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="mb-3 ml-6 list-disc space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-3 ml-6 list-decimal space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => <li className="leading-7" {...props} />,
          // Code blocks
          code: ({ node, inline, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-sm"
                  {...props}
                />
              )
            }
            return (
              <code
                className="bg-muted block overflow-x-auto rounded-lg p-4 font-mono text-sm"
                {...props}
              />
            )
          },
          pre: ({ node, ...props }) => (
            <pre
              className="bg-muted mb-3 overflow-x-auto rounded-lg p-4"
              {...props}
            />
          ),
          // Tables
          table: ({ node, ...props }) => (
            <table
              className="border-border mb-3 w-full border-collapse border"
              {...props}
            />
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted" {...props} />
          ),
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => (
            <tr className="border-border border" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border-border border px-3 py-2" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="border-border border px-3 py-2 font-semibold"
              {...props}
            />
          ),
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-primary text-muted-foreground mb-3 border-l-4 pl-4 italic"
              {...props}
            />
          ),
          // Links
          a: ({ node, ...props }) => (
            <a
              className="text-primary hover:text-primary/80 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Emphasis
          strong: ({ node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
