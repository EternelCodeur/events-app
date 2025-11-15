import { useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const mockCompanies = [
  {
    id: "1",
    name: "Entreprise Alpha",
    email: "contact@alpha.com",
    phone: "+33 1 23 45 67 89",
    adminName: "Alice Martin",
    events: 12,
    status: "active" as "active" | "inactive",
  },
  {
    id: "2",
    name: "Entreprise Beta",
    email: "contact@beta.com",
    phone: "+33 1 98 76 54 32",
    adminName: "Bruno Dupont",
    events: 5,
    status: "active" as "active" | "inactive",
  },
  {
    id: "3",
    name: "Entreprise Gamma",
    email: "contact@gamma.com",
    phone: "+33 6 12 34 56 78",
    adminName: "Claire Durand",
    events: 0,
    status: "inactive" as "active" | "inactive",
  },
];

const Companies = () => {
  const [companies, setCompanies] = useState(mockCompanies);

  // Création
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAdminName, setNewAdminName] = useState("");

  // Édition
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAdminName, setEditAdminName] = useState("");

  const handleAddCompany = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newCompany = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      adminName: newAdminName.trim(),
      events: 0,
      status: "active" as "active" | "inactive",
    };
    setCompanies((prev) => [newCompany, ...prev]);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewAdminName("");
    setIsCreateDialogOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c,
      ),
    );
  };

  const handleDelete = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEdit = (id: string) => {
    const company = companies.find((c) => c.id === id);
    if (!company) return;
    setEditingId(company.id);
    setEditName(company.name);
    setEditEmail(company.email || "");
    setEditPhone(company.phone || "");
    setEditAdminName(company.adminName || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateCompany = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: editName.trim() || c.name,
              email: editEmail.trim(),
              phone: editPhone.trim(),
              adminName: editAdminName.trim(),
            }
          : c,
      ),
    );
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestion des entreprises</h1>
          <p className="text-muted-foreground">
            Gestion des entreprises clientes de la plateforme
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary-hover"
          type="button"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle entreprise
        </Button>
      </div>

      {/* Modale de création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle entreprise</DialogTitle>
            <DialogDescription>
              Créez une nouvelle entreprise cliente de la plateforme.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddCompany}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="company-name">
                Nom de l'entreprise
              </label>
              <input
                id="company-name"
                type="text"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Ex. EventPro Agency"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="company-admin">
                Nom de l'administrateur
              </label>
              <input
                id="company-admin"
                type="text"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Ex. Marie Dupont"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="company-email">
                Email de l'entreprise
              </label>
              <input
                id="company-email"
                type="email"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="contact@entreprise.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="company-phone">
                Téléphone de l'entreprise
              </label>
              <input
                id="company-phone"
                type="tel"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ex. +241 66 34 56 78"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'entreprise</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de l'entreprise sélectionnée.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateCompany}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="edit-company-name">
                Nom de l'entreprise
              </label>
              <input
                id="edit-company-name"
                type="text"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="edit-company-admin">
                Nom de l'administrateur
              </label>
              <input
                id="edit-company-admin"
                type="text"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={editAdminName}
                onChange={(e) => setEditAdminName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="edit-company-email">
                Email de l'entreprise
              </label>
              <input
                id="edit-company-email"
                type="email"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="edit-company-phone">
                Téléphone de l'entreprise
              </label>
              <input
                id="edit-company-phone"
                type="tel"
                className="w-full h-9 px-3 py-1 border rounded-md bg-background text-sm"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-foreground">
                  {company.name}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    company.status === "active"
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {company.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {company.email && <p>{company.email}</p>}
                {company.phone && <p>{company.phone}</p>}
                <p>
                  Administrateur : {company.adminName || "Non défini"}
                </p>
                <p>{company.events} événement(s) total</p>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  onClick={() => handleEdit(company.id)}
                  aria-label="Modifier l'entreprise"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive border-destructive/40"
                  type="button"
                  onClick={() => handleDelete(company.id)}
                  aria-label="Supprimer l'entreprise"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={company.status === "active" ? "outline" : "default"}
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  onClick={() => handleToggleStatus(company.id)}
                  aria-label={company.status === "active" ? "Désactiver l'entreprise" : "Activer l'entreprise"}
                >
                  {company.status === "active" ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Companies;
