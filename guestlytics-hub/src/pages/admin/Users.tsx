import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { AppRole, AppUser, CreateUserPayload, UpdateUserPayload } from "../../lib/userApi";
import { listUsers, createUser, updateUser, deleteUser } from "../../lib/userApi";

const roleLabels: Record<AppRole, string> = {
  hotesse: "Hôtesse",
  utilisateur: "Utilisateur",
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("utilisateur");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listUsers();
        const filtered = data.filter((u) => u.role === "utilisateur" || u.role === "hotesse");
        setUsers(filtered);
      } catch (e) {
        setError((e as { message?: string })?.message || "Erreur de chargement");
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(term));
  }, [users, search]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("utilisateur");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setFormError("");
    setDialogOpen(true);
  };

  const save = async () => {
    setFormError("");
    try {
      if (!name || !email || !role) {
        setFormError("Tous les champs requis doivent être remplis");
        return;
      }
      if (editing) {
        const payload: UpdateUserPayload = { name, email, role };
        const updated = await updateUser(editing.id, payload);
        setUsers((prev) => prev.map((u) => (u.id === editing.id ? updated : u)));
      } else {
        const payload: CreateUserPayload = { name, email, role };
        const created = await createUser(payload);
        setUsers((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
    } catch (e) {
      setFormError((e as { message?: string })?.message || "Erreur lors de l'enregistrement");
    }
  };

  const remove = async (u: AppUser) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      await deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      setError((e as { message?: string })?.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Créez et gérez les administrateurs, hôtesses et utilisateurs.</p>
        </div>
        <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card className="border border-border">
        <CardHeader></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Rechercher par nom ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <div>
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">Aucun utilisateur</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((u) => (
                    <Card key={u.id} className="border border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-foreground">{u.name}</div>
                            <div className="text-sm text-muted-foreground">{u.email}</div>
                            <div className="mt-2 inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
                              {roleLabels[u.role]}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" className="bg-primary hover:bg-primary-hover text-white" size="sm" onClick={() => openEdit(u)} aria-label={`Modifier ${u.name}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" size="sm" onClick={() => remove(u)} aria-label={`Supprimer ${u.name}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier un utilisateur" : "Créer un utilisateur"}</DialogTitle>
          </DialogHeader>
          {formError && <div className="text-destructive text-sm mb-2">{formError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Nom</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Rôle</label>
              <select id="user-role" aria-label="Rôle" className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full" value={role} onChange={(e) => setRole(e.target.value as AppRole)} required>
                <option value="utilisateur">Utilisateur</option>
                <option value="hotesse">Hôtesse</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
