import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/context/UserContext";

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

const readProfile = (): UserProfileData => {
  let parsed: UserProfileData | null = null;
  try {
    const raw = localStorage.getItem("guestlytics_user");
    if (raw) parsed = JSON.parse(raw) as UserProfileData;
  } catch {
    parsed = null;
  }
  return (
    parsed ?? { firstName: "Admin", lastName: "Utilisateur", email: "admin@example.com" }
  );
};

const Profile = () => {
  const { role } = useUser();
  const { toast } = useToast();

  const profile = useMemo(() => readProfile(), []);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const stored = localStorage.getItem("guestlytics_password");

    if (stored && currentPassword !== stored) {
      toast({ title: "Mot de passe incorrect", description: "Le mot de passe actuel est invalide.", variant: "destructive" });
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
      localStorage.setItem("guestlytics_password", newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Mot de passe mis à jour", description: "Votre mot de passe a été changé avec succès." });
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
          <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={profile.firstName} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={profile.lastName} readOnly disabled />
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
