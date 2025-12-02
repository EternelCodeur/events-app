import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Trash2, Pencil, Eye, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCompanies, type Company } from "@/lib/api";
import { getEventsByEntreprise, type EventItem, type EventStatus } from "@/lib/events";
import { ImagePickerDialog } from "@/components/media/ImagePickerDialog";
import { ImageGalleryDialog } from "@/components/media/ImageGalleryDialog";
import { getEventImages, getImageBlobUrl, uploadEventImages } from "@/lib/eventImages";

// using EventStatus & EventItem from lib/events

const statusColors: Record<EventStatus, string> = {
  en_attente: "bg-accent hover:bg-accent/90",
  confirme: "bg-success hover:bg-success/90",
  en_cours: "bg-primary hover:bg-primary/90",
  termine: "bg-orange-500 hover:bg-orange-600",
  annuler: "bg-destructive hover:bg-destructive/90",
  echoue: "bg-red-500 hover:bg-red-600",
};

const statusLabels: Record<EventStatus, string> = {
  en_attente: "En attente",
  confirme: "Confirmé",
  en_cours: "En cours",
  termine: "Terminé",
  annuler: "Annulé",
  echoue: "Échoué",
};

const CompanyEvents = () => {
  const params = useParams();
  const companyId = params.id as string;
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formStatus, setFormStatus] = useState<EventStatus>("en_attente");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getCompanies();
        const found = list.find((c) => c.id === companyId) || null;
        if (mounted) setCompany(found);
      } catch (_) {
        return;
      }
    })();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const evs = await getEventsByEntreprise(companyId);
        if (mounted) setEvents(Array.isArray(evs) ? evs : []);
      } catch (_) {
        if (mounted) setEvents([]);
      }
    })();
    return () => { mounted = false; };
  }, [companyId]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormStatus("en_attente");
    setDialogOpen(true);
  };

  const openEdit = (ev: EventItem) => {
    setEditing(ev);
    setFormTitle(ev.title);
    setFormDate(ev.date);
    setFormStartTime(ev.startTime || "");
    setFormEndTime(ev.endTime || "");
    setFormStatus(ev.status);
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) { setDialogOpen(false); return; }
    if (!formTitle.trim() || !formDate) return;
    const payload: EventItem = {
      ...editing,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      status: formStatus,
    } as EventItem;
    setEvents((prev) => prev.map((it) => (it.id === editing.id ? payload : it)));
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    if (!window.confirm("Supprimer définitivement cet événement ?")) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const openAddPhotos = (id: string) => {
    setSelectedEventId(id);
    setPickerOpen(true);
  };
  const openViewPhotos = async (id: string) => {
    setSelectedEventId(id);
    setGalleryImages([]);
    setGalleryOpen(true);
    try {
      const items = await getEventImages(id);
      const urls = await Promise.all(items.map((it) => getImageBlobUrl(it.id)));
      setGalleryImages(urls);
    } catch (_) {
      setGalleryImages([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Événements</h1>
          <p className="text-muted-foreground text-sm">Entreprise: {company?.name || companyId}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => (
          <Card key={ev.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">{ev.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ev.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-sm text-muted-foreground">{ev.startTime} - {ev.endTime}</p>
                </div>
                <Badge className={statusColors[ev.status]}>{statusLabels[ev.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(ev.status === "en_attente" || ev.status === "en_cours" || ev.status === "confirme" || ev.status === "termine") && (
                  <Button type="button" size="sm" className="flex-1 bg-primary hover:bg-primary-hover text-white" onClick={() => openAddPhotos(ev.id)}>
                    <ImagePlus className="w-4 h-4 mr-1" />
                    Ajouter photos
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openViewPhotos(ev.id)}>
                  <Eye className="w-4 h-4 mr-1" />
                  Voir photos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucun événement pour cette entreprise.</div>
        )}
      </div>

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Ajouter des photos à l'événement"
        onConfirm={() => { /* handled by onConfirmWithFiles for backend upload */ }}
        onConfirmWithFiles={async (files) => {
          if (!selectedEventId) return;
          setUploadError("");
          setUploadProgress(0);
          setUploadOpen(true);
          try {
            await uploadEventImages(selectedEventId, files, (p) => setUploadProgress(p));
            await openViewPhotos(selectedEventId);
          } catch (e) {
            const msg = (e as { message?: string })?.message || "Échec du téléversement";
            setUploadError(msg);
          } finally {
            // Laisse la modale visible un court instant si 100%
            setTimeout(() => setUploadOpen(false), 400);
          }
        }}
      />
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Téléversement des images</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm">Progression: {uploadProgress}%</div>
            {uploadError && <div className="text-destructive text-sm">{uploadError}</div>}
          </div>
        </DialogContent>
      </Dialog>
      <ImageGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        title="Photos de l'événement"
        images={galleryImages}
      />
    </div>
  );
};

export default CompanyEvents;
