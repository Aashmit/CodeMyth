import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

interface MarkdownPreviewProps {
  markdownContent: string;
}

interface MarkdownCodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({
  inline,
  className,
  children,
  ...props
}) => {
  return inline ? (
    <code style={styles.inlineCode} {...props}>
      {children}
    </code>
  ) : (
    <pre style={styles.codeBlock}>
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  );
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  markdownContent,
}) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: MarkdownCodeBlock as any, // Using the extracted component
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    width: "100%",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  } as React.CSSProperties,

  container: {
    width: "80%",
    maxWidth: "800px",
    height: "90vh",
    overflowY: "auto",
    overflowX: "auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    wordWrap: "break-word",
  } as React.CSSProperties,

  codeBlock: {
    backgroundColor: "#282c34",
    color: "#abb2bf",
    padding: "10px",
    borderRadius: "5px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  } as React.CSSProperties,

  inlineCode: {
    backgroundColor: "#f4f4f4",
    padding: "2px 4px",
    borderRadius: "4px",
    fontFamily: "Courier, monospace",
  } as React.CSSProperties,
};

export default MarkdownPreview;
