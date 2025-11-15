import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, UserRole } from "@/context/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => {
  const { setRole } = useUser();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setRole(selectedRole);

    if (selectedRole === "superadmin") {
      navigate("/super-admin/dashboard");
    } else if (selectedRole === "admin") {
      navigate("/admin/dashboard");
    } else if (selectedRole === "hotesse") {
      navigate("/hotesse/guests");
    } else {
      // utilisateur
      navigate("/utilisateur/pointages");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground">
              Simulation de connexion. Aucun mot de passe réel n'est vérifié.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input type="email" placeholder="admin@example.com" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Mot de passe
              </label>
              <Input type="password" placeholder="••••••••" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Rôle
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedRole === "superadmin" ? "default" : "outline"}
                  onClick={() => setSelectedRole("superadmin")}
                >
                  Super Admin
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "admin" ? "default" : "outline"}
                  onClick={() => setSelectedRole("admin")}
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "hotesse" ? "default" : "outline"}
                  onClick={() => setSelectedRole("hotesse")}
                >
                  Hôtesse
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === "utilisateur" ? "default" : "outline"}
                  onClick={() => setSelectedRole("utilisateur")}
                >
                  Utilisateur
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary-hover">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
