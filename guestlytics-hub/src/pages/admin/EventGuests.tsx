import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Pencil, Trash2, User, Users, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const mockEvents = [
  { id: "1", title: "Mariage Dupont" },
  { id: "2", title: "Conférence Tech 2025" },
  { id: "3", title: "Gala Entreprise ABC" },
];

interface EventGuest {
  id: string;
  lastName: string;
  firstName: string;
  phone: string;
  peopleCount: number;
  tableName: string;
  companions?: string[];
}

const initialGuests: EventGuest[] = [
  {
    id: "g1",
    lastName: "Dupont",
    firstName: "Jean",
    phone: "+33 6 12 34 56 78",
    peopleCount: 2,
    tableName: "Table 1",
  },
  {
    id: "g2",
    lastName: "Martin",
    firstName: "Sophie",
    phone: "+33 6 98 76 54 32",
    peopleCount: 1,
    tableName: "Table 2",
  },
];

// Tables disponibles pour l'événement (à remplacer par les données de la base plus tard)
const availableTables = [
  { id: "t1", name: "Table 1" },
  { id: "t2", name: "Table 2" },
  { id: "t3", name: "Table 3" },
];

const EventGuests = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const event = mockEvents.find((e) => e.id === id);

  const [guests, setGuests] = useState<EventGuest[]>(initialGuests);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);

  const [formLastName, setFormLastName] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPeopleCount, setFormPeopleCount] = useState("");
  const [formTableName, setFormTableName] = useState("");
  const [formCompanions, setFormCompanions] = useState<string[]>([]);

  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return guests;

    return guests.filter((g) =>
      `${g.lastName} ${g.firstName} ${g.tableName}`
        .toLowerCase()
        .includes(term),
    );
  }, [guests, searchTerm]);

  const openCreateDialog = () => {
    setEditingGuest(null);
    setFormLastName("");
    setFormFirstName("");
    setFormPhone("");
    setFormPeopleCount("");
    setFormTableName("");
    setFormCompanions([]);
    setDialogOpen(true);
  };

  const openEditDialog = (guest: EventGuest) => {
    setEditingGuest(guest);
    setFormLastName(guest.lastName);
    setFormFirstName(guest.firstName);
    setFormPhone(guest.phone);
    setFormPeopleCount(guest.peopleCount.toString());
    setFormTableName(guest.tableName);
    setFormCompanions([]);
    setDialogOpen(true);
  };

  const handleDelete = (idToDelete: string) => {
    if (window.confirm("Supprimer définitivement cet invité ?")) {
      setGuests((prev) => prev.filter((g) => g.id !== idToDelete));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLastName || !formFirstName || !formPhone || !formPeopleCount || !formTableName)
      return;

    const peopleValue = Number(formPeopleCount);
    if (Number.isNaN(peopleValue) || peopleValue <= 0) return;

    const payload: EventGuest = {
      id: editingGuest ? editingGuest.id : Date.now().toString(),
      lastName: formLastName,
      firstName: formFirstName,
      phone: formPhone,
      peopleCount: peopleValue,
      tableName: formTableName,
      companions: formCompanions.filter((name) => name.trim().length > 0),
    };

    setGuests((prev) => {
      if (editingGuest) {
        return prev.map((g) => (g.id === editingGuest.id ? payload : g));
      }
      return [...prev, payload];
    });

    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {event ? event.title : "Événement inconnu"}
          </h1>
          <p className="text-muted-foreground">
            Gestion des invités pour cet événement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/events/${id}/manage`)}
          >
            Retour
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover"
            onClick={openCreateDialog}
          >
            Nouvel invité
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un invité..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuests.map((guest) => (
          <Card key={guest.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {guest.lastName} {guest.firstName}
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Table : {guest.tableName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    <span>{guest.phone}</span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4" />
                    <span>Nombre de personnes : {guest.peopleCount}</span>
                  </p>
                  {guest.companions && guest.companions.length > 0 && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium">Accompagnants :</span>{" "}
                      <span>{guest.companions.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openEditDialog(guest)}
                >
                  <Pencil className="w-4 h-4 mr-1" /> 
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDelete(guest.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
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
                {editingGuest ? "Modifier l'invité" : "Nouvel invité"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <Input
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  placeholder="Nom"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prénom</label>
                <Input
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Téléphone"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de personnes</label>
                <Input
                  type="number"
                  min={1}
                  value={formPeopleCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormPeopleCount(value);

                    const nb = Number(value);
                    if (!Number.isNaN(nb) && nb > 1) {
                      // nb personnes au total => nb - 1 accompagnants
                      setFormCompanions((prev) => {
                        const next = [...prev];
                        if (next.length < nb - 1) {
                          while (next.length < nb - 1) {
                            next.push("");
                          }
                        } else if (next.length > nb - 1) {
                          next.splice(nb - 1);
                        }
                        return next;
                      });
                    } else {
                      setFormCompanions([]);
                    }
                  }}
                  placeholder="Ex: 2"
                  required
                />
              </div>
              {formCompanions.map((value, index) => (
                <div className="md:col-span-2" key={index}>
                  <label className="block text-sm font-medium mb-1">
                    Nom de la personne #{index + 2}
                  </label>
                  <Input
                    value={value}
                    onChange={(e) => {
                      const next = [...formCompanions];
                      next[index] = e.target.value;
                      setFormCompanions(next);
                    }}
                    placeholder="Nom de l'accompagnant"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom de la table</label>
                <select
                  aria-label="Choisir une table"
                  className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                  value={formTableName}
                  onChange={(e) => setFormTableName(e.target.value)}
                  required
                >
                  <option value="">Sélectionner une table...</option>
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.name}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>
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
                {editingGuest ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventGuests;
