import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { getEvent as apiGetEvent, type EventItem } from "@/lib/events";
import { getProviders, createProvider, updateProvider, deleteProvider, type ProviderItem } from "@/lib/providers";
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

  const [providers, setProviders] = useState<ProviderItem[]>([]);
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

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      setLoadError("");
      try {
        const [ev, vs, ps] = await Promise.all([
          apiGetEvent(id),
          fetchVenues(),
          getProviders(id),
        ]);
        setEventData(ev as unknown as EventItem);
        const venueList = (vs as Venue[]).map((v) => ({ id: String(v.id), name: String(v.name) }));
        setVenues(venueList);
        setProviders(ps as ProviderItem[]);
      } catch (e) {
        setLoadError(((e as unknown) as { message?: string })?.message ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  const eventBudgetCfa = useMemo(() => {
    const raw = eventData?.budget ? String(eventData.budget) : "0";
    const digits = raw.replace(/\D+/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }, [eventData]);
  const totalProvidersAmount = useMemo(() => providers.reduce((s, p) => s + (p.amountCfa || 0), 0), [providers]);
  const totalAdvance = useMemo(() => providers.reduce((s, p) => s + (p.advanceCfa || 0), 0), [providers]);
  const totalRest = useMemo(() => providers.reduce((s, p) => s + Math.max((p.amountCfa || 0) - (p.advanceCfa || 0), 0), 0), [providers]);
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
    setProvDialogOpen(true);
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
    setProvDialogOpen(true);
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
        setProviders((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      } else {
        saved = (await createProvider(id, payload)) as ProviderItem;
        setProviders((prev) => [saved, ...prev]);
      }
      setProvDialogOpen(false);
    } catch (e) {
      setProvError(((e as unknown) as { message?: string })?.message ?? "Erreur inconnue");
    }
  };

  const removeProvider = async (p: ProviderItem) => {
    try {
      await deleteProvider(p.id);
      setProviders((prev) => prev.filter((x) => x.id !== p.id));
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

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">
            Gestion opérationnelle
          </h2>
        </CardHeader>
        <CardContent>
          {hasEvent ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  className={`flex-1 ${activePhase === "avant" ? "bg-primary hover:bg-primary-hover text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                  onClick={() => setActivePhase("avant")}
                >
                  Avant l'événement
                </Button>
                <Button
                  type="button"
                  className={`flex-1 ${activePhase === "apres" ? "bg-primary hover:bg-primary-hover text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                  onClick={() => setActivePhase("apres")}
                >
                  Après l'événement
                </Button>
              </div>

              {activePhase === "avant" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Réaménagement</h3>
                      <p className="text-sm text-muted-foreground">Décoration, peinture, nettoyage</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <Button
                          type="button"
                          className="w-full bg-primary hover:bg-primary-hover text-white"
                          onClick={() => goAssign("decoration")}
                        >
                          Décoration
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => goAssign("peinture")}
                        >
                          Peinture
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => goAssign("nettoyage_cour")}
                        >
                          Net de la cour
                        </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => goAssign("nettoyage_salle")}
                          >
                            Net de la salle
                          </Button>
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
                          className="flex-1"
                          onClick={goProviders}
                        >
                          Prestataires
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}

              {activePhase === "apres" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Démontage</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1 bg-primary hover:bg-primary-hover text-white"
                          onClick={() => goAssign("demontage")}
                        >
                          Assigner à la tâche
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-foreground">Nettoyage</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => goAssign("nettoyage_cour")}
                        >
                          Nettoyage de la cour
                        </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => goAssign("nettoyage_salle")}
                          >
                            Nettoyage de la salle
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

      {hasEvent && (
        <div ref={providersSectionRef} id="providers-section" className="space-y-4">
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Prestataires</h2>
                <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={openCreateProvider}>
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
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
                    <tr className="text-left border-b border-border">
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
                        <td className="py-2 pr-2 max-w-[260px] truncate" title={p.comments || undefined}>{p.comments || "-"}</td>
                        <td className="py-2 pr-2 text-center">{p.contact || "-"}</td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <Button type="button" className="bg-primary hover:bg-primary-hover text-white" size="sm" onClick={() => openEditProvider(p)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
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
            <Button type="button" className="bg-primary hover:bg-primary-hover text-white" onClick={saveProvider}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManagement;
