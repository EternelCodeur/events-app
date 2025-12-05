/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Search, Plus, Filter, Trash2, Users } from 'lucide-react';
import { z } from 'zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getXsrfTokenFromCookie } from '@/lib/auth';
import { getEvent } from '@/lib/events';

interface Invite {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  personnes: number;
  table_id?: number | null;
  table_name?: string;
  statut: 'confirmed' | 'pending';
  notes?: string;
  present?: boolean;
  heureArrivee?: string | null;
  additionalGuests?: string[];
}
type TableOption = { id: number; nom: string; places_total?: number; places_utilisees?: number; remaining?: number; isFull?: boolean };
type TableApi = { id: number; nom: string; places_total?: number | string | null; places_utilisees?: number | string | null };
type InviteApi = {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  personnes: number;
  table_id?: number | null;
  table_name?: string | null;
  statut: 'confirmed' | 'pending';
  present?: boolean | null;
  heure_arrivee?: string | null;
  additionalGuests?: string[] | null;
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
  const method = String((init.method || 'GET')).toUpperCase();
  const xsrf = getXsrfTokenFromCookie();
  const headers: HeadersInit = { ...(init.headers || {}), ...(auth as HeadersInit) };
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && xsrf) {
    (headers as any)['X-XSRF-TOKEN'] = xsrf;
  }
  const res = await fetch(path, { credentials: "include", ...init, headers });
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
        return fetch(path, { credentials: "include", ...init, headers: retryHeaders });
      }
    } catch { /* noop */ }
  }
  return res;
}

const Invites = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [tablesOptions, setTablesOptions] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  // removed side filter
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [eventStatus, setEventStatus] = useState<string | undefined>(undefined);
  const isReadOnly = eventStatus === 'termine' || eventStatus === 'annuler' || eventStatus === 'echoue';

  const inviteFormSchema = z.object({
    nom: z.string().min(1, 'Le nom est requis'),
    prenom: z.string().min(1, 'Le prénom est requis'),
    email: z.string().email('Email invalide').optional().or(z.literal('')),
    telephone: z.string().min(1, 'Le téléphone est requis'),
    personnes: z.coerce.number().min(1, 'Au moins une personne'),
    table_id: z.coerce.number().optional(),
    statut: z.enum(['confirmed', 'pending']),
    adresse: z.string().optional(),
    notes: z.string().optional(),
    additionalGuests: z.array(z.string()).optional(),
  });

  type InviteForm = z.infer<typeof inviteFormSchema> & { id?: number };

  const createForm = useForm<InviteForm>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      id: undefined,
      nom: '',
      prenom: '',
      telephone: '',
      personnes: 1,
      table_id: undefined,
      statut: 'pending',
      additionalGuests: [],
    },
  });

  const editForm = useForm<InviteForm>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      id: undefined,
      nom: '',
      prenom: '',
      telephone: '',
      personnes: 1,
      table_id: undefined,
      statut: 'pending',
      additionalGuests: [],
    },
  });

  const tables = tablesOptions;

  const mapInvite = (i: InviteApi): Invite => ({
    id: i.id,
    nom: i.nom,
    prenom: i.prenom,
    telephone: i.telephone,
    personnes: i.personnes,
    table_id: i.table_id ?? null,
    table_name: i.table_name ?? '',
    statut: i.statut,
    present: (i.present ?? false) as boolean,
    heureArrivee: i.heure_arrivee ?? null,
    additionalGuests: Array.isArray(i.additionalGuests ?? undefined) ? (i.additionalGuests as string[]) : [],
  });

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/events/${encodeURIComponent(id || '')}/invites`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload : (payload.data ?? []);
      setInvites(list.map(mapInvite));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } ; message?: string };
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || 'Erreur lors du chargement des invités';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, id]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/events/${encodeURIComponent(id || '')}/tables/summary`);
      if (!res.ok) return;
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload : (payload.data ?? []);
      setTablesOptions(list.map((t: TableApi) => {
        const total = Number(t.places_total);
        const used = Number(t.places_utilisees);
        const hasTotal = Number.isFinite(total);
        const hasUsed = Number.isFinite(used);
        const remaining = hasTotal && hasUsed ? (total - used) : undefined;
        const isFull = hasTotal && hasUsed ? used >= total : false;
        return {
          id: t.id,
          nom: t.nom,
          places_total: hasTotal ? total : undefined,
          places_utilisees: hasUsed ? used : undefined,
          remaining,
          isFull,
        };
      }));
    } catch (e) {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    fetchInvites();
    fetchTables();
  }, [fetchInvites, fetchTables]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const ev = await getEvent(id);
        setEventStatus((ev as { status?: string }).status);
      } catch {
        setEventStatus(undefined);
      }
    })();
  }, [id]);

  const handleEditInvite = (invite: Invite) => {
    setEditingInvite(invite);
    editForm.reset({
      id: invite.id,
      nom: invite.nom,
      prenom: invite.prenom,
      telephone: invite.telephone,
      personnes: invite.personnes,
      table_id: invite.table_id ?? undefined,
      additionalGuests: invite.additionalGuests || [],
    });
    setIsEditOpen(true);
  };

  const submitAddInvites = async (data: InviteForm) => {
    try {
      const selectedId = data.table_id && Number(data.table_id) > 0 ? Number(data.table_id) : null;
      if (selectedId) {
        const table = tablesOptions.find(t => t.id === selectedId);
        const remaining = table?.remaining;
        if (typeof remaining === 'number' && Number(data.personnes) > remaining) {
          toast({ title: 'Capacité insuffisante', description: `Cette table n'a plus que ${remaining} place(s) disponible(s).`, variant: 'destructive' });
          return;
        }
      }
      const body = {
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        personnes: Number(data.personnes),
        table_id: data.table_id && Number(data.table_id) > 0 ? Number(data.table_id) : null,
        statut: data.statut ?? 'pending',
        additionalGuests: (data.additionalGuests ?? []).filter((s: string) => s && s.trim().length > 0),
      };
      const auth = await getAuthHeader();
      const xsrf = getXsrfTokenFromCookie();
      const res = await fetch(`/api/events/${encodeURIComponent(id || '')}/invites`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(auth as HeadersInit), ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { response: { data: err } };
      }
      const json = await res.json();
      const created = mapInvite(json?.data ?? json);
      setInvites(prev => [...prev, created]);
      toast({ title: 'Invité ajouté', description: `${data.prenom} ${data.nom} a été ajouté à la liste des invités.` });
      fetchTables();
      setIsCreateOpen(false);
      createForm.reset();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } ; message?: string };
      const msg = err?.response?.data?.message
        || (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : '')
        || err?.message
        || "Erreur lors de l'enregistrement";
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const SubmitEditInvite = async (data: InviteForm) => {
    try {
      const selectedId = data.table_id && Number(data.table_id) > 0 ? Number(data.table_id) : null;
      if (selectedId) {
        const table = tablesOptions.find(t => t.id === selectedId);
        const isSameTable = editingInvite && editingInvite.table_id === selectedId;
        const baseRemaining = table?.remaining ?? 0;
        const effectiveRemaining = isSameTable ? baseRemaining + (editingInvite?.personnes ?? 0) : baseRemaining;
        if (typeof effectiveRemaining === 'number' && Number(data.personnes) > effectiveRemaining) {
          toast({ title: 'Capacité insuffisante', description: `Cette table n'a plus que ${effectiveRemaining} place(s) disponible(s).`, variant: 'destructive' });
          return;
        }
      }
      const editingId = data.id ?? editForm.getValues('id');
      const body = {
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        personnes: Number(data.personnes),
        table_id: data.table_id && Number(data.table_id) > 0 ? Number(data.table_id) : null,
        additionalGuests: (data.additionalGuests ?? []).filter((s: string) => s && s.trim().length > 0),
      };
      const auth = await getAuthHeader();
      const xsrf = getXsrfTokenFromCookie();
      const res = await fetch(`/api/invites/${editingId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(auth as HeadersInit), ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { response: { data: err } };
      }
      const json = await res.json();
      const updated = mapInvite(json?.data ?? json);
      setInvites(prev => prev.map(i => i.id === editingId ? updated : i));
      toast({ title: 'Invité mis à jour', description: `Les informations de ${data.prenom} ${data.nom} ont été mises à jour.` });
      fetchTables();
      setIsEditOpen(false);
      setEditingInvite(null);
      editForm.reset();
    } catch (e: unknown) {
      const err: any = e as any;
      const msg = err?.response?.data?.message
        || (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : '')
        || err?.message
        || "Erreur lors de l'enregistrement";
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const renderAdditionalGuestFields = (formApi: UseFormReturn<InviteForm>) => {
    const fields = [] as JSX.Element[];
    for (let i = 0; i < formApi.watch('personnes') - 1; i++) {
      fields.push(
        <FormField
          key={i}
          control={formApi.control}
          name={`additionalGuests.${i}` as const}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la personne {i + 2}</FormLabel>
              <FormControl>
                <Input
                  placeholder={`Nom de la personne ${i + 2}`}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    return fields;
  };

  const handleDeleteInvite = async (id: number) => {
    const inviteToDelete = invites.find(i => i.id === id);
    if (inviteToDelete && confirm(`Êtes-vous sûr de vouloir supprimer ${inviteToDelete.prenom} ${inviteToDelete.nom} ?`)) {
      try {
        const auth = await getAuthHeader();
        const xsrf = getXsrfTokenFromCookie();
        const res = await fetch(`/api/invites/${id}`, { method: 'DELETE', credentials: 'include', headers: { ...(auth as HeadersInit), ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}) } });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw { response: { data: err } };
        }
        setInvites(invites.filter(i => i.id !== id));
        toast({ title: 'Invité supprimé', description: `${inviteToDelete.prenom} ${inviteToDelete.nom} a été retiré de la liste des invités.` });
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        toast({ title: 'Erreur', description: err?.response?.data?.message || 'Erreur lors de la suppression', variant: 'destructive' });
      }
    }
  };

  const filteredInvites = invites.filter(invite => {
    const matchesSearch = 
      invite.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invite.table_name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invite.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const createPersons = createForm.watch('personnes');
  const availableTablesCreate = tables.filter((t) => {
    if (t.isFull) return false;
    const p = Number(createPersons) || 1;
    if (typeof t.remaining === 'number') return t.remaining >= p;
    return true;
  });

  const editPersons = editForm.watch('personnes');
  const availableTablesEdit = tables.filter((t) => {
    if (t.isFull) {
      // Autoriser la table courante si elle peut contenir avec l'ancien nombre
      if (editingInvite && t.id === (editingInvite.table_id ?? 0)) {
        const baseRem = typeof t.remaining === 'number' ? t.remaining : 0;
        const effectiveRemaining = baseRem + (editingInvite?.personnes ?? 0);
        return effectiveRemaining >= (Number(editPersons) || 1);
      }
      return false;
    }
    const p = Number(editPersons) || 1;
    if (typeof t.remaining === 'number') return t.remaining >= p;
    return true;
  });

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Invités</h1>
          <p className="text-muted-foreground mt-2">
            {invites.length} invités au total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/events/${id}/manage`)}
          >
            Retour
          </Button>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="default" 
              className="bg-primary text-white hover:bg-primary-hover hover:text-white"
              size="lg"
              onClick={() => {
                setEditingInvite(null);
                createForm.reset({
                  id: undefined as any,
                  nom: '',
                  prenom: '',
                  telephone: '',
                  personnes: 1,
                  table_id: (tablesOptions[0]?.id ?? 0) as any,
                  statut: 'pending' as any,
                  additionalGuests: [],
                });
                setIsCreateOpen(true);
              }}
              disabled={isReadOnly}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un invité
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Ajouter un invité
              </DialogTitle>
              <DialogDescription>
                Renseignez les informations ci-dessous puis validez pour ajouter l'invité.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(submitAddInvites)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="prenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom *</FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone *</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="personnes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de personnes *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="table_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableTablesCreate.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.nom}{typeof t.remaining === 'number' ? ` (restantes: ${t.remaining})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {renderAdditionalGuestFields(createForm)}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isReadOnly}>
                    Ajouter
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Modifier un invité
              </DialogTitle>
              <DialogDescription>
                Renseignez les informations ci-dessous puis validez pour mettre à jour l'invité.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(SubmitEditInvite)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="prenom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom *</FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone *</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="personnes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de personnes *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="table_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une table" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableTablesEdit.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.nom}{typeof t.remaining === 'number' ? ` (restantes: ${t.remaining})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {renderAdditionalGuestFields(editForm)}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditingInvite(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isReadOnly}>
                    Mettre à jour
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="wedding-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Recherche et filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, prénom ou table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredInvites.map((invite) => (
          <Card key={invite.id} className="wedding-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {invite.prenom} {invite.nom}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4" />
                    {invite.personnes} personne{invite.personnes > 1 ? 's' : ''}
                  </CardDescription>
                  {invite.additionalGuests && invite.additionalGuests.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Invités supplémentaires : {invite.additionalGuests.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Table assignée</span>
                <Badge variant="outline">{invite.table_name || 'Non assignée'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant="outline">
                  {invite.statut === 'confirmed' ? 'Confirmé' : 'En attente'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>{invite.telephone}</div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive border border-red-500 hover:border-red-200 hover:text-destructive/90"
                  onClick={() => handleDeleteInvite(invite.id)}
                  disabled={isReadOnly}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvites.length === 0 && (
        <Card className="wedding-card">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aucun invité trouvé
            </h3>
            <p className="text-muted-foreground mb-4">
              Essayez de modifier vos critères de recherche
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
            }}>
              Réinitialiser les filtres
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Invites;
