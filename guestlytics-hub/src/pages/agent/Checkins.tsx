/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type AgentEvent = { id: string; title: string; date?: string | null };
type AgentInvite = {
  id: number;
  nom: string;
  prenom: string;
  present?: boolean;
  statut?: "confirmed" | "pending";
  heure_arrivee?: string | null;
};

async function getAuthHeader(): Promise<HeadersInit> {
  try {
    const { getToken } = await import("@/lib/auth");
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const auth = await getAuthHeader();
  let res = await fetch(path, { credentials: "include", ...init, headers: { ...(init.headers || {}), ...(auth as HeadersInit) } });
  if (res.status === 401) {
    try {
      const { refresh } = await import("@/lib/auth");
      const ok = await refresh();
      if (ok) {
        const retryAuth = await getAuthHeader();
        res = await fetch(path, { credentials: "include", ...init, headers: { ...(init.headers || {}), ...(retryAuth as HeadersInit) } });
      }
    } catch { /* noop */ }
  }
  return res;
}

const Checkins = () => {
  const { toast } = useToast();

  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [invites, setInvites] = useState<AgentInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/agent/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: unknown = await res.json();
        const list = Array.isArray((payload as any)) ? (payload as any) : (((payload as any)?.data ?? []) as unknown[]);
        const mapped: AgentEvent[] = list.map((raw: unknown) => {
          const e = raw as { id?: string | number; title?: string; name?: string; date?: string | null };
          return { id: String(e?.id ?? ""), title: String(e?.title ?? e?.name ?? "Événement"), date: (e?.date ?? null) };
        });
        setEvents(mapped);
        if (mapped.length > 0) setSelectedEventId(mapped[0].id);
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message || "Chargement des événements impossible";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      }
    })();
  }, [toast]);

  useEffect(() => {
    (async () => {
      if (!selectedEventId) { setInvites([]); return; }
      try {
        setLoading(true);
        const res = await fetchWithAuth(`/api/agent/events/${encodeURIComponent(selectedEventId)}/invites`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: unknown = await res.json();
        const list = Array.isArray((payload as any)) ? (payload as any) : (((payload as any)?.data ?? []) as unknown[]);
        const mapped: AgentInvite[] = list.map((raw: unknown) => {
          const i = raw as { id?: number | string; nom?: string; prenom?: string; present?: boolean; statut?: "confirmed" | "pending"; heure_arrivee?: string | null };
          return {
            id: Number(i?.id ?? 0),
            nom: String(i?.nom ?? ""),
            prenom: String(i?.prenom ?? ""),
            present: !!i?.present,
            statut: (i?.statut ?? (i?.present ? "confirmed" : "pending")) as "confirmed" | "pending",
            heure_arrivee: i?.heure_arrivee ?? null,
          };
        });
        setInvites(mapped);
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message || "Chargement des invités impossible";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedEventId, toast]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const markPresent = async (inviteId: number) => {
    try {
      setCheckingIds((m) => ({ ...m, [inviteId]: true }));
      const res = await fetchWithAuth(`/api/agent/invites/${inviteId}/checkin`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `HTTP ${res.status}`);
      }
      const json: unknown = await res.json();
      const raw = ((json as any)?.data ?? json) as unknown;
      const updated = raw as { id?: number | string; nom?: string; prenom?: string; present?: boolean; statut?: "confirmed" | "pending"; heure_arrivee?: string | null };
      setInvites((prev) => prev.map((g) => g.id === inviteId ? {
        id: Number(updated?.id ?? inviteId),
        nom: String(updated?.nom ?? g.nom),
        prenom: String(updated?.prenom ?? g.prenom),
        present: !!updated?.present,
        statut: (updated?.statut ?? (updated?.present ? "confirmed" : "pending")) as "confirmed" | "pending",
        heure_arrivee: updated?.heure_arrivee ?? null,
      } : g));
      toast({ title: "Invité marqué présent", description: "Statut mis à confirmé." });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Impossible de marquer présent";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setCheckingIds((m) => ({ ...m, [inviteId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Pointages</h1>
        <p className="text-muted-foreground">Gérez les arrivées et présences des invités</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedEvent ? `Événement: ${selectedEvent.title}` : loading ? "Chargement..." : "Aucun événement disponible"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invites.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-foreground">
                  {item.prenom} {item.nom}
                </h3>
                <Badge
                  className={
                    item.present
                      ? "bg-success hover:bg-success/90"
                      : "bg-accent hover:bg-accent/90"
                  }
                >
                  {item.present ? "Présent" : "En attente"}
                </Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                  disabled={!!item.present || !!checkingIds[item.id]}
                  onClick={() => markPresent(item.id)}
                >
                  {checkingIds[item.id] ? "Traitement..." : (item.present ? "Déjà présent" : "Marquer présent")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Checkins;
