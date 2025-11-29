import React, { useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getStaff as fetchStaff,
  createStaff as apiCreateStaff,
  updateStaff as apiUpdateStaff,
  deleteStaff as apiDeleteStaff,
} from "@/lib/staff";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive";
  phone?: string;
}

const initialStaff: StaffMember[] = [];

const Staff = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formError, setFormError] = useState("");
  const roles = [
    "Superviseur",
    "Maître d'hôtel",
    "Serveurs",
    "Hôtesses",
    "Plonge",
    "Vestiaire",
    "Sécurité",
    "Autres",
  ];
  const [selectedRole, setSelectedRole] = useState<string>(roles[0]);
  const [customRole, setCustomRole] = useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const data = await fetchStaff();
        setStaffList(data as unknown as StaffMember[]);
      } catch (e) {
        console.warn("Failed to fetch staff", e);
      }
    })();
  }, []);

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return staffList;

    return staffList.filter((member) =>
      `${member.name} ${member.role}`.toLowerCase().includes(term),
    );
  }, [staffList, searchTerm]);

  const openCreateDialog = () => {
    setEditingStaff(null);
    setFormName("");
    setFormPhone("");
    setSelectedRole(roles[0]);
    setCustomRole("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (member: StaffMember) => {
    setEditingStaff(member);
    setFormName(member.name);
    setFormPhone(member.phone || "");
    if (roles.includes(member.role)) {
      setSelectedRole(member.role);
      setCustomRole("");
    } else {
      setSelectedRole("Autres");
      setCustomRole(member.role);
    }
    setFormError("");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce membre du personnel ?")) return;
    try {
      await apiDeleteStaff(id);
      setStaffList((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.warn("Failed to delete staff", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const finalRole = selectedRole === "Autres" ? customRole.trim() : selectedRole;
    if (!formName || !finalRole) return;

    try {
      if (editingStaff) {
        const updated = await apiUpdateStaff(editingStaff.id, {
          name: formName,
          role: finalRole,
          phone: formPhone || undefined,
        });
        setStaffList((prev) => prev.map((m) => (m.id === editingStaff.id ? (updated as unknown as StaffMember) : m)));
      } else {
        const created = await apiCreateStaff({
          name: formName,
          role: finalRole,
          phone: formPhone || undefined,
          status: "inactive",
        });
        setStaffList((prev) => [...prev, created as unknown as StaffMember]);
      }
      setDialogOpen(false);
    } catch (err) {
      console.warn("Failed to save staff", err);
      const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setFormError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Personnel</h1>
          <p className="text-muted-foreground">
            Gérez votre équipe et suivez les pointages
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter employé
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre du personnel..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff) => (
          <Card key={staff.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-lg">
                  {staff.name.charAt(0)}
                </div>
                <Badge
                  variant={staff.status === "active" ? "default" : "secondary"}
                  className={
                    staff.status === "active"
                      ? "bg-success hover:bg-success/90"
                      : ""
                  }
                >
                  {staff.status === "active" ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                {staff.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{staff.role}</p>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{staff.phone}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-blue-800 hover:bg-blue-900 text-white hover:text-white"
                  onClick={() => openEditDialog(staff)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDelete(staff.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white hover:text-white"
                  asChild
                >
                  <Link
                    to={`/admin/staff/${staff.id}/attendance`}
                    state={{ name: staff.name, position: staff.role }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? "Modifier le membre" : "Ajouter un membre"}
              </DialogTitle>
            </DialogHeader>

            {formError && (
              <div className="text-sm text-red-600" role="alert">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom du membre</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nom et prénom"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: +33 6 12 34 56 78"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Poste</label>
                <select
                  aria-label="Sélectionner un poste"
                  className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              {selectedRole === "Autres" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Préciser le poste
                  </label>
                  <Input
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Ex: DJ, Coordinateur..."
                    required
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                {editingStaff ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;
