"use client";

import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageMarkdownProps {
  content: string;
}

/**
 * ChatMessageMarkdown
 * 
 * Renders rich Markdown in chatbot bubbles with compact, modern typography,
 * full table support, code blocks, lists, and theme awareness.
 */
function ChatMessageMarkdownComponent({ content }: ChatMessageMarkdownProps) {
  if (!content) return null;

  return (
    <div className="chat-markdown prose-invert max-w-none break-words text-xs leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-text-primary mt-2 mb-1 first:mt-0 pb-0.5 border-b border-border-subtle/40">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-text-primary mt-2 mb-1 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-text-primary mt-1.5 mb-0.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-semibold text-text-secondary mt-1 mb-0.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-0.5 my-1 marker:text-accent">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-0.5 my-1 marker:text-text-muted">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text-secondary">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/80 pl-2.5 my-1.5 text-text-muted italic bg-bg-card/40 py-0.5 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code
                  className="font-mono text-[11px] bg-bg-card/80 text-accent px-1 py-0.5 rounded border border-border-subtle/40"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-1.5 p-2 rounded-lg bg-bg-card/90 border border-border-subtle overflow-x-auto text-[11px] font-mono leading-tight">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          hr: () => <hr className="my-2 border-border-subtle/60" />,
          table: ({ children }) => (
            <div className="my-2 w-full overflow-x-auto rounded border border-border-subtle">
              <table className="w-full text-[11px] border-collapse text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-bg-elevated/80 border-b border-border-subtle text-text-primary font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border-subtle/40">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-bg-card/50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 font-semibold text-text-primary">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-text-secondary">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const ChatMessageMarkdown = memo(ChatMessageMarkdownComponent);
