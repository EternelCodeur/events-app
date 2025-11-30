import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { getEvent } from "@/lib/events";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type TableStatus = "en_attente" | "pleine";

interface TableItem {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

const initialTables: TableItem[] = [
  { id: "t1", name: "Table 1", capacity: 8, status: "en_attente" },
  { id: "t2", name: "Table 2", capacity: 10, status: "en_attente" },
  { id: "t3", name: "Table 3", capacity: 6, status: "pleine" },
];

const mockEvents = [
  { id: "1", title: "Mariage Dupont" },
  { id: "2", title: "Conférence Tech 2025" },
  { id: "3", title: "Gala Entreprise ABC" },
];

const tableStatusColors: Record<TableStatus, string> = {
  en_attente: "bg-amber-500 hover:bg-amber-600",
  pleine: "bg-success hover:bg-success/90",
};

const tableStatusLabels: Record<TableStatus, string> = {
  en_attente: "En attente",
  pleine: "Pleine",
};

const EventTables = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tables, setTables] = useState<TableItem[]>(initialTables);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);

  const [eventAssignedStaff, setEventAssignedStaff] = useState<StaffMember[]>([]);
  const [tableAssignments, setTableAssignments] = useState<Record<string, string[]>>({});
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTable, setAssignTable] = useState<TableItem | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [eventStatus, setEventStatus] = useState<string | undefined>(undefined);

  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("");

  const event = mockEvents.find((e) => e.id === id);

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

  const isAssignForbidden = useMemo(() => {
    const s = eventStatus;
    return s === "termine" || s === "annuler" || s === "echoue";
  }, [eventStatus]);

  useEffect(() => {
    if (!id) return;
    try {
      const rawStaff = localStorage.getItem(`eventStaffAssigned:${id}`);
      const staff: StaffMember[] = rawStaff ? JSON.parse(rawStaff) : [];
      setEventAssignedStaff(staff);
    } catch (_) {
      setEventAssignedStaff([]);
    }
    try {
      const rawAssign = localStorage.getItem(`eventTableAssignments:${id}`);
      const assign: Record<string, string[]> = rawAssign ? JSON.parse(rawAssign) : {};
      setTableAssignments(assign);
    } catch (_) {
      setTableAssignments({});
    }
  }, [id]);

  const filteredTables = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tables;

    return tables.filter((table) =>
      `${table.name}`.toLowerCase().includes(term),
    );
  }, [tables, searchTerm]);

  const openCreateDialog = () => {
    setEditingTable(null);
    setFormName("");
    setFormCapacity("");
    setDialogOpen(true);
  };

  const openEditDialog = (table: TableItem) => {
    setEditingTable(table);
    setFormName(table.name);
    setFormCapacity(table.capacity.toString());
    setDialogOpen(true);
  };

  const openAssignDialog = (table: TableItem) => {
    setAssignTable(table);
    const preselected = tableAssignments[table.id] || [];
    setSelectedStaffIds(preselected);
    setAssignDialogOpen(true);
  };

  const toggleSelectStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    );
  };

  const saveAssignDialog = () => {
    if (!id || !assignTable) return;
    const next = { ...tableAssignments, [assignTable.id]: selectedStaffIds };
    setTableAssignments(next);
    localStorage.setItem(`eventTableAssignments:${id}`, JSON.stringify(next));
    setAssignDialogOpen(false);
    setAssignTable(null);
  };

  const handleDelete = (idToDelete: string) => {
    if (window.confirm("Supprimer définitivement cette table ?")) {
      setTables((prev) => prev.filter((t) => t.id !== idToDelete));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCapacity) return;

    const capacityValue = Number(formCapacity);
    if (Number.isNaN(capacityValue) || capacityValue <= 0) return;

    const payload: TableItem = {
      id: editingTable ? editingTable.id : Date.now().toString(),
      name: formName,
      capacity: capacityValue,
      status: editingTable?.status ?? "en_attente",
    };

    setTables((prev) => {
      if (editingTable) {
        return prev.map((t) => (t.id === editingTable.id ? payload : t));
      }
      return [...prev, payload];
    });

    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {event ? event.title : "Tables de l'événement"}
          </h1>
          <p className="text-muted-foreground">
            Gérez les tables uniquement pour cet événement.
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
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover"
            onClick={openCreateDialog}
          >
            <Plus className="w-4 h-4 mr-2" /> Nouvelle table
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une table..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {eventAssignedStaff.length === 0 && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Aucun personnel n'est encore assigné à cet événement. Assignez d'abord des personnes pour pouvoir les affecter aux tables.
            </div>
            {!isAssignForbidden && (
              <Button
                type="button"
                className="bg-primary hover:bg-primary-hover text-white"
                onClick={() => navigate(`/admin/events/${id}/staff`)}
              >
                Assigner du personnel à l'événement
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTables.map((table) => (
          <Card key={table.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {table.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Capacité : {table.capacity} places
                  </p>
                </div>
                <Badge className={tableStatusColors[table.status]}>
                  {tableStatusLabels[table.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Personnel assigné</p>
                  {Array.isArray(tableAssignments[table.id]) && tableAssignments[table.id].length > 0 ? (
                    <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
                      {tableAssignments[table.id]
                        .map((sid) => eventAssignedStaff.find((s) => s.id === sid))
                        .filter(Boolean)
                        .map((s) => (
                          <li key={(s as StaffMember).id}>{(s as StaffMember).name}</li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Aucune personne assignée à cette table</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openAssignDialog(table)}
                    disabled={eventAssignedStaff.length === 0}
                  >
                    Assigner des personnes
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openEditDialog(table)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDelete(table.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingTable ? "Modifier la table" : "Nouvelle table"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom de la table</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nom de la table"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de places</label>
                <Input
                  type="number"
                  min={1}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder="Ex: 10"
                  required
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                {editingTable ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner du personnel à {assignTable?.name}</DialogTitle>
          </DialogHeader>
          {eventAssignedStaff.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Aucun personnel n'est encore assigné à l'événement.</p>
              {!isAssignForbidden && (
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary-hover text-white"
                  onClick={() => navigate(`/admin/events/${id}/staff`)}
                >
                  Assigner du personnel à l'événement
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {eventAssignedStaff.map((s) => (
                <label key={s.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedStaffIds.includes(s.id)}
                    onChange={() => toggleSelectStaff(s.id)}
                  />
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-muted-foreground">— {s.role}</span>
                </label>
              ))}
            </div>
          )}
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="bg-primary hover:bg-primary-hover" onClick={saveAssignDialog}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventTables;
