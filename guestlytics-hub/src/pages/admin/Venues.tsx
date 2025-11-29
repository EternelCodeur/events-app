import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getVenues as fetchVenues,
  createVenue as apiCreateVenue,
  updateVenue as apiUpdateVenue,
  deleteVenue as apiDeleteVenue,
} from "@/lib/venues";

type VenueStatus = "vide" | "en_attente" | "occupe";
type VenueArea = "interieur" | "exterieur" | "les_deux";

interface VenueItem {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: VenueStatus;
  area: VenueArea;
}

const statusColors: Record<VenueStatus, string> = {
  vide: "bg-muted text-foreground/80",
  en_attente: "bg-amber-500 hover:bg-amber-600",
  occupe: "bg-success hover:bg-success/90",
};

const statusLabels: Record<VenueStatus, string> = {
  vide: "Vide",
  en_attente: "En attente",
  occupe: "Occupé",
};

const Venues = () => {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | VenueStatus>("tous");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formArea, setFormArea] = useState<VenueArea | "">("");
  const [formStatus, setFormStatus] = useState<VenueStatus>("vide");
  const [formError, setFormError] = useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const data = await fetchVenues();
        setVenues(data as unknown as VenueItem[]);
      } catch (e) {
        console.warn("Failed to fetch venues", e);
      }
    })();
  }, []);

  const filteredVenues = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return venues.filter((venue) => {
      const matchesStatus =
        statusFilter === "tous" ? true : venue.status === statusFilter;

      if (!term) return matchesStatus;

      const haystack = `${venue.name} ${venue.location}`.toLowerCase();
      return matchesStatus && haystack.includes(term);
    });
  }, [venues, searchTerm, statusFilter]);

  const openCreateDialog = () => {
    setEditingVenue(null);
    setFormName("");
    setFormCapacity("");
    setFormLocation("");
    setFormArea("");
    setFormStatus("vide");
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (venue: VenueItem) => {
    setEditingVenue(venue);
    setFormName(venue.name);
    setFormCapacity(venue.capacity.toString());
    setFormLocation(venue.location);
    setFormArea(venue.area);
    setFormStatus(venue.status);
    setFormError("");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette salle ?")) return;
    try {
      await apiDeleteVenue(id);
      setVenues((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.warn("Failed to delete venue", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formName || !formCapacity || !formLocation || !formArea) return;

    const capacityValue = Number(formCapacity);
    if (Number.isNaN(capacityValue) || capacityValue <= 0) return;

    try {
      if (editingVenue) {
        const updated = await apiUpdateVenue(editingVenue.id, {
          name: formName,
          capacity: capacityValue,
          location: formLocation,
          status: formStatus,
          area: formArea as VenueArea,
        });
        setVenues((prev) => prev.map((v) => (v.id === editingVenue.id ? (updated as unknown as VenueItem) : v)));
      } else {
        const created = await apiCreateVenue({
          name: formName,
          capacity: capacityValue,
          location: formLocation,
          status: formStatus,
          area: formArea as VenueArea,
        });
        setVenues((prev) => [...prev, created as unknown as VenueItem]);
      }
      setDialogOpen(false);
    } catch (err) {
      console.warn("Failed to save venue", err);
      const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setFormError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Salles</h1>
          <p className="text-muted-foreground">
            Gérez vos salles, leur capacité et leur localisation
          </p>
        </div>
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover"
          onClick={openCreateDialog}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle salle
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une salle..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrer les salles par statut"
                className="border border-border rounded-md px-4 py-2 text-sm bg-background"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "tous" | VenueStatus)
                }
              >
                <option value="tous">Tous les statuts</option>
                <option value="vide">Vide</option>
                <option value="en_attente">En attente</option>
                <option value="occupe">Occupé</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVenues.map((venue) => (
          <Card key={venue.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {venue.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Capacité : {venue.capacity} places
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{venue.location}</span>
                  </p>
                </div>
                <Badge className={statusColors[venue.status]}>
                  {statusLabels[venue.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openEditDialog(venue)}
                >
                  <Pencil className="w-4 h-4 mr-1" /> 
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDelete(venue.id)}
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
                {editingVenue ? "Modifier la salle" : "Nouvelle salle"}
              </DialogTitle>
            </DialogHeader>
            {formError && (
              <div className="text-sm text-red-600" role="alert">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de la salle</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nom de la salle"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de places</label>
                <Input
                  type="number"
                  min={1}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder="Ex: 200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Localisation</label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Ex: Centre-ville, Quartier des affaires..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type d'espace</label>
                <select
                  aria-label="Sélectionner le type d'espace"
                  className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value as VenueArea)}
                  required
                >
                  <option value="">Choisir...</option>
                  <option value="interieur">Intérieur</option>
                  <option value="exterieur">Extérieur</option>
                  <option value="les_deux">Les deux</option>
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
                {editingVenue ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Venues;
