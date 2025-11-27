import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, UserRole } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login as apiLogin } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";

const Login = () => {
  const { setRole, setUser } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const user = await apiLogin(email, password, remember);
      // Hydrate immédiatement le contexte utilisateur pour que ProtectedRoute laisse passer
      setUser(user);
      const rawRole = (user.role as unknown as string) || "admin";
      const roleForNav: UserRole =
        rawRole === "user"
          ? "utilisateur"
          : (['superadmin','admin','hotesse','utilisateur'].includes(rawRole)
              ? (rawRole as UserRole)
              : "admin");
      setRole(roleForNav);
      if (roleForNav === "superadmin") navigate("/super-admin/dashboard");
      else if (roleForNav === "admin") navigate("/admin/dashboard");
      else if (roleForNav === "hotesse") navigate("/hotesse/guests");
      else navigate("/utilisateur/pointages");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion impossible";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-x-2 flex items-center">
                <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <label htmlFor="remember" className="text-sm text-foreground">Se souvenir de moi</label>
              </div>
            </div>

            {/* Aucun choix de rôle côté UI: l'accès dépend des identifiants en base */}

            <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary-hover">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
