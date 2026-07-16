import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/shared/lib/utils"

type MarkdownMessageProps = {
  content: string
  variant: "assistant" | "user"
  className?: string
}

export function MarkdownMessage({
  content,
  variant,
  className,
}: MarkdownMessageProps) {
  const isUser = variant === "user"

  return (
    <div
      className={cn(
        "chat-md text-sm leading-relaxed break-words",
        isUser ? "chat-md-user" : "chat-md-assistant",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                "underline underline-offset-2",
                isUser ? "text-white/95" : "text-accent",
              )}
            >
              {children}
            </a>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = Boolean(codeClass?.includes("language-"))
            if (isBlock) {
              return (
                <code className={cn("font-mono text-[0.8rem]", codeClass)} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code
                className={cn(
                  "rounded px-1 py-0.5 font-mono text-[0.8rem]",
                  isUser ? "bg-white/20" : "bg-black/5",
                )}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre
              className={cn(
                "mb-2 overflow-x-auto rounded-lg p-3 font-mono text-[0.8rem] last:mb-0",
                isUser ? "bg-black/20" : "bg-black/[0.04]",
              )}
            >
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "mb-2 border-l-2 pl-3 opacity-90 last:mb-0",
                isUser ? "border-white/40" : "border-border-strong",
              )}
            >
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h3 className="mb-2 text-base font-semibold last:mb-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 text-base font-semibold last:mb-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 text-sm font-semibold last:mb-0">{children}</h4>
          ),
          hr: () => (
            <hr
              className={cn(
                "my-3 border-0 border-t",
                isUser ? "border-white/25" : "border-border",
              )}
            />
          ),
          table: ({ children }) => (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className={cn(
                "border px-2 py-1 font-semibold",
                isUser ? "border-white/25" : "border-border",
              )}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={cn(
                "border px-2 py-1",
                isUser ? "border-white/25" : "border-border",
              )}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
