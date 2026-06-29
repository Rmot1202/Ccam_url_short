import { useState } from "react";
import { Eye, EyeOff, XCircle } from "lucide-react";
import type { User } from "../../lib/types";
import { apiSignup } from "../../lib/api";

export default function SignupForm({ onAuth }: { onAuth: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) return setError("Valid email required");
    if (password.length < 6) return setError("Password must be ≥ 6 characters");
    if (!name.trim()) return setError("Name required");

    setLoading(true);
    try {
      const { ok, data } = await apiSignup({ email, password, name });
      if (!ok) return setError(data.detail || "Authentication failed");

      onAuth({
        id: data.id || "u1",
        email: data.email || email,
        name: data.name || name || email.split("@")[0],
        createdAt: Date.now(),
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">NAME</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ada@lovelace.dev"
          className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">PASSWORD</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-input-background border border-border rounded-sm px-3 py-2.5 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-destructive flex items-center gap-1.5">
          <XCircle size={12} /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 font-mono font-semibold text-sm bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50"
      >
        {loading ? "authenticating…" : "create account →"}
      </button>
    </form>
  );
}