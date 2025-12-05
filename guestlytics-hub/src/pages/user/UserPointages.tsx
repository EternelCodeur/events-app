/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, LogOut, Clock, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignatureCanvas } from "@/components/ui/signature-canvas";
import { useToast } from "@/hooks/use-toast";
import { getXsrfTokenFromCookie } from "@/lib/auth";

type StaffItem = { id: number; name: string; role: string; phone?: string; status?: string };
type EventItem = { id: string; title: string; date: string; startTime?: string | null; endTime?: string | null; status: string };
type AttendanceState = Record<number, { arrivedAt?: string | null; departedAt?: string | null }>;

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

// Staff list fetched from backend (same entreprise as logged-in user)
// GET /api/utilisateur/staff (scoped by backend to entreprise)
const mapStaff = (raw: any): StaffItem => ({
  id: Number(raw?.id ?? 0),
  name: String(raw?.name ?? ""),
  role: String(raw?.role ?? ""),
  phone: raw?.phone ?? "",
  status: raw?.status ?? "",
});

// Pour la démo, on met des dates fixes; en réel, ça viendra du backend
const mockEvents = [
  {
    id: 1,
    name: "Mariage Dupont (21h-02h)",
    date: "2024-06-01", // AAAA-MM-JJ
    startTime: "21:00", // 21h
    endTime: "02:00", // 2h du matin (traverse minuit)
  },
  {
    id: 2,
    name: "Conférence Matinale (08h-12h)",
    date: "2024-06-02",
    startTime: "08:00",
    endTime: "12:00",
  },
];

type Mode = "arrival" | "departure";

const UserPointages = () => {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("arrival");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendances, setAttendances] = useState<Record<string, AttendanceState>>({});
  const [lockedEventId, setLockedEventId] = useState<string | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));

  const parseTimeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const isNowWithinWindow = () => {
    if (!selectedEvent) return false;
    const now = new Date();
    const [y, m, d] = (selectedEvent.date || "").split("-").map(Number);
    const [sh, sm] = (selectedEvent.startTime || "00:00").split(":").map((n) => Number(n) || 0);
    const [eh, em] = (selectedEvent.endTime || "23:59").split(":").map((n) => Number(n) || 0);

    // Gestion de la date de l'événement
    const startAt = new Date(y || now.getFullYear(), (m || 1) - 1, d || 1, sh, sm, 0, 0);
    const endAt = new Date(y || now.getFullYear(), (m || 1) - 1, d || 1, eh, em, 0, 0);
    // Événement qui traverse minuit (ex: 21:00 -> 02:00)
    if (endAt <= startAt) {
      endAt.setDate(endAt.getDate() + 1);
    }

    // Ouvrir 2h avant le début, fermer 2h après la fin (gère le dépassement de jour)
    const openStart = new Date(startAt.getTime() - 2 * 60 * 60 * 1000);
    const openEnd = new Date(endAt.getTime() + 2 * 60 * 60 * 1000);

    return now >= openStart && now <= openEnd;
  };

  const pointageOuvert = isNowWithinWindow();
  
  // Locking: load persisted lock once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pointage-locked-event');
      if (raw) {
        const obj = JSON.parse(raw) as { eventId: string; until: number };
        if (obj && obj.eventId && typeof obj.until === 'number') {
          if (Date.now() < obj.until) {
            setLockedEventId(String(obj.eventId));
            setLockUntil(Number(obj.until));
            setSelectedEventId(String(obj.eventId));
          } else {
            localStorage.removeItem('pointage-locked-event');
          }
        }
      }
    } catch { /* noop */ }
  }, []);

  // Auto-unlock when expiration passes
  useEffect(() => {
    if (!lockUntil) return;
    const t = setInterval(() => {
      if (lockUntil && Date.now() >= lockUntil) {
        setLockedEventId(null);
        setLockUntil(null);
        try { localStorage.removeItem('pointage-locked-event'); } catch { /* noop */ }
      }
    }, 30000);
    return () => clearInterval(t);
  }, [lockUntil]);

  // Enforce selection while locked
  useEffect(() => {
    if (!lockedEventId) return;
    if (Date.now() >= (lockUntil || 0)) return;
    if (String(selectedEventId) !== String(lockedEventId)) {
      setSelectedEventId(String(lockedEventId));
    }
  }, [lockedEventId, lockUntil, selectedEventId]);

  const eventSelectionLocked = !!lockedEventId && !!lockUntil && Date.now() < lockUntil;

  const handleLockEvent = () => {
    if (!selectedEvent) return;
    const now = new Date();
    const [y, m, d] = (selectedEvent.date || '').split('-').map(Number);
    const [sh, sm] = (selectedEvent.startTime || '00:00').split(':').map((n) => Number(n) || 0);
    const [eh, em] = (selectedEvent.endTime || '23:59').split(':').map((n) => Number(n) || 0);
    const startAt = new Date(y || now.getFullYear(), (m || 1) - 1, d || 1, sh, sm, 0, 0);
    const endAt = new Date(y || now.getFullYear(), (m || 1) - 1, d || 1, eh, em, 0, 0);
    if (endAt <= startAt) endAt.setDate(endAt.getDate() + 1);
    const unlockAt = new Date(endAt.getTime() + 2 * 60 * 60 * 1000).getTime();
    setLockedEventId(String(selectedEvent.id));
    setLockUntil(unlockAt);
    try {
      localStorage.setItem('pointage-locked-event', JSON.stringify({ eventId: String(selectedEvent.id), until: unlockAt }));
    } catch { /* noop */ }
  };
  
  // Charger les événements de l'utilisateur (en_attente, confirme, en_cours, termine)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth(`/api/utilisateur/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: unknown = await res.json();
        const list = Array.isArray((payload as any)) ? (payload as any) : (((payload as any)?.data ?? []) as unknown[]);
        const mapped: EventItem[] = list.map((raw: any) => ({
          id: String(raw?.id ?? ""),
          title: String(raw?.title ?? raw?.name ?? "Événement"),
          date: String(raw?.date ?? ""),
          startTime: raw?.startTime ?? null,
          endTime: raw?.endTime ?? null,
          status: String(raw?.status ?? ""),
        }));
        setEvents(mapped);
        if (mapped.length > 0) setSelectedEventId(mapped[0].id);
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message || "Chargement des événements impossible";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);
  
  useEffect(() => {
    (async () => {
      if (!selectedEventId) { setStaff([]); return; }
      try {
        setLoading(true);
        const res = await fetchWithAuth(`/api/utilisateur/events/${encodeURIComponent(String(selectedEventId))}/assignments`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: unknown = await res.json();
        const list = Array.isArray((payload as any)) ? (payload as any) : (((payload as any)?.data ?? []) as unknown[]);
        setStaff(list.map((x) => mapStaff(x)));
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message || "Chargement des employés impossible";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedEventId, toast]);

  const refreshAttendances = useCallback(async () => {
    if (!selectedEventId) return;
    const res = await fetchWithAuth(`/api/utilisateur/events/${encodeURIComponent(String(selectedEventId))}/attendances`);
    if (!res.ok) return;
    const rows: Array<{ staffId: number; arrivedAt?: string | null; departedAt?: string | null }> = await res.json();
    const map: AttendanceState = {};
    for (const r of rows) {
      map[Number(r.staffId)] = { arrivedAt: r.arrivedAt ?? null, departedAt: r.departedAt ?? null };
    }
    setAttendances((prev) => ({ ...prev, [String(selectedEventId)]: map }));
  }, [selectedEventId]);

  useEffect(() => { void refreshAttendances(); }, [refreshAttendances]);

  const filteredUsers = staff.filter((u) => {
    const ev = attendances[String(selectedEventId)] || {};
    const rec = ev[Number(u.id)] || {};
    const hasArrived = !!rec.arrivedAt;
    const hasDeparted = !!rec.departedAt;
    if (mode === 'arrival') return !hasArrived;
    return hasArrived && !hasDeparted;
  });

  const handleOpenSignature = (user: any) => {
    setSelectedUser(user);
  };

  const handleCloseSignature = () => {
    setSelectedUser(null);
  };

  const saveSignature = async (dataUrl: string) => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const staffId = Number(selectedUser.id);
      const res = await fetchWithAuth(`/api/utilisateur/staff/${encodeURIComponent(String(selectedUser.id))}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode === 'arrival' ? 'arrival' : 'departure',
          image: dataUrl,
          eventId: selectedEventId ? Number(selectedEventId) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err?.message as string | undefined) || `HTTP ${res.status}`);
      }
      toast({ title: 'Signature enregistrée', description: `Signature ${mode === 'arrival' ? "d'arrivée" : 'de départ'} sauvegardée.` });
      await refreshAttendances();
      handleCloseSignature();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Impossible d'enregistrer la signature";
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre d'onglets en haut, même style que la navigation admin, collée aux bords et sticky */}
      <div className="-mx-6 -my-7 mb-4 border-b border-border bg-gradient-to-r from-sky-500 via-blue-500 to-orange-400 px-6 py-2 h-16 lg:h-24 sticky top-16 z-10">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as Mode)}
        >
          <TabsList className="w-full justify-center bg-transparent p-1 flex flex-wrap gap-2 text-white">
            <TabsTrigger
              value="arrival"
              disabled={!pointageOuvert}
              className="rounded-xl px-1.5 lg:mt-1 py-1.5 min-w-[32px] h-[40px] md:min-w-[140px] md:h-[60px] text-[14px] font-semibold text-black bg-gradient-to-br from-white via-gray-300 to-white data-[state=active]:from-black data-[state=active]:via-black data-[state=active]:to-black data-[state=active]:text-white shadow-sm flex flex-col items-center justify-center gap-1 text-center whitespace-normal break-words"
            >
              <LogIn className="h-4 w-4 lg:h-6 lg:w-6" />
              <span className="hidden md:inline leading-tight">Fiche d'arrivée</span>
            </TabsTrigger>
            <TabsTrigger
              value="departure"
              disabled={!pointageOuvert}
              className="rounded-xl px-1.5 py-1.5 min-w-[32px] h-[40px] md:min-w-[140px] md:h-[60px] text-[14px] font-semibold text-black bg-gradient-to-br from-white via-gray-300 to-white data-[state=active]:from-black data-[state=active]:via-black data-[state=active]:to-black data-[state=active]:text-white shadow-sm flex flex-col items-center justify-center gap-1 text-center whitespace-normal break-words"
            >
              <LogOut className="h-4 w-4 lg:h-6 lg:w-6" />
              <span className="hidden md:inline leading-tight">Fiche de départ</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Signature des pointages</h1>
            <p className="text-muted-foreground text-sm">
              Choisissez l'événement puis la fiche d'arrivée ou de départ.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <select
              aria-label="Sélectionner un événement"
              className="border rounded-md bg-blue-100 px-6 py-2 text-sm bg-background"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(String(e.target.value))}
              disabled={eventSelectionLocked}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleLockEvent} disabled={!selectedEventId || eventSelectionLocked}>
                Enregistrer
              </Button>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {selectedEvent?.startTime ?? "--:--"} - {selectedEvent?.endTime ?? "--:--"}
              </Badge>
              <Badge variant={pointageOuvert ? "default" : "destructive"}>
                {pointageOuvert ? "Pointage ouvert" : "Pointage fermé"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {!pointageOuvert && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Le pointage pour cet événement est fermé. Veuillez revenir pendant la fenêtre
          {" "}
          <span className="font-semibold">
            {selectedEvent?.startTime ?? "--:--"} - {selectedEvent?.endTime ?? "--:--"}
          </span>
          .
        </p>
      )}

      {pointageOuvert && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                {mode === "arrival" ? "Fiche de présence (arrivée)" : "Fiche de présence (départ)"}
              </CardTitle>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-white/90">
              Cliquez sur votre nom pour pointer votre
              {" "}
              {mode === "arrival" ? "arrivée" : "départ"} pour cet événement
              {" "}
              <span className="font-semibold">
                ({selectedEvent?.startTime ?? "--:--"} - {selectedEvent?.endTime ?? "--:--"})
              </span>
              .
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:bg-accent border-border"
                  onClick={() => handleOpenSignature(user)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{user.name}</h3>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mode === "arrival" ? "Arrivée à signer" : "Départ à signer"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  Aucun utilisateur à afficher pour cette fiche.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && handleCloseSignature()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Signature {mode === "arrival" ? "d'arrivée" : "de départ"}
            </DialogTitle>
            <DialogDescription>
              Utilisateur&nbsp;: <span className="font-semibold">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Signez ci-dessous pour confirmer le pointage.
            </p>
            <SignatureCanvas
              onSignatureComplete={(dataUrl) => { void saveSignature(dataUrl); }}
              width={500}
              height={250}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPointages;
