import { Link2 } from "lucide-react";
import type { Page, User } from "../../lib/types";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthPage({
  mode,
  onAuth,
  onSwitch,
}: {
  mode: "login" | "signup";
  onAuth: (user: User) => void;
  onSwitch: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #39ff14 0px, #39ff14 1px, transparent 1px, transparent 40px)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Link2 size={20} className="text-primary" />
            <span className="font-mono font-bold text-lg text-foreground tracking-widest">SNIP.DEV</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {mode === "login" ? "sign in to your account" : "create an account"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-sm">
          <div className="px-5 py-3 border-b border-border">
            <span className="font-mono text-xs text-muted-foreground">
              {mode === "login" ? "$ auth login" : "$ auth signup"}
            </span>
          </div>

          {mode === "login" ? <LoginForm onAuth={onAuth} /> : <SignupForm onAuth={onAuth} />}

          <div className="px-5 py-3 border-t border-border text-center">
            <span className="text-xs font-mono text-muted-foreground">
              {mode === "login" ? "no account?" : "have an account?"}{" "}
              <button onClick={onSwitch} className="text-primary hover:text-primary/80 transition-colors">
                {mode === "login" ? "sign up" : "sign in"}
              </button>
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] font-mono text-muted-foreground/50">
          links are TTL-cached via Redis · no tracking
        </p>
      </div>
    </div>
  );
}