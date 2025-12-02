import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { getEvents, type EventItem } from "@/lib/events";
import { getVenues, type Venue } from "@/lib/venues";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmtDate = (d?: string) => {
  try {
    return d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
  } catch {
    return d || "—";
  }
};

const statusColors = {
  confirme: "bg-success hover:bg-success/90",
  en_attente: "bg-accent hover:bg-accent/90",
  en_cours: "bg-primary hover:bg-primary/90",
  termine: "bg-orange-500 hover:bg-orange-600",
};

const statusLabels = {
  confirme: "Confirmé",
  en_attente: "En attente",
  en_cours: "En cours",
  termine: "Terminé",
};

export const UpcomingEvents = () => {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [venuesMap, setVenuesMap] = useState<Record<string, string>>({});
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [range, setRange] = useState<"today" | "month">("month");

  const filterEvents = (all: EventItem[], rangeMode: "today" | "month"): EventItem[] => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEnd = `${endOfMonthDate.getFullYear()}-${pad(endOfMonthDate.getMonth() + 1)}-${pad(endOfMonthDate.getDate())}`;
    return all
      .filter(e => (e.status === "en_attente" || e.status === "confirme"))
      .filter(e => {
        const d = String(e.date || "");
        if (!d) return false;
        if (rangeMode === "month") {
          if (d < today) return false;
          if (d > monthEnd) return false;
          if (d === today) {
            const st = String(e.startTime || "");
            if (!st) return true;
            return st >= nowHM;
          }
          return true;
        } else { // today
          if (d !== today) return false;
          const st = String(e.startTime || "");
          if (!st) return true;
          return st >= nowHM;
        }
      })
      .sort((a, b) => {
        const da = String(a.date).localeCompare(String(b.date));
        if (da !== 0) return da;
        const sa = String(a.startTime || "99:99");
        const sb = String(b.startTime || "99:99");
        return sa.localeCompare(sb);
      });
  };

  useEffect(() => {
    (async () => {
      try {
        const [all, vns] = await Promise.all([
          getEvents(),
          getVenues().catch(() => [] as Venue[]),
        ]);
        setAllEvents(all);
        const map: Record<string, string> = {};
        (vns as Venue[]).forEach(v => { map[String(v.id)] = String(v.name); });
        setVenuesMap(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setItems(filterEvents(allEvents, range));
  }, [range, allEvents]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Événements à venir
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as "today" | "month")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/events">Voir tout</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun événement en attente ou confirmé</div>
          )}
          {!loading && items.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow h-full flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{event.title}</h4>
                  <p className="text-sm text-muted-foreground">{fmtDate(event.date)}</p>
                </div>
                <Badge className={statusColors[event.status as keyof typeof statusColors]}>
                  {statusLabels[event.status as keyof typeof statusLabels] ?? event.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {(event.startTime || "—")} - {(event.endTime || "—")}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{venuesMap[String(event.venue)] || event.venue || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{Number(event.guests || 0)} invités</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
