"use client";

import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function MarkdownPreview({ markdownContent }) {
  return (
    <Card className="p-6 bg-zinc-950 text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold mb-6 text-white border-b border-zinc-800 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-semibold mt-8 mb-4 text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-semibold mt-6 mb-3 text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl font-semibold mt-4 mb-2 text-white">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-lg font-semibold mt-4 mb-2 text-white">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-base font-semibold mt-4 mb-2 text-white">
              {children}
            </h6>
          ),

          // Paragraphs and text
          p: ({ children }) => (
            <p className="mb-4 text-zinc-300 leading-relaxed text-white">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-300">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through text-zinc-500">{children}</del>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-2 mb-4 ml-4 list-disc text-white">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-4 ml-4 list-decimal text-white">
              {children}
            </ol>
          ),
          li: ({ children, checked, ordered }) => {
            if (checked !== undefined) {
              return (
                <li className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mt-1"
                  />
                  <span className="text-white">{children}</span>
                </li>
              );
            }
            return <li className="text-white">{children}</li>;
          },

          // Links and Images
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-400 hover:text-blue-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src || "/placeholder.svg"}
              alt={alt}
              className="max-w-full h-auto rounded-lg my-4"
            />
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-700 pl-4 my-4 text-zinc-400 italic">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-zinc-800 text-white">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="text-white-900">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-zinc-800">{children}</tbody>
          ),
          tr: ({ children, isHeader }) => (
            <tr className={isHeader ? "text-white-900" : ""}>{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-white-300">{children}</td>
          ),

          // Horizontal Rule
          hr: () => <hr className="my-8 text-white-800" />,

          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline ? (
              <div className="my-4">
                <SyntaxHighlighter
                  style={oneDark}
                  language={match ? match[1] : "text"}
                  PreTag="div"
                  className="rounded-lg !bg-zinc-900 !p-4"
                  showLineNumbers
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className="text-white-800 rounded px-1.5 py-0.5 text-sm font-mono text-white"
                {...props}
              >
                {children}
              </code>
            );
          },

          // Definition Lists
          dl: ({ children }) => <dl className="mb-4 space-y-4">{children}</dl>,
          dt: ({ children }) => (
            <dt className="font-semibold text-white">{children}</dt>
          ),
          dd: ({ children }) => (
            <dd className="ml-4 text-zinc-300">{children}</dd>
          ),

          // Custom HTML elements
          kbd: ({ children }) => (
            <kbd className="px-2 py-1.5 text-xs font-semibold text-zinc-300 bg-white-800 border border-zinc-700 rounded-lg">
              {children}
            </kbd>
          ),
          div: ({ children, ...props }) => (
            <div className="my-4 text-white text-center" {...props}>
              {children}
            </div>
          ),
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </Card>
  );
}
