import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { getEvent as apiGetEvent, type EventItem } from "@/lib/events";
import { getProvidersPage, createProvider, updateProvider, deleteProvider, type ProviderItem } from "@/lib/providers";
import { getTasks, createTask, type EventTask } from "@/lib/tasks";
import { getVenues as fetchVenues, type Venue } from "@/lib/venues";

type VenueArea = "interieur" | "exterieur" | "les_deux";

const EventManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<"avant" | "apres">("avant");
  const [eventData, setEventData] = useState<EventItem | null>(null);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const hasEvent = Boolean(id);
  const canShowRoomCleaning = eventData?.areaChoice === "interieur" || eventData?.areaChoice === "les_deux";
  const isAssignForbidden = useMemo(() => {
    const s = eventData?.status;
    return s === "termine" || s === "annuler" || s === "echoue";
  }, [eventData?.status]);

  useEffect(() => {
    if (isAssignForbidden) setActivePhase("apres");
  }, [isAssignForbidden]);

  const isCancelledOrFailed = useMemo(() => {
    const s = eventData?.status;
    return s === "annuler" || s === "echoue";
  }, [eventData?.status]);

  const isFinished = useMemo(() => eventData?.status === "termine", [eventData?.status]);

  const eventPassed = useMemo(() => {
    if (!eventData?.date) return false;
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const d = String(eventData.date);
    if (d < today) return true;
    if (d > today) return false;
    const end = eventData.endTime ? String(eventData.endTime) : "";
    const start = eventData.startTime ? String(eventData.startTime) : "";
    if (end) return nowHM >= end;
    if (start) return nowHM >= start;
    return false;
  }, [eventData?.date, eventData?.startTime, eventData?.endTime]);

  const forcedPhase: "avant" | "apres" | null = useMemo(() => {
    if (isCancelledOrFailed) return null; // hide operational entirely
    if (isFinished) return "apres";
    const s = eventData?.status;
    if (s === "en_attente" || s === "confirme") {
      return eventPassed ? "apres" : "avant";
    }
    return "avant";
  }, [isCancelledOrFailed, isFinished, eventData?.status, eventPassed]);

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [providersPage, setProvidersPage] = useState(1);
  const [providersPerPage] = useState(7);
  const [providersLastPage, setProvidersLastPage] = useState(1);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [providersTotals, setProvidersTotals] = useState({ amountCfa: 0, advanceCfa: 0, restCfa: 0 });
  const providersSectionRef = useRef<HTMLDivElement | null>(null);
  const [provDialogOpen, setProvDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const [provType, setProvType] = useState("");
  const [provDesignation, setProvDesignation] = useState("");
  const [provAmount, setProvAmount] = useState("");
  const [provAdvance, setProvAdvance] = useState("");
  const [provComments, setProvComments] = useState("");
  const [provContact, setProvContact] = useState("");
  const [provError, setProvError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // Tasks (Réaménagement)
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskError, setTaskError] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      setLoadError("");
      try {
        const [ev, vs, ts] = await Promise.all([
          apiGetEvent(id),
          fetchVenues(),
          getTasks(id),
        ]);
        setEventData(ev as unknown as EventItem);
        const venueList = (vs as Venue[]).map((v) => ({ id: String(v.id), name: String(v.name) }));
        setVenues(venueList);
        setTasks(ts as EventTask[]);
        setProvidersPage(1);
      } catch (e) {
        setLoadError(((e as unknown) as { message?: string })?.message ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const pageData = await getProvidersPage(id, providersPage, providersPerPage);
        setProviders(pageData.items as ProviderItem[]);
        setProvidersLastPage(pageData.lastPage);
        setProvidersTotal(pageData.total);
        setProvidersTotals(pageData.totals);
      } catch (_) {
        setProviders([]);
        setProvidersLastPage(1);
        setProvidersTotal(0);
        setProvidersTotals({ amountCfa: 0, advanceCfa: 0, restCfa: 0 });
      }
    })();
  }, [id, providersPage, providersPerPage]);

  const eventBudgetCfa = useMemo(() => {
    const raw = eventData?.budget ? String(eventData.budget) : "0";
    const digits = raw.replace(/\D+/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }, [eventData]);
  const totalProvidersAmount = useMemo(() => providersTotals.amountCfa, [providersTotals]);
  const totalAdvance = useMemo(() => providersTotals.advanceCfa, [providersTotals]);
  const totalRest = useMemo(() => providersTotals.restCfa, [providersTotals]);
  const remainingBudget = useMemo(() => Math.max(eventBudgetCfa - totalProvidersAmount, 0), [eventBudgetCfa, totalProvidersAmount]);

  const venueName = useMemo(() => {
    if (!eventData?.venue) return "";
    const v = venues.find((x) => x.id === eventData.venue);
    return v?.name || eventData.venue;
  }, [eventData, venues]);

  const openCreateProvider = () => {
    setEditingProvider(null);
    setProvType("");
    setProvDesignation("");
    setProvAmount("");
    setProvAdvance("");
    setProvComments("");
    setProvContact("");
    setProvError("");
  };

  const fetchAllProvidersForPrint = async () => {
    if (!id) return { items: [] as ProviderItem[], totals: { amountCfa: 0, advanceCfa: 0, restCfa: 0 } };
    let page = 1;
    let last = 1;
    const all: ProviderItem[] = [];
    let totals = { amountCfa: 0, advanceCfa: 0, restCfa: 0 };
    do {
      const pageData = await getProvidersPage(id, page, 100);
      all.push(...(pageData.items as ProviderItem[]));
      totals = pageData.totals;
      last = pageData.lastPage;
      page += 1;
    } while (page <= last);
    return { items: all, totals };
  };

  const printProviders = async (mode: "page" | "all", fitOnePage: boolean) => {
    try {
      setIsPrinting(true);
      const data = mode === "page"
        ? { items: providers, totals: providersTotals }
        : await fetchAllProvidersForPrint();
      const formatCfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Number(n || 0))} CFA`;
      const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const rowsHtml = data.items.map(p => `
        <tr>
          <td>${esc(p.type || "-")}</td>
          <td>${esc(p.designation)}</td>
          <td class="num">${formatCfa(p.amountCfa || 0)}</td>
          <td class="num">${formatCfa(p.advanceCfa || 0)}</td>
          <td class="num">${formatCfa(Math.max((p.amountCfa || 0) - (p.advanceCfa || 0), 0))}</td>
          <td>${esc(p.comments || "-")}</td>
          <td>${esc(p.contact || "-")}</td>
        </tr>
      `).join("");
      const title = esc(eventData?.title || "Événement");
      const date = esc(eventData?.date || "");
      const html = `<!doctype html>
        <html lang="fr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Prestataires</title>
            <style>
              @page { size: A4; margin: 12mm; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #111827; }
              h1 { font-size: 18px; margin: 0 0 8px 0; }
              .meta { color: #6B7280; font-size: 12px; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              thead th { background: #E5E7EB; text-align: center; padding: 8px 6px; border: 1px solid #E5E7EB; }
              tbody td { padding: 8px 6px; border: 1px solid #E5E7EB; }
              tfoot td { padding: 8px 6px; border: 1px solid #E5E7EB; }
              tfoot tr.total { background: #1E3A8A; color: #fff; }
              td.num { text-align: center; white-space: nowrap; }
              td.center { text-align: center; }
              .fit table { font-size: 10px; }
              .fit thead th, .fit tbody td, .fit tfoot td { padding: 4px 4px; }
              .fit h1 { font-size: 14px; }
              .fit .meta { font-size: 10px; }
            </style>
          </head>
          <body class="${fitOnePage ? "fit" : ""}">
            <h1>${title ? `${title}` : ""}</h1>
            <h1>Listes des prestataires</h1>
            ${date ? `<div class="meta">Date: ${date}</div>` : ""}
            <table>
              <thead>
                <tr>
                  <th>Types</th>
                  <th>Désignation</th>
                  <th>Montant</th>
                  <th>Avance</th>
                  <th>Reste à payer</th>
                  <th>Commentaires</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td class="center" colspan="7">Aucun prestataire</td></tr>`}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="2" style="text-align:right;font-weight:600;">Total</td>
                  <td class="num" style="font-weight:600;">${formatCfa(data.totals.amountCfa)}</td>
                  <td class="num" style="font-weight:600;">${formatCfa(data.totals.advanceCfa)}</td>
                  <td class="num" style="font-weight:600;">${formatCfa(data.totals.restCfa)}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </body>
        </html>`;
      const w = window.open("", "_blank");
      if (!w) { setIsPrinting(false); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); setIsPrinting(false); }, 300);
    } catch {
      setIsPrinting(false);
    }
  };

  const exportProvidersExcel = async (mode: "page" | "all") => {
    const data = mode === "page" ? { items: providers, totals: providersTotals } : await fetchAllProvidersForPrint();
    const formatCfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Number(n || 0))} CFA`;
    const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rowsHtml = data.items.map(p => `
      <tr>
        <td>${esc(p.type || "-")}</td>
        <td>${esc(p.designation)}</td>
        <td style="text-align:center;">${formatCfa(p.amountCfa || 0)}</td>
        <td style="text-align:center;">${formatCfa(p.advanceCfa || 0)}</td>
        <td style="text-align:center;">${formatCfa(Math.max((p.amountCfa || 0) - (p.advanceCfa || 0), 0))}</td>
        <td>${esc(p.comments || "-")}</td>
        <td>${esc(p.contact || "-")}</td>
      </tr>
    `).join("");
    const excelHtml = `<!doctype html>
      <html><head><meta charset="UTF-8"><style>
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#E5E7EB;text-align:center;padding:8px 6px;border:1px solid #E5E7EB;}
      td{padding:8px 6px;border:1px solid #E5E7EB;}
      tfoot td{border:1px solid #E5E7EB;}
      tr.total{background:#1E3A8A;color:#fff;}
      </style></head><body>
      <table>
        <thead><tr>
          <th>Types</th><th>Désignation</th><th>Montant</th><th>Avance</th><th>Reste à payer</th><th>Commentaires</th><th>Contact</th>
        </tr></thead>
        <tbody>${rowsHtml || `<tr><td colspan="7" style="text-align:center;">Aucun prestataire</td></tr>`}</tbody>
        <tfoot><tr class="total">
          <td colspan="2" style="text-align:right;font-weight:600;">Total</td>
          <td style="text-align:center;font-weight:600;">${formatCfa(data.totals.amountCfa)}</td>
          <td style="text-align:center;font-weight:600;">${formatCfa(data.totals.advanceCfa)}</td>
          <td style="text-align:center;font-weight:600;">${formatCfa(data.totals.restCfa)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table></body></html>`;
    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prestataires.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openEditProvider = (p: ProviderItem) => {
    setEditingProvider(p);
    setProvType(p.type || "");
    setProvDesignation(p.designation);
    setProvAmount(String(p.amountCfa || 0));
    setProvAdvance(String(p.advanceCfa || 0));
    setProvComments(p.comments || "");
    setProvContact(p.contact || "");
    setProvError("");
  };

  const saveProvider = async () => {
    if (!id) return;
    try {
      const payload = {
        type: provType || undefined,
        designation: provDesignation.trim(),
        amountCfa: Math.max(parseInt(provAmount || "0", 10) || 0, 0),
        advanceCfa: provAdvance ? Math.max(parseInt(provAdvance, 10) || 0, 0) : 0,
        comments: provComments || undefined,
        contact: provContact || undefined,
      };
      let saved: ProviderItem;
      if (editingProvider) {
        saved = (await updateProvider(editingProvider.id, payload)) as ProviderItem;
        // Rafraîchir la page courante après modification
        const pageData = await getProvidersPage(id, providersPage, providersPerPage);
        setProviders(pageData.items as ProviderItem[]);
        setProvidersLastPage(pageData.lastPage);
        setProvidersTotal(pageData.total);
        setProvidersTotals(pageData.totals);
      } else {
        saved = (await createProvider(id, payload)) as ProviderItem;
        // Aller à la 1ère page pour voir le nouveau prestataire (ordre latest)
        setProvidersPage(1);
        const pageData = await getProvidersPage(id, 1, providersPerPage);
        setProviders(pageData.items as ProviderItem[]);
        setProvidersLastPage(pageData.lastPage);
        setProvidersTotal(pageData.total);
        setProvidersTotals(pageData.totals);
      }
    } catch (e) {
      setProvError(((e as unknown) as { message?: string })?.message ?? "Erreur inconnue");
    }
  };

  const removeProvider = async (p: ProviderItem) => {
    try {
      await deleteProvider(p.id);
      // Recharger la page; si vide et page > 1, reculer d'une page
      if (!id) return;
      let pageToLoad = providersPage;
      let pageData = await getProvidersPage(id, pageToLoad, providersPerPage);
      if (pageData.items.length === 0 && pageToLoad > 1) {
        pageToLoad = pageToLoad - 1;
        setProvidersPage(pageToLoad);
        pageData = await getProvidersPage(id, pageToLoad, providersPerPage);
      }
      setProviders(pageData.items as ProviderItem[]);
      setProvidersLastPage(pageData.lastPage);
      setProvidersTotal(pageData.total);
      setProvidersTotals(pageData.totals);
    } catch (e) {
      // noop
    }
  };

  const goProviders = () => providersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const goAssign = (task: string) => {
    if (!id) return;
    navigate(`/admin/events/${id}/staff?task=${encodeURIComponent(task)}`);
  };

  const goTables = () => {
    if (!id) return;
    navigate(`/admin/events/${id}/tables`);
  };

  const goGuests = () => {
    if (!id) return;
    navigate(`/admin/events/${id}/guests`);
  };

  const saveTask = async () => {
    if (!id) return;
    const name = taskName.trim();
    if (!name) {
      setTaskError("Le nom de la tâche est requis");
      return;
    }
    try {
      const created = await createTask(id, { name });
      setTasks((prev) => [created as EventTask, ...prev]);
      setTaskDialogOpen(false);
    } catch (e) {
      setTaskError(((e as unknown) as { message?: string })?.message ?? "Erreur inconnue");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {id ? (eventData?.title || "Gestion de l'événement") : "Aucun événement sélectionné"}
          </h1>
          {hasEvent && loading && (
            <p className="text-muted-foreground">Chargement...</p>
          )}
          {hasEvent && !loading && eventData && (
            
            <p className="text-muted-foreground">Planifiez et assignez les tâches avant et après l'événement.</p>
          )}
          {(!hasEvent || (!loading && !eventData)) && (
            <p className="text-muted-foreground">{loadError ? loadError : "Aucun événement sélectionné. Planifiez et assignez les tâches avant et après l'événement."}</p>
          )}
        </div>
      </div>

      {!isCancelledOrFailed && (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">
            Gestion opérationnelle
          </h2>
        </CardHeader>
        <CardContent>
          {hasEvent ? (
            <div className="space-y-6">
              {forcedPhase === null ? null : null}
              {/* Phase toggles hidden per new rules; we force a single phase view */}
              <div className="flex flex-col sm:flex-row gap-4">
                {forcedPhase === "avant" && (
                  <Button type="button" className="flex-1 bg-primary hover:bg-primary-hover text-white" disabled>
                    Avant l'événement
                  </Button>
                )}
                {forcedPhase === "apres" && (
                  <Button type="button" className="flex-1 bg-primary hover:bg-primary-hover text-white" disabled>
                    Après l'événement
                  </Button>
                )}
              </div>

              {((forcedPhase ? forcedPhase === "avant" : (!isAssignForbidden && activePhase === "avant"))) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!isAssignForbidden && (
                    <Card className="border border-border">
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-foreground">Personnel de l'événement</h3>
                        <p className="text-sm text-muted-foreground">Assigner des personnes à cet événement</p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            className="flex-1 bg-primary hover:bg-primary-hover text-white"
                            onClick={() => navigate(`/admin/events/${id}/staff`)}
                          >
                            Assigner des personnes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Réaménagement</h3>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={() => { setTaskName(""); setTaskError(""); setTaskDialogOpen(true); }}>
                            <Plus className="w-4 h-4 mr-1" />
                            Créer une tâche
                          </Button>
                        </div>
                        {!isAssignForbidden && (
                          <>
                            {tasks.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Aucune tâche. Créez votre première tâche.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {tasks.map((t) => (
                                  <Button key={t.id} type="button" variant="outline" onClick={() => goAssign(t.slug)}>
                                    {t.name}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Mise en place</h3>
                      <p className="text-sm text-muted-foreground">Tables, placement, assignations</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={goTables}
                        >
                          Gestion des tables
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 bg-primary text-white hover:bg-primary-hover hover:text-white"
                          onClick={goGuests}
                        >
                          Gestions des invités
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {((forcedPhase ? forcedPhase === "apres" : activePhase === "apres")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!isAssignForbidden && (
                    <Card className="border border-border">
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-foreground">Personnel de l'événement</h3>
                        <p className="text-sm text-muted-foreground">Assigner des personnes à cet événement</p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            className="flex-1 bg-primary hover:bg-primary-hover text-white"
                            onClick={() => navigate(`/admin/events/${id}/staff`)}
                          >
                            Assigner des personnes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Tâches après l'événement</h3>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={() => { setTaskName(""); setTaskError(""); setTaskDialogOpen(true); }}>
                            <Plus className="w-4 h-4 mr-1" />
                            Créer une tâche
                          </Button>
                        </div>
                        {!isAssignForbidden && (
                          <>
                            {tasks.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Aucune tâche. Créez votre première tâche.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {tasks.map((t) => (
                                  <Button key={t.id} type="button" variant="outline" onClick={() => goAssign(t.slug)}>
                                    {t.name}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Mise en place (lecture seule): accès aux écrans Tables & Invités */}
                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Mise en place</h3>
                      <p className="text-sm text-muted-foreground">Tables, placement, assignations (lecture seule)</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={goTables}
                        >
                          Gestion des tables
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 bg-primary text-white hover:bg-primary-hover hover:text-white"
                          onClick={goGuests}
                        >
                          Gestions des invités
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aucun événement sélectionné. Retournez à la liste des événements pour en choisir un.
            </p>
          )}
        </CardContent>
      </Card>
      )}
      {hasEvent && (
        <div ref={providersSectionRef} id="providers-section" className="space-y-4">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Prestataires</h2>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => printProviders("all", true)} disabled={isPrinting}>Imprimer</Button>
                  <Button type="button" variant="outline" onClick={() => exportProvidersExcel("all")}>Excel</Button>
                  {!isAssignForbidden && (
                    <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={openCreateProvider}>Ajouter</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Total prestataires: bleu -> orange */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-700 to-green-300 text-white shadow-sm">
                  <div className="text-xs text-white/90">Total prestataires</div>
                  <div className="text-xl font-semibold drop-shadow-sm">{totalProvidersAmount.toLocaleString("fr-FR")} CFA</div>
                </div>
                {/* Total avances: verts */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-700 to-yellow-300 text-white shadow-sm">
                  <div className="text-xs text-white/90">Total avances</div>
                  <div className="text-xl font-semibold drop-shadow-sm">{totalAdvance.toLocaleString("fr-FR")} CFA</div>
                </div>
                {/* Reste budget: blancs/accents légers */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-white from-blue-700 to-blue-300 text-foreground text-white shadow-sm border border-border">
                  <div className="text-xs text-white/90">Reste budget</div>
                  <div className={`text-xl font-semibold drop-shadow-sm ${remainingBudget === 0 && eventBudgetCfa > 0 ? "text-destructive" : ""}`}>
                    {remainingBudget.toLocaleString("fr-FR")} CFA
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-gray-200 border-b border-border">
                      <th className="py-2 pr-2 text-center">Types</th>
                      <th className="py-2 pr-2 text-center">Désignation</th>
                      <th className="py-2 pr-2 text-center">Montant</th>
                      <th className="py-2 pr-2 text-center">Avance</th>
                      <th className="py-2 pr-2 text-center">Reste à payer</th>
                      <th className="py-2 pr-2 text-center">Commentaires</th>
                      <th className="py-2 pr-2 text-center">Contact</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p) => (
                      <tr key={p.id} className="border-b border-border">
                        <td className="py-2 pr-2 text-center">{p.type || "-"}</td>
                        <td className="py-2 pr-2 text-center">{p.designation}</td>
                        <td className="py-2 pr-2 text-center">{(p.amountCfa || 0).toLocaleString("fr-FR")} CFA</td>
                        <td className="py-2 pr-2 text-center">{(p.advanceCfa || 0).toLocaleString("fr-FR")} CFA</td>
                        <td className="py-2 pr-2 text-center">{(p.restToPayCfa || 0).toLocaleString("fr-FR")} CFA</td>
                        <td className="py-2 pr-2 text-center max-w-[260px] truncate" title={p.comments || undefined}>{p.comments || "-"}</td>
                        <td className="py-2 pr-2 text-center">{p.contact || "-"}</td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            {!isAssignForbidden && (
                              <Button type="button" className="bg-primary hover:bg-primary-hover text-white" size="sm" onClick={() => openEditProvider(p)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" size="sm" onClick={() => removeProvider(p)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {providers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-muted-foreground">Aucun prestataire</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-900 text-white">
                      <td colSpan={2} className="py-2 pr-2 text-right font-semibold">Total</td>
                      <td className="py-2 pr-2 text-center font-semibold">{totalProvidersAmount.toLocaleString("fr-FR")} CFA</td>
                      <td className="py-2 pr-2 text-center font-semibold">{totalAdvance.toLocaleString("fr-FR")} CFA</td>
                      <td className="py-2 pr-2 text-center font-semibold">{totalRest.toLocaleString("fr-FR")} CFA</td>
                      <td className="py-2 pr-2" colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Page {providersPage} / {providersLastPage} • {providersPerPage} par page • {providersTotal} au total
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={providersPage <= 1}
                    onClick={() => {
                      setProvidersPage((p) => Math.max(1, p - 1));
                      providersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    Précédent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={providersPage >= providersLastPage}
                    onClick={() => {
                      setProvidersPage((p) => p + 1);
                      providersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={provDialogOpen} onOpenChange={setProvDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Modifier un prestataire" : "Ajouter un prestataire"}</DialogTitle>
          </DialogHeader>
          {provError && (
            <div className="text-destructive text-sm mb-2">{provError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Type</label>
              <Input value={provType} onChange={(e) => setProvType(e.target.value)} placeholder="Décoration, Alliances..." />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Désignation</label>
              <Input value={provDesignation} onChange={(e) => setProvDesignation(e.target.value)} placeholder="Nom du prestataire" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Montant (CFA)</label>
              <Input type="number" min={0} value={provAmount} onChange={(e) => setProvAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Avance (CFA)</label>
              <Input type="number" min={0} value={provAdvance} onChange={(e) => setProvAdvance(e.target.value)} placeholder="0" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Commentaires</label>
              <Input value={provComments} onChange={(e) => setProvComments(e.target.value)} placeholder="Notes" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Contact</label>
              <Input value={provContact} onChange={(e) => setProvContact(e.target.value)} placeholder="Téléphone" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProvDialogOpen(false)}>Annuler</Button>
            <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={saveProvider} disabled={isAssignForbidden}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une tâche</DialogTitle>
          </DialogHeader>
          {taskError && <div className="text-destructive text-sm mb-2">{taskError}</div>}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Nom de la tâche</label>
            <Input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Ex: Sono, Lumières, Vidéo, etc."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>Annuler</Button>
            <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={saveTask}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default EventManagement;