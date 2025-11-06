import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/layout/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast({ title: "Signed in" });
      const to = loc.state?.from?.pathname || "/";
      nav(to, { replace: true });
    } catch (e: any) {
      toast({
        title: "Login failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 pt-20 overflow-hidden">
      {/* Background image with subtle blur */}
      <div className="absolute inset-0 -z-10">
        <img
          src="/bg1.jpg"
          alt="Construction site background"
          className="w-full h-full object-cover blur-[2px] scale-105"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-background/40" />
      </div>
      {/* Top welcome bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground flex items-center justify-between shadow-sm z-10 px-4">
        <div className="flex items-center gap-2">
          <Logo collapsed size={42} />
        </div>
        <span className="text-lg font-semibold tracking-wide">
          Welcome to VeManage
        </span>
      </div>
      <Card className="w-full max-w-sm backdrop-blur-[1px] bg-background/80">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="text-sm">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
