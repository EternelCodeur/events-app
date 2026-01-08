/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { getXsrfTokenFromCookie } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

// Types simples pour les données de présence
interface AttendanceDay {
  date: string; // YYYY-MM-DD
  in?: string | null;
  out?: string | null;
  mins: number; // minutes travaillées ce jour
  arrivalSignatureUrl?: string | null;
  departureSignatureUrl?: string | null;
  eventTitle?: string | null; // concat des titres d'événements ce jour-là
}

interface AttendanceSummary {
  perDay: AttendanceDay[];
}

// Backend row type
interface BackendAttendanceRow {
  eventId: number;
  eventTitle: string;
  date: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  arrivedAt: string | null; // ISO
  departedAt: string | null; // ISO
  arrivalSignatureUrl?: string | null;
  departureSignatureUrl?: string | null;
}

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

// Petite fonction utilitaire pour formatter HH:mm
function formatHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Génère un tableau mock pour le mois sélectionné (tous les jours du mois)
function generateMockSummary(year: number, monthIndex: number): AttendanceSummary {
  const days: AttendanceDay[] = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const date = dateObj.toISOString().slice(0, 10);

    // Exemple simple : 09:00 → 17:00 (8h) pour tous les jours
    days.push({
      date,
      in: "09:00",
      out: "17:00",
      mins: 8 * 60,
    });
  }

  return { perDay: days };
}

const StaffAttendancePage: React.FC = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { name?: string; position?: string } };

  const empName = location.state?.name;
  const empPosition = location.state?.position;

  const [staffName, setStaffName] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);

  const now = new Date();
  const defaultPeriod = params.get("period") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(defaultPeriod);

  const [year, month] = period.split("-").map(Number);
  const monthIndex = (month || now.getMonth() + 1) - 1; // 0-11

  const [rows, setRows] = useState<BackendAttendanceRow[]>([]);
  const [signatureUrls, setSignatureUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const res = await fetchWithAuth(`${API_BASE_URL}/api/staff/${encodeURIComponent(String(id))}`);
        if (!res.ok) return;
        const data = await res.json();
        const name = String((data?.data?.name ?? data?.name ?? '') as string);
        const role = String((data?.data?.role ?? data?.role ?? '') as string);
        if (name) setStaffName(name);
        if (role) setStaffRole(role);
      } catch { /* noop */ }
    })();
  }, [id]);

  const loadRows = useCallback(async () => {
    if (!id) return;
    const url = `${API_BASE_URL}/api/utilisateur/staff/${encodeURIComponent(String(id))}/attendances?month=${encodeURIComponent(String(period))}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) { setRows([]); return; }
    const data = await res.json();
    const rows = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
    setRows(rows as BackendAttendanceRow[]);
  }, [id, period]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  useEffect(() => {
    const urls = new Set<string>();
    for (const r of rows) {
      if (r.arrivalSignatureUrl) urls.add(r.arrivalSignatureUrl);
      if (r.departureSignatureUrl) urls.add(r.departureSignatureUrl);
    }
    urls.forEach((u) => {
      if (signatureUrls[u]) return;
      void (async () => {
        try {
          const res = await fetchWithAuth(u);
          if (!res.ok) return;
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setSignatureUrls((prev) => ({ ...prev, [u]: objUrl }));
        } catch {
          /* noop */
        }
      })();
    });
  }, [rows, signatureUrls]);

  const summary = useMemo(() => {
    const daysInMonth = new Date(year || new Date().getFullYear(), monthIndex + 1, 0).getDate();
    const perDay: AttendanceDay[] = [];
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const timeFromIso = (iso: string | null) => {
      if (!iso) return null;
      // support formats "YYYY-MM-DDTHH:MM:SS" ou "YYYY-MM-DD HH:MM:SS"
      const parts = iso.split(/[T ]/);
      const t = parts[1] || "";
      return t.slice(0, 5) || null;
    };
    const effectiveDate = (r: BackendAttendanceRow) => (r.arrivedAt ? r.arrivedAt.slice(0, 10) : r.date);
    const minutesBetween = (dateStr: string, start?: string | null, end?: string | null) => {
      if (!start || !end) return 0;
      const [y, m, d] = dateStr.split("-").map(Number);
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const s = new Date(y, (m || 1) - 1, d || 1, sh || 0, sm || 0, 0, 0).getTime();
      let e = new Date(y, (m || 1) - 1, d || 1, eh || 0, em || 0, 0, 0).getTime();
      if (e < s) e += 24 * 60 * 60 * 1000; // cross-midnight
      return Math.max(0, Math.round((e - s) / 60000));
    };
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year || new Date().getFullYear()}-${pad2(monthIndex + 1)}-${pad2(d)}`;
      const dayRows = rows.filter(r => effectiveDate(r) === dateStr);
      if (dayRows.length === 0) {
        perDay.push({ date: dateStr, in: null, out: null, mins: 0 });
        continue;
      }
      // earliest arrival and latest departure among rows
      let inTime: string | null = null;
      let outTime: string | null = null;
      let arrSig: string | null = null;
      let depSig: string | null = null;
      const titles = new Set<string>();
      for (const r of dayRows) {
        if (r.arrivedAt) {
          const t = timeFromIso(r.arrivedAt);
          if (t && (!inTime || t < inTime)) { inTime = t; arrSig = r.arrivalSignatureUrl || arrSig; }
        }
        if (r.departedAt) {
          const t = timeFromIso(r.departedAt);
          if (t && (!outTime || t > outTime)) { outTime = t; depSig = r.departureSignatureUrl || depSig; }
        }
        if (r.eventTitle) {
          titles.add(r.eventTitle);
        }
      }
      const titleCombined = Array.from(titles).join(", ") || null;
      perDay.push({
        date: dateStr,
        in: inTime,
        out: outTime,
        mins: minutesBetween(dateStr, inTime, outTime),
        arrivalSignatureUrl: arrSig,
        departureSignatureUrl: depSig,
        eventTitle: titleCombined,
      });
    }
    return { perDay } as AttendanceSummary;
  }, [rows, year, monthIndex]);

  const totalMins = useMemo(() => summary.perDay.reduce((acc, d) => acc + d.mins, 0), [summary]);

  const handleChangePeriod = (value: string) => {
    setPeriod(value);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("period", value);
      return next;
    }, { replace: true });
  };

  const monthLabel = new Date(year || now.getFullYear(), monthIndex, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 print:space-y-3 print:p-2 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
      {/* Header écran uniquement */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Fiche de présence mensuelle</h1>
          <p className="text-muted-foreground text-sm">
            {(empName || staffName) ? (
              <>
                {empName || staffName}
                {(empPosition || staffRole) ? ` • ${empPosition || staffRole}` : ""} • {monthLabel}
              </>
            ) : (
              <>
                Employé #{id} • {monthLabel}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Retour
          </Button>
          <input
            type="month"
            className="w-[170px] h-10 px-3 py-2 border rounded-md bg-background"
            value={period}
            onChange={(e) => handleChangePeriod(e.target.value)}
            aria-label="Choisir le mois"
            title="Choisir le mois"
          />
          <Button variant="outline" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      </div>

      {/* Header impression uniquement */}
      <div className="hidden print:block mb-2 text-center">
        <div className="text-lg font-bold uppercase tracking-wide">Fiche de présence</div>
        <div className="text-sm mt-1">
          {(empName || staffName) ? (
            <>
              {empName || staffName}
              {(empPosition || staffRole) ? ` • ${empPosition || staffRole}` : ""} • {monthLabel}
            </>
          ) : (
            <>
              Employé #{id} • {monthLabel}
            </>
          )}
        </div>
      </div>

      <Card className="print:border print:border-gray-300 print:shadow-none">
        <CardContent className="mt-2 print:p-2">
          <div className="overflow-x-auto print:overflow-visible">
            <Table className="w-full print:text-[12px] print:leading-tight">
              <TableHeader>
                <TableRow className="bg-blue-50 print:bg-blue-100">
                  <TableHead className="text-center">Jour</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Événement(s)</TableHead>
                  <TableHead className="text-center">Heure d'arrivée</TableHead>
                  <TableHead className="text-center">Signature arrivée</TableHead>
                  <TableHead className="text-center">Heure de départ</TableHead>
                  <TableHead className="text-center">Signature départ</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.perDay.map((e) => {
                  const [yStr, mStr, dStr] = e.date.split("-");
                  const d = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
                  const jour = d.toLocaleDateString("fr-FR", { weekday: "long" });
                  const dateLabel = d.toLocaleDateString("fr-FR");
                  return (
                    <TableRow key={e.date} className="even:bg-muted/40 print:even:bg-gray-100">
                      <TableCell className="capitalize text-center">{jour}</TableCell>
                      <TableCell className="text-center">{dateLabel}</TableCell>
                      <TableCell className="text-center max-w-xs truncate" title={e.eventTitle || undefined}>
                        {e.eventTitle ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">{e.in ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        {e.arrivalSignatureUrl && signatureUrls[e.arrivalSignatureUrl] ? (
                          <img
                            src={signatureUrls[e.arrivalSignatureUrl]}
                            alt="Signature d'arrivée"
                            className="inline-block max-h-12 mx-auto object-contain border rounded"
                          />
                        ) : e.arrivalSignatureUrl ? "..." : "-"}
                      </TableCell>
                      <TableCell className="text-center">{e.out ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        {e.departureSignatureUrl && signatureUrls[e.departureSignatureUrl] ? (
                          <img
                            src={signatureUrls[e.departureSignatureUrl]}
                            alt="Signature de départ"
                            className="inline-block max-h-12 mx-auto object-contain border rounded"
                          />
                        ) : e.departureSignatureUrl ? "..." : "-"}
                      </TableCell>
                      <TableCell className="text-center font-medium">{formatHours(e.mins)}</TableCell>
                    </TableRow>
                  );
                })}
                {summary.perDay.length > 0 && (
                  <TableRow className="bg-red-100 print:bg-red-200">
                    <TableCell colSpan={4} className="text-right font-semibold">
                      Total mensuel
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {formatHours(totalMins)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffAttendancePage;
