/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Search, Check, Users, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getXsrfTokenFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

const GuestsAgent = () => {
  const [searchTerm, setSearchTerm] = useState(""); // terme appliqué à la recherche
  const [searchInput, setSearchInput] = useState(""); // contenu du champ texte
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const { toast } = useToast();

  type AgentEvent = { id: string; title: string; startTime?: string | null; endTime?: string | null; date: string; status: string };
  type AgentInvite = { id: number; nom: string; prenom: string; telephone?: string; personnes: number; table_name?: string; present?: boolean; heure_arrivee?: string | null; additionalGuests?: string[] };

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
    const method = String((init.method || 'GET')).toUpperCase();
    const xsrf = getXsrfTokenFromCookie();
    const headers: HeadersInit = { ...(init.headers || {}), ...(auth as HeadersInit) };
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && xsrf) {
      (headers as any)['X-XSRF-TOKEN'] = xsrf;
    }
    let res = await fetch(path, { credentials: "include", ...init, headers });
    if (res.status === 401) {
      try {
        const { refresh } = await import("@/lib/auth");
        const ok = await refresh();
        if (ok) {
          const retryAuth = await getAuthHeader();
          const retryHeaders: HeadersInit = { ...(init.headers || {}), ...(retryAuth as HeadersInit) };
          if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && xsrf) {
            (retryHeaders as any)['X-XSRF-TOKEN'] = xsrf;
          }
          res = await fetch(path, { credentials: "include", ...init, headers: retryHeaders });
        }
      } catch { /* noop */ }
    }
    return res;
  }

  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/agent/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : (payload.data ?? []);
        const mapped: AgentEvent[] = list.map((e: any) => ({
          id: String(e.id),
          title: String(e.title),
          startTime: e.startTime ?? null,
          endTime: e.endTime ?? null,
          date: String(e.date),
          status: String(e.status),
        }));
        setEvents(mapped);
        if (mapped.length > 0) setSelectedEventId(mapped[0].id);
      } catch (e: any) {
        toast({ title: "Erreur", description: e?.message || "Chargement des événements impossible", variant: "destructive" });
      }
    })();
  }, [toast]);

  useEffect(() => {
    (async () => {
      if (!selectedEventId) { setAllGuests([]); return; }
      try {
        setLoading(true);
        const res = await fetchWithAuth(`${API_BASE_URL}/api/agent/events/${encodeURIComponent(selectedEventId)}/invites`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : (payload.data ?? []);
        const mapped = list.map((i: AgentInvite) => ({
          id: Number((i as any).id),
          eventId: selectedEventId,
          nom: i.nom,
          prenom: i.prenom,
          personnes: Number(i.personnes || 0),
          table_name: (i as any).table_name,
          statut: (i as any).statut,
          telephone: i.telephone,
          present: !!(i as any).present,
          heureArrivee: (i as any).heure_arrivee ?? null,
          additionalGuests: Array.isArray((i as any).additionalGuests) ? (i as any).additionalGuests : [],
        }));
        setAllGuests(mapped);
      } catch (e: any) {
        toast({ title: "Erreur", description: e?.message || "Chargement des invités impossible", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedEventId, toast]);

  const guestsForEvent = useMemo(
    () => allGuests.filter((g) => String(g.eventId) === String(selectedEventId)),
    [allGuests, selectedEventId],
  );

  const filteredGuests = useMemo(() => {
    const strip = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\p{Diacritic}]+/gu, "")
        .toLowerCase();
    const q = strip(searchTerm.trim());
    if (!q) return [] as any[];
    return guestsForEvent.filter((guest) => {
      const fullName = `${guest.prenom} ${guest.nom}`;
      const haystacks = [
        guest.nom,
        guest.prenom,
        fullName,
        guest.telephone || "",
      ].map(strip);

      const coteLabel =
        guest.cote === "mariee"
          ? "mariee mariée cote mariee coté mariee mariee"
          : guest.cote === "marie"
          ? "marie marié cote marie coté marie marie"
          : "tous tous_les_cotes les deux tous les cotes";
      haystacks.push(strip(coteLabel));

      // Correspondance exacte après normalisation (pas de "Jean" qui matche "John")
      return haystacks.some((h) => h === q);
    });
  }, [guestsForEvent, searchTerm]);

  const applySearch = () => {
    const term = searchInput.trim();
    setSearchTerm(term);
    setSelectedGuest(null);
  };

  const formatDateTimeLocal = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const markAsArrived = async () => {
    if (!selectedGuest) return;
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/agent/invites/${encodeURIComponent(String(selectedGuest.id))}/checkin`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { response: { data: err }, message: `HTTP ${res.status}` };
      }
      const payload = await res.json();
      const d = (Array.isArray(payload) ? payload[0] : (payload?.data ?? payload)) as any;
      const updated = {
        id: Number(d?.id ?? selectedGuest.id),
        eventId: String(selectedEventId),
        nom: String(d?.nom ?? selectedGuest.nom),
        prenom: String(d?.prenom ?? selectedGuest.prenom),
        personnes: Number(d?.personnes ?? selectedGuest.personnes ?? 0),
        table_name: (d?.table_name ?? selectedGuest.table_name) as string | undefined,
        statut: (d?.statut ?? 'confirmed') as 'confirmed' | 'pending',
        telephone: String(d?.telephone ?? selectedGuest.telephone ?? ''),
        present: !!(d?.present ?? true),
        heureArrivee: (d?.heure_arrivee ?? selectedGuest.heureArrivee ?? null) as string | null,
        additionalGuests: Array.isArray(d?.additionalGuests) ? d.additionalGuests : (selectedGuest.additionalGuests ?? []),
      };
      setAllGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setSelectedGuest(updated);
      toast({ title: 'Invité marqué comme arrivé', description: `${updated.prenom} ${updated.nom} est présent.` });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Impossible de marquer comme arrivé';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const presentCount = guestsForEvent.reduce(
    (sum, g) => sum + (g.present ? Number(g.personnes || 0) : 0),
    0
  );
  const totalPersons = Math.max(
    1,
    guestsForEvent.reduce((sum, g) => sum + Number(g.personnes || 0), 0)
  );

  return (
    <div className="w-full h-full p-1 space-y-2">
      {/* Bandeau bleu en haut, même design que la barre admin, sticky */}
      <div className="-mx-12 -mt-14 mb-8 border-b border-border bg-gradient-to-r from-sky-500 via-blue-500 to-orange-400 px-6 py-2 h-16 lg:h-24 flex items-center justify-between sticky top-16 z-10">
        <div className="text-white font-semibold text-sm sm:text-base">
          Sélection de l'événement
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="Sélectionner un événement"
            className="border rounded-md bg-white/90 px-4 py-1.5 text-xs sm:text-sm text-foreground"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(String(e.target.value))}
          >
            {events.map((ev) => {
              const timeLabel = [ev.startTime, ev.endTime].filter(Boolean).join("-");
              const label = timeLabel ? `${ev.title} (${timeLabel})` : ev.title;
              return (
                <option key={ev.id} value={ev.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Suivi des Arrivées</h1>
        <p className="text-muted-foreground mt-2">
          Recherchez et validez l'arrivée de vos invités pour l'événement sélectionné
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invités présents
            </CardTitle>
            <Check className="h-8 w-8 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{presentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'arrivée</CardTitle>
            <Users className="h-8 w-8 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round((presentCount / totalPersons) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">des invités totaux</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            Recherche d'invité
          </CardTitle>
          <CardDescription>
            Tapez le nom ou prénom de l'invité pour le retrouver rapidement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-3 h-6 w-6 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Rechercher un invité..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                className="pl-10 text-lg h-12 border-2 border-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                    setSelectedGuest(null);
                  }}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="default"
              onClick={applySearch}
              className="h-12 px-4 flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Rechercher
            </Button>
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredGuests.length > 0
                ? `${filteredGuests.length} résultat${
                    filteredGuests.length > 1 ? "s" : ""
                  } trouvé${filteredGuests.length > 1 ? "s" : ""}`
                : "Aucun résultat"}
            </p>
          )}
        </CardContent>
      </Card>

      {(searchTerm.trim() || selectedGuest) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedGuest ? (
            <Card className="cursor-pointer transition-all hover:shadow-lg ring-2 ring-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {selectedGuest.prenom} {selectedGuest.nom}
                      </CardTitle>
                      <Badge
                        className={
                          selectedGuest.present
                            ? "bg-success text-white"
                            : "bg-yellow-500 text-white"
                        }
                      >
                        {selectedGuest.present ? "Présent" : "En attente"}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {selectedGuest.table_name ||
                          selectedGuest.table ||
                          "Non assignée"}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        {selectedGuest.personnes} personne
                        {selectedGuest.personnes > 1 ? "s" : ""}
                      </div>
                      {selectedGuest.additionalGuests && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-2" />
                          Invités supplémentaires :
                          {" "}
                          {selectedGuest.additionalGuests.join(", ")}
                        </div>
                      )}
                      {selectedGuest.telephone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 mr-2" />
                          {selectedGuest.telephone}
                        </div>
                      )}
                      <div className="text-center mt-6">
                        {!selectedGuest.present ? (
                          <Button
                            variant="default"
                            size="lg"
                            className="w-full text-sm lg:text-lg h-10 lg:h-14"
                            onClick={markAsArrived}
                            disabled={loading}
                          >
                            <Check className="h-6 w-6" />
                            Marquer comme arrivé
                          </Button>
                        ) : (
                          <div className="text-center p-6 bg-success/10 rounded-lg">
                            <Check className="h-12 w-12 text-success mx-auto mb-2" />
                            <div className="text-lg font-semibold text-success">
                              L'invité est arrivé à
                              {" "}
                              {formatDateTimeLocal(selectedGuest.heureArrivee)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : filteredGuests.length > 0 ? (
            filteredGuests.map((g) => (
              <Card
                key={g.id}
                className="cursor-pointer hover:shadow"
                onClick={() => setSelectedGuest(g)}
              >
                <CardHeader className="pb-2 mb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {g.prenom} {g.nom}
                    </CardTitle>
                    <Badge
                      className={
                        g.present
                          ? "bg-success text-white"
                          : "bg-yellow-500 text-white"
                      }
                    >
                      {g.present ? "Présent" : "En attente"}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {g.table_name || "Non assignée"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {g.personnes} pers.
                    </span>
                    <span className="flex items-center gap-2">
                      {g.cote === "mariee"
                        ? "Côté mariée"
                        : g.cote === "marie"
                        ? "Côté marié"
                        : "Tous les côtés"}
                    </span>
                    {g.telephone && (
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {g.telephone}
                      </span>
                    )}
                    {Array.isArray(g.additionalGuests) &&
                      g.additionalGuests.length > 0 && (
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          +{g.additionalGuests.length} invité(s) supp.
                        </span>
                      )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-2 border-muted/50">
              <CardContent className="text-center p-12">
                <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-muted/20 mb-6">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Aucun invité trouvé
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Aucun invité ne correspond à
                  {" "}
                  <span className="font-medium text-foreground">
                    "{searchTerm}"
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Essayez avec un nom différent ou vérifiez l'orthographe.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GuestsAgent;
