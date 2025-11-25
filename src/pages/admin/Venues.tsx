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

type VenueStatus = "vide" | "en_attente" | "occupee";
type VenueArea = "interieur" | "exterieur" | "les_deux";

interface VenueItem {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: VenueStatus;
  area: VenueArea;
}

const initialVenues: VenueItem[] = [
  {
    id: "v1",
    name: "Salle Royale",
    capacity: 200,
    location: "Centre-ville",
    status: "vide",
    area: "les_deux",
  },
  {
    id: "v2",
    name: "Centre Convention",
    capacity: 500,
    location: "Quartier des affaires",
    status: "en_attente",
    area: "interieur",
  },
  {
    id: "v3",
    name: "Grand Hôtel",
    capacity: 150,
    location: "Bord de mer",
    status: "occupee",
    area: "les_deux",
  },
];

const statusColors: Record<VenueStatus, string> = {
  vide: "bg-muted text-foreground/80",
  en_attente: "bg-amber-500 hover:bg-amber-600",
  occupee: "bg-success hover:bg-success/90",
};

const statusLabels: Record<VenueStatus, string> = {
  vide: "Vide",
  en_attente: "En attente",
  occupee: "Occupée",
};

const Venues = () => {
  const [venues, setVenues] = useState<VenueItem[]>(initialVenues);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | VenueStatus>("tous");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formArea, setFormArea] = useState<VenueArea | "">("");

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
    setDialogOpen(true);
  };

  const openEditDialog = (venue: VenueItem) => {
    setEditingVenue(venue);
    setFormName(venue.name);
    setFormCapacity(venue.capacity.toString());
    setFormLocation(venue.location);
    setFormArea(venue.area);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer définitivement cette salle ?")) {
      setVenues((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCapacity || !formLocation || !formArea) return;

    const capacityValue = Number(formCapacity);
    if (Number.isNaN(capacityValue) || capacityValue <= 0) return;

    const payload: VenueItem = {
      id: editingVenue ? editingVenue.id : Date.now().toString(),
      name: formName,
      capacity: capacityValue,
      location: formLocation,
      status: editingVenue?.status ?? "vide",
      area: formArea as VenueArea,
    };

    setVenues((prev) => {
      if (editingVenue) {
        return prev.map((v) => (v.id === editingVenue.id ? payload : v));
      }
      return [...prev, payload];
    });

    setDialogOpen(false);
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
                <option value="occupee">Occupée</option>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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
