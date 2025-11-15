import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// Types simples pour les données de présence
interface AttendanceDay {
  date: string; // YYYY-MM-DD
  in?: string | null;
  out?: string | null;
  mins: number; // minutes travaillées ce jour
}

interface AttendanceSummary {
  perDay: AttendanceDay[];
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

  const now = new Date();
  const defaultPeriod = params.get("period") ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [period, setPeriod] = useState(defaultPeriod);

  const [year, month] = period.split("-").map(Number);
  const monthIndex = (month || now.getMonth() + 1) - 1; // 0-11

  const summary = useMemo(
    () => generateMockSummary(year || new Date().getFullYear(), monthIndex),
    [year, monthIndex],
  );

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
            {empName ? (
              <>
                {empName}
                {empPosition ? ` • ${empPosition}` : ""} • {monthLabel}
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
          {empName ? (
            <>
              {empName}
              {empPosition ? ` • ${empPosition}` : ""} • {monthLabel}
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
                  <TableHead className="text-center">Heure d'arrivée</TableHead>
                  <TableHead className="text-center">Heure de départ</TableHead>
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
                      <TableCell className="text-center">{e.in ?? "-"}</TableCell>
                      <TableCell className="text-center">{e.out ?? "-"}</TableCell>
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
