import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, CheckCircle2, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getEvents as fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
} from "@/lib/events";
import { getVenues as fetchVenues, type Venue } from "@/lib/venues";

type EventStatus = "en_attente" | "confirme" | "annuler" | "en_cours" | "termine" | "echoue";
type VenueArea = "interieur" | "exterieur" | "les_deux";
type EventType = "mariage" | "celebration_religieuse" | "cocktail";

interface EventItem {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  guests: number;
  status: EventStatus;
  budget: string;
  capacity?: number;
  eventType?: EventType;
  areaChoice?: VenueArea;
  mariageInteriorSubtype?: "civil" | "coutumier";
  mariageExteriorSubtype?: "civil" | "coutumier";
}

// Les événements sont chargés depuis l'API

const statusColors: Record<EventStatus | "all", string> = {
  en_attente: "bg-accent hover:bg-accent/90",
  confirme: "bg-success hover:bg-success/90",
  en_cours: "bg-primary hover:bg-primary/90",
  termine: "bg-orange-500 hover:bg-orange-600",
  annuler: "bg-destructive hover:bg-destructive/90",
  echoue: "bg-destructive/80 hover:bg-destructive",
  all: "bg-muted",
};

const statusLabels: Record<EventStatus, string> = {
  en_attente: "En attente",
  confirme: "Confirmé",
  en_cours: "En cours",
  termine: "Terminé",
  annuler: "Annulé",
  echoue: "Échoué",
};

const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<
    { id: string; name: string; area: VenueArea; status: "vide" | "en_attente" | "occupe"; capacity: number }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [vs, es] = await Promise.all([fetchVenues(), fetchEvents()]);
        const vlist = (vs as Venue[]).map((v) => ({
          id: String(v.id),
          name: String(v.name),
          area: v.area as VenueArea,
          status: v.status,
          capacity: Number(v.capacity) || 0,
        }));
        setVenues(vlist);
        setEvents(es as unknown as EventItem[]);
      } catch (e) {
        console.warn("Failed to load events or venues", e);
      }
    })();
  }, []);

  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formEventType, setFormEventType] = useState<EventType | "">("");
  const [formAreaChoice, setFormAreaChoice] = useState<VenueArea | "">("");
  const [formMariageInterior, setFormMariageInterior] = useState<"civil" | "coutumier" | "">("");
  const [formMariageExterior, setFormMariageExterior] = useState<"civil" | "coutumier" | "">("");
  const [formError, setFormError] = useState("");

  const selectedVenue = useMemo(() => venues.find((v) => v.id === formVenue), [formVenue, venues]);
  const selectedVenueArea = selectedVenue?.area;
  const allowedAreas = useMemo(() => {
    if (!selectedVenueArea) return [] as VenueArea[];
    if (selectedVenueArea === "les_deux") return ["interieur", "exterieur", "les_deux"] as VenueArea[];
    return [selectedVenueArea];
  }, [selectedVenueArea]);

  const availableVenues = useMemo(() => {
    let list = venues;
    if (formDate) {
      const s = formStartTime;
      const e = formEndTime;
      const occupied = new Set(
        events
          .filter(
            (ev) =>
              ev.date === formDate &&
              (ev.status === "en_attente" || ev.status === "confirme") &&
              (!editingEvent || ev.id !== editingEvent.id),
          )
          .filter((ev) => {
            const es = ev.startTime || "";
            const ee = ev.endTime || "";
            if (s && e) {
              // existing all-day (missing times) or overlapping intervals
              if (!es || !ee) return true;
              return es < e && ee > s;
            }
            // if no times selected, only conflict with all-day existing events
            return !es || !ee;
          })
          .map((ev) => ev.venue),
      );
      list = venues.filter((v) => !occupied.has(v.id));
    }
    // Filter by capacity if a desired capacity is provided
    const desired = Number(formCapacity || 0);
    if (Number.isFinite(desired) && desired > 0) {
      list = list.filter((v) => (Number(v.capacity) || 0) >= desired);
    }
    // Always keep the currently assigned venue when editing
    if (editingEvent?.venue) {
      const current = venues.find((v) => v.id === editingEvent.venue);
      if (current && !list.some((v) => v.id === current.id)) {
        list = [current, ...list];
      }
    }
    return list;
  }, [venues, events, formDate, formStartTime, formEndTime, formCapacity, editingEvent]);

  useEffect(() => {
    if (allowedAreas.length === 1) {
      if (formAreaChoice !== allowedAreas[0]) setFormAreaChoice(allowedAreas[0]);
    } else if (allowedAreas.length && formAreaChoice && !allowedAreas.includes(formAreaChoice as VenueArea)) {
      setFormAreaChoice("");
    }
  }, [allowedAreas, formAreaChoice]);

  useEffect(() => {
    if (formEventType !== "mariage") {
      setFormMariageInterior("");
      setFormMariageExterior("");
      return;
    }
    if (formAreaChoice === "interieur") {
      setFormMariageInterior((prev) => prev || "civil");
      setFormMariageExterior("");
    } else if (formAreaChoice === "exterieur") {
      setFormMariageExterior((prev) => prev || "coutumier");
      setFormMariageInterior("");
    } else if (formAreaChoice === "les_deux") {
      setFormMariageInterior((prev) => prev || "civil");
      setFormMariageExterior((prev) => prev || "coutumier");
    } else {
      setFormMariageInterior("");
      setFormMariageExterior("");
    }
  }, [formEventType, formAreaChoice]);

  const mapAreaLabel = (a?: VenueArea) =>
    a === "interieur" ? "Intérieur" : a === "exterieur" ? "Extérieur" : a === "les_deux" ? "Les deux" : "";
  const mapEventTypeLabel = (t?: EventType) =>
    t === "mariage" ? "Mariage" : t === "celebration_religieuse" ? "Célébration religieuse" : t === "cocktail" ? "Cocktail" : "";

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormCapacity("");
    setFormBudget("");
    setFormVenue("");
    setFormEventType("");
    setFormAreaChoice("");
    setFormMariageInterior("");
    setFormMariageExterior("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (event: EventItem) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormStartTime(event.startTime ? event.startTime.slice(0,5) : "");
    setFormEndTime(event.endTime ? event.endTime.slice(0,5) : "");
    setFormCapacity(event.capacity?.toString() ?? "");
    setFormBudget(event.budget);
    setFormVenue(event.venue);
    setFormEventType(event.eventType ?? "");
    setFormAreaChoice(event.areaChoice ?? "");
    setFormMariageInterior(event.mariageInteriorSubtype ?? "");
    setFormMariageExterior(event.mariageExteriorSubtype ?? "");
    setFormError("");
    setDialogOpen(true);
  };

  const openDetailsDialog = (event: EventItem) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  const goToManagePage = (event: EventItem) => {
    navigate(`/admin/events/${event.id}/manage`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cet événement ?")) return;
    try {
      await apiDeleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      try {
        const vs = await fetchVenues();
        const vlist = (vs as Venue[]).map((v) => ({
          id: String(v.id),
          name: String(v.name),
          area: v.area as VenueArea,
          status: v.status,
          capacity: Number(v.capacity) || 0,
        }));
        setVenues(vlist);
      } catch (e) {
        console.debug("Skip venues refresh after delete", e);
      }
    } catch (e) {
      console.warn("Failed to delete event", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formTitle) {
      return;
    }
    if (!formDate) {
      return;
    }
    if (!formEventType) {
      return;
    }
    if ((formEventType === "mariage" || formEventType === "cocktail" || formEventType === "celebration_religieuse") && formVenue && !formAreaChoice) {
      return;
    }
    if (formEventType === "mariage" && formVenue) {
      if ((formAreaChoice === "interieur" || formAreaChoice === "les_deux") && !formMariageInterior) return;
      if ((formAreaChoice === "exterieur" || formAreaChoice === "les_deux") && !formMariageExterior) return;
    }

    try {
      if (editingEvent) {
        const updated = await apiUpdateEvent(editingEvent.id, {
          title: formTitle,
          date: formDate,
          startTime: formStartTime || undefined,
          endTime: formEndTime || undefined,
          venueId: formVenue || undefined,
          guests: formCapacity ? Number(formCapacity) : undefined,
          status: editingEvent.status ?? ("en_attente" as EventStatus),
          budget: formBudget || undefined,
          eventType: formEventType || undefined,
          areaChoice: formAreaChoice || undefined,
          mariageInteriorSubtype: formMariageInterior || undefined,
          mariageExteriorSubtype: formMariageExterior || undefined,
        });
        setEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? (updated as unknown as EventItem) : ev)));
        try {
          const vs = await fetchVenues();
          const vlist = (vs as Venue[]).map((v) => ({
            id: String(v.id),
            name: String(v.name),
            area: v.area as VenueArea,
            status: v.status,
            capacity: Number(v.capacity) || 0,
          }));
          setVenues(vlist);
        } catch (e) {
          console.debug("Skip venues refresh after update", e);
        }
      } else {
        const created = await apiCreateEvent({
          title: formTitle,
          date: formDate,
          startTime: formStartTime || undefined,
          endTime: formEndTime || undefined,
          venueId: formVenue || undefined,
          guests: formCapacity ? Number(formCapacity) : undefined,
          status: "en_attente",
          budget: formBudget || undefined,
          eventType: formEventType || undefined,
          areaChoice: formAreaChoice || undefined,
          mariageInteriorSubtype: formMariageInterior || undefined,
          mariageExteriorSubtype: formMariageExterior || undefined,
        });
        setEvents((prev) => [...prev, created as unknown as EventItem]);
        try {
          const vs = await fetchVenues();
          const vlist = (vs as Venue[]).map((v) => ({
            id: String(v.id),
            name: String(v.name),
            area: v.area as VenueArea,
            status: v.status,
            capacity: Number(v.capacity) || 0,
          }));
          setVenues(vlist);
        } catch (e) {
          console.debug("Skip venues refresh after create", e);
        }
      }
      setDialogOpen(false);
    } catch (err) {
      console.warn("Failed to save event", err);
      const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setFormError(message);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesStatus =
        statusFilter === "all" ? true : event.status === statusFilter;

      const term = searchTerm.trim().toLowerCase();
      if (!term) return matchesStatus;

      const haystack = `${event.title}`;
      return matchesStatus && haystack.includes(term);
    });
  }, [events, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Événements</h1>
          <p className="text-muted-foreground">
            Gérez tous vos événements en un seul endroit
          </p>
        </div>
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover"
          onClick={openCreateDialog}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un événement..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrer par statut"
                className="border  border-border rounded-md px-4 py-2 text-sm bg-background"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | EventStatus,
                  )
                }
              >
                <option value="all">Tous les statuts</option>
                <option value="confirme">Confirmé</option>
                <option value="en_cours">En cours</option>
                <option value="en_attente">En attente</option>
                <option value="termine">Terminé</option>
                <option value="echoue">Échoué</option>
                <option value="annuler">Annulé</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <Card
            key={event.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event.startTime} - {event.endTime}
                  </p>
                </div>
                <Badge className={statusColors[event.status as keyof typeof statusColors]}>
                  {statusLabels[event.status as keyof typeof statusLabels]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lieu</span>
                  <span className="font-medium text-foreground">{venues.find((v) => v.id === event.venue)?.name || event.venue}</span>
                </div>
                {event.eventType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-foreground">{mapEventTypeLabel(event.eventType)}</span>
                  </div>
                )}
                {event.areaChoice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zone</span>
                    <span className="font-medium text-foreground">{mapAreaLabel(event.areaChoice)}</span>
                  </div>
                )}
                {event.eventType === "mariage" && (event.mariageInteriorSubtype || event.mariageExteriorSubtype) && (
                  <div className="flex flex-col gap-1">
                    {event.mariageInteriorSubtype && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Intérieur</span>
                        <span className="font-medium text-foreground">
                          {event.mariageInteriorSubtype === "civil" ? "Mariage civil" : "Mariage coutumier"}
                        </span>
                      </div>
                    )}
                    {event.mariageExteriorSubtype && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extérieur</span>
                        <span className="font-medium text-foreground">
                          {event.mariageExteriorSubtype === "coutumier" ? "Mariage coutumier" : "Mariage civil"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invités</span>
                  <span className="font-medium text-foreground">{event.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium text-foreground">{event.budget}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openDetailsDialog(event)}
                >
                  Détails
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary-hover text-white"
                  onClick={() => goToManagePage(event)}
                >
                  Gérer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog Détails événement */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent>
          {selectedEvent && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Détails de l'événement</DialogTitle>
              </DialogHeader>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Nom : </span>
                  <span>{selectedEvent.title}</span>
                </div>
                <div>
                  <span className="font-semibold">Date : </span>
                  <span>
                    {new Date(selectedEvent.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {selectedEvent.startTime && selectedEvent.endTime && (
                  <div>
                    <span className="font-semibold">Heure : </span>
                    <span>
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-semibold">Lieu : </span>
                  <span>{venues.find((v) => v.id === selectedEvent.venue)?.name || selectedEvent.venue}</span>
                </div>
                {selectedEvent.eventType && (
                  <div>
                    <span className="font-semibold">Type : </span>
                    <span>{mapEventTypeLabel(selectedEvent.eventType)}</span>
                  </div>
                )}
                {selectedEvent.areaChoice && (
                  <div>
                    <span className="font-semibold">Zone : </span>
                    <span>{mapAreaLabel(selectedEvent.areaChoice)}</span>
                  </div>
                )}
                {selectedEvent.eventType === "mariage" && (selectedEvent.mariageInteriorSubtype || selectedEvent.mariageExteriorSubtype) && (
                  <div>
                    <span className="font-semibold">Sous-type : </span>
                    <span>
                      {selectedEvent.mariageInteriorSubtype && `Intérieur: ${selectedEvent.mariageInteriorSubtype === "civil" ? "civil" : "coutumier"}`}
                      {selectedEvent.mariageInteriorSubtype && selectedEvent.mariageExteriorSubtype ? " | " : ""}
                      {selectedEvent.mariageExteriorSubtype && `Extérieur: ${selectedEvent.mariageExteriorSubtype === "civil" ? "civil" : "coutumier"}`}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-semibold">Invités : </span>
                  <span>{selectedEvent.guests}</span>
                </div>
                <div>
                  <span className="font-semibold">Budget : </span>
                  <span>{selectedEvent.budget}</span>
                </div>
                <div>
                  <span className="font-semibold">Statut : </span>
                  <Badge className={statusColors[selectedEvent.status as keyof typeof statusColors]}>
                    {statusLabels[selectedEvent.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="flex justify-end gap-2">
                {selectedEvent.status === "en_attente" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      onClick={async () => {
                        if (!selectedEvent) return;
                        try {
                          const updated = await apiUpdateEvent(selectedEvent.id, { status: "confirme" });
                          setEvents((prev) => prev.map((ev) => (ev.id === selectedEvent.id ? (updated as unknown as EventItem) : ev)));
                          try {
                            const vs = await fetchVenues();
                            const vlist = (vs as Venue[]).map((v) => ({
                              id: String(v.id),
                              name: String(v.name),
                              area: v.area as VenueArea,
                              status: v.status,
                              capacity: Number(v.capacity) || 0,
                            }));
                            setVenues(vlist);
                          } catch (e) {
                            console.debug("Skip venues refresh after confirm", e);
                          }
                          setDetailsDialogOpen(false);
                        } catch (e) {
                          console.warn("Failed to update event status", e);
                        }
                      }}
                      aria-label="Confirmer l'événement"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-600 text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (!selectedEvent) return;
                        try {
                          const updated = await apiUpdateEvent(selectedEvent.id, { status: "annuler" });
                          setEvents((prev) => prev.map((ev) => (ev.id === selectedEvent.id ? (updated as unknown as EventItem) : ev)));
                          try {
                            const vs = await fetchVenues();
                            const vlist = (vs as Venue[]).map((v) => ({
                              id: String(v.id),
                              name: String(v.name),
                              area: v.area as VenueArea,
                              status: v.status,
                              capacity: Number(v.capacity) || 0,
                            }));
                            setVenues(vlist);
                          } catch (e) {
                            console.debug("Skip venues refresh after cancel", e);
                          }
                          setDetailsDialogOpen(false);
                        } catch (e) {
                          console.warn("Failed to update event status", e);
                        }
                      }}
                      aria-label="Rejeter l'événement"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {selectedEvent.status === "en_attente" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      if (!selectedEvent) return;
                      openEditDialog(selectedEvent);
                      setDetailsDialogOpen(false);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" /> 
                  </Button>
                )}
                <Button
                  type="button"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    if (!selectedEvent) return;
                    handleDelete(selectedEvent.id);
                    setDetailsDialogOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailsDialogOpen(false)}
                  aria-label="Fermer la fenêtre"
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Modifier l'événement" : "Nouvel événement"}
              </DialogTitle>
            </DialogHeader>

            {formError && (
              <div className="text-sm text-red-600" role="alert">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titre de l'événement</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Mariage de Paul & Sarah"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div>
              <label className="block text-sm font-medium mb-1">Type d'événement</label>
              <select
                aria-label="Sélectionner le type d'événement"
                className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                value={formEventType}
                onChange={(e) => setFormEventType(e.target.value as EventType)}
                required
              >
                  <option value="">Choisir...</option>
                  <option value="mariage">Mariage</option>
                  <option value="celebration_religieuse">Célébration religieuse</option>
                  <option value="cocktail">Cocktail</option>
                </select>
              </div>
              <div>
              <label className="block text-sm font-medium mb-1">Nombre de places</label>
              <Input
                type="number"
                min={1}
                max={selectedVenue?.capacity ?? undefined}
                value={formCapacity}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormCapacity(val);
                  const n = Number(val || 0);
                  if (selectedVenue && Number.isFinite(n) && n > (selectedVenue.capacity || 0)) {
                    setFormError(`La salle ne peut contenir que ${selectedVenue.capacity} places`);
                  } else if (n <= 0) {
                    setFormError("Le nombre de places doit être supérieur à 0");
                  } else {
                    setFormError("");
                  }
                }}
                placeholder="Ex: 150"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heure début</label>
              <Input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Heure fin</label>
              <Input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                required
              />
            </div>
              
              <div>
              <label className="block text-sm font-medium mb-1">Budget</label>
              <Input
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="Ex: 15 000FCFA"
                type="number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Lieu
              </label>
              <select
                aria-label="Sélectionner une salle"
                className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                value={formVenue}
                onChange={(e) => {
                  setFormVenue(e.target.value);
                  setFormAreaChoice("");
                  setFormMariageInterior("");
                  setFormMariageExterior("");
                }}
                required
              >
                <option value="">Choisir une salle...</option>
                {availableVenues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
              {formEventType && (formEventType === "mariage" || formEventType === "cocktail" || formEventType === "celebration_religieuse") && formVenue && (
                <div>
                  <label className="block text-sm font-medium mb-1">Zone</label>
                  <select
                    aria-label="Sélectionner la zone"
                    className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                    value={formAreaChoice}
                    onChange={(e) => setFormAreaChoice(e.target.value as VenueArea)}
                    required
                  >
                    <option value="">Choisir...</option>
                    {allowedAreas.map((a) => (
                      <option key={a} value={a}>
                        {a === "interieur" ? "Intérieur" : a === "exterieur" ? "Extérieur" : "Les deux"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {formEventType === "mariage" && formVenue && formAreaChoice && (
                <>
                  {(formAreaChoice === "interieur" || formAreaChoice === "les_deux") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Type de mariage (intérieur)</label>
                      <select
                        aria-label="Sélectionner le type de mariage intérieur"
                        className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                        value={formMariageInterior}
                        onChange={(e) => setFormMariageInterior(e.target.value as "civil" | "coutumier")}
                        required
                      >
                        <option value="">Choisir...</option>
                        <option value="civil">Mariage civil</option>
                        <option value="coutumier">Mariage coutumier</option>
                      </select>
                    </div>
                  )}
                  {(formAreaChoice === "exterieur" || formAreaChoice === "les_deux") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Type de mariage (extérieur)</label>
                      <select
                        aria-label="Sélectionner le type de mariage extérieur"
                        className="border border-border rounded-md px-2 py-2 text-sm bg-background w-full"
                        value={formMariageExterior}
                        onChange={(e) => setFormMariageExterior(e.target.value as "civil" | "coutumier")}
                        required
                      >
                        <option value="">Choisir...</option>
                        <option value="civil">Mariage civil</option>
                        <option value="coutumier">Mariage coutumier</option>
                      </select>
                    </div>
                  )}
                </>
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
                {editingEvent ? "Enregistrer les modifications" : "Créer l'événement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;
