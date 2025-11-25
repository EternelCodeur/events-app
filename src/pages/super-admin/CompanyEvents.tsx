import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCompanies, type Company } from "@/lib/api";

type EventStatus = "confirme" | "en_attente" | "termine" | "annule";

type EventItem = {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: EventStatus;
};

const statusColors: Record<EventStatus, string> = {
  confirme: "bg-success hover:bg-success/90",
  en_attente: "bg-accent hover:bg-accent/90",
  termine: "bg-muted hover:bg-muted/90",
  annule: "bg-destructive hover:bg-destructive/90",
};

const statusLabels: Record<EventStatus, string> = {
  confirme: "Confirmé",
  en_attente: "En attente",
  termine: "Terminé",
  annule: "Annulé",
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

  const storageKey = useMemo(() => `company_events_${companyId}`, [companyId]);

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
    try {
      const raw = localStorage.getItem(storageKey);
      setEvents(raw ? (JSON.parse(raw) as EventItem[]) : []);
    } catch (_) {
      setEvents([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(events));
    } catch (_) {
      return;
    }
  }, [events, storageKey]);

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
    if (!formTitle.trim() || !formDate) return;
    const payload: EventItem = {
      id: editing ? editing.id : Date.now().toString(),
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      status: formStatus,
    };
    setEvents((prev) => (editing ? prev.map((it) => (it.id === editing.id ? payload : it)) : [payload, ...prev]));
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    if (!window.confirm("Supprimer définitivement cet événement ?")) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(ev)}>
                  <Pencil className="w-4 h-4 mr-1" />
                </Button>
                <Button type="button" size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => remove(ev.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucun événement pour cette entreprise.</div>
        )}
      </div>
    </div>
  );
};

export default CompanyEvents;
