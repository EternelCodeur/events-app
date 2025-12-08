import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/context/UserContext";

const Profile = () => {
  const { role, user } = useUser();
  const { toast } = useToast();

  const profile = useMemo(() => {
    const fullName = (user as any)?.name as string | undefined;
    let firstName = "";
    let lastName = "";
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        firstName = parts[0];
      } else if (parts.length > 1) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
    }
    const email = (user as any)?.email || "";
    return {
      firstName: firstName || "",
      lastName: lastName || "",
      email: email || "",
    };
  }, [user]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!currentPassword) {
      toast({ title: "Mot de passe actuel requis", description: "Veuillez saisir votre mot de passe actuel.", variant: "destructive" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Nouveau mot de passe trop court", description: "Minimum 6 caractères.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Confirmation invalide", description: "Les deux mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data as any)?.message || "Impossible de changer le mot de passe";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Mot de passe mis à jour", description: (data as any)?.message || "Votre mot de passe a été changé avec succès." });
    } catch (err) {
      const msg = (err as { message?: string })?.message || "Impossible de changer le mot de passe";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Mon Profil</h1>
        <p className="text-muted-foreground">Consultez vos informations et modifiez votre mot de passe.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Informations personnelles</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={profile.firstName} readOnly disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input value={profile.email} readOnly disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Rôle</Label>
              <Input value={role} readOnly disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Changer le mot de passe</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Mot de passe actuel</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmer le mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="bg-primary hover:bg-primary-hover" disabled={submitting}>
                {submitting ? "Enregistrement..." : "Mettre à jour"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
