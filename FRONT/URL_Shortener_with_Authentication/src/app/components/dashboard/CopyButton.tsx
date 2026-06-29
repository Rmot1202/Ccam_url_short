import { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="group flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors duration-150"
    >
      {copied ? <CheckCircle size={12} className="text-primary" /> : <Copy size={12} />}
      <span className={copied ? "text-primary" : ""}>{copied ? "copied" : "copy"}</span>
    </button>
  );
}