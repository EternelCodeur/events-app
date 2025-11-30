import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { getTasks, type EventTask } from "@/lib/tasks";
import { getAvailableStaffForEvent, type StaffMember as ApiStaffMember } from "@/lib/staff";
import { getEvent } from "@/lib/events";
import { getAssignments, addAssignment } from "@/lib/eventAssignments";
import { getTaskAssignments, addTaskAssignment } from "@/lib/taskAssignments";


const incompatibleMap: Record<string, string[]> = {
  decoration: ["peinture", "nettoyage_cour", "nettoyage_salle"],
  peinture: ["decoration", "nettoyage_cour", "nettoyage_salle"],
  nettoyage_cour: ["decoration", "peinture", "nettoyage_salle"],
  nettoyage_salle: ["decoration", "peinture", "nettoyage_cour"],
};

const EventStaff = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [eventTitle, setEventTitle] = useState<string>("Événement");
  const [allStaff, setAllStaff] = useState<ApiStaffMember[]>([]);
  const [availableStaff, setAvailableStaff] = useState<ApiStaffMember[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<ApiStaffMember[]>([]);
  const [taskAssignedStaff, setTaskAssignedStaff] = useState<ApiStaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("tous");
  const [roles, setRoles] = useState<string[]>([]);

  const task = useMemo(() => new URLSearchParams(location.search).get("task") || "", [location.search]);
  const taskLabel = useMemo(() => {
    const found = tasks.find((t) => t.slug === task);
    if (found) return found.name;
    switch (task) {
      case "decoration":
        return "Décoration";
      case "peinture":
        return "Peinture";
      case "nettoyage_cour":
        return "Nettoyage de la cour";
      case "nettoyage_salle":
        return "Nettoyage de la salle";
      case "mise_en_place":
        return "Mise en place";
      case "demontage":
        return "Démontage";
      case "nettoyage":
        return "Nettoyage";
      default:
        return task || "";
    }
  }, [task, tasks]);

  const selectedTask = useMemo(() => tasks.find((t) => t.slug === task) || null, [task, tasks]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const ts = await getTasks(id);
        setTasks(ts as EventTask[]);
      } catch {
        setTasks([]);
      }
    })();
  }, [id]);

  const readTaskAssigned = (evId: string, t: string): ApiStaffMember[] => {
    try {
      const raw = localStorage.getItem(`eventTaskAssigned:${evId}:${t}`);
      const parsed = raw ? (JSON.parse(raw) as ApiStaffMember[]) : [];
      return parsed.map((s) => ({ ...s, id: String(s.id) }));
    } catch {
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const list = await getAssignments(id);
        const normalized = (list as ApiStaffMember[]).map((s) => ({ ...s, id: String(s.id) }));
        setAssignedStaff(normalized);
      } catch (_) {
        setAssignedStaff([]);
      }
    })();
  }, [id]);

  // Charger le personnel depuis l'API (scopé à l'entreprise)
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const list = await getAvailableStaffForEvent(id);
        const normalized = (list as ApiStaffMember[]).map((s) => ({ ...s, id: String(s.id) }));
        setAllStaff(normalized);
        const uniqueRoles = Array.from(new Set(normalized.map((s) => s.role).filter((r): r is string => !!r)));
        setRoles(uniqueRoles);
      } catch {
        setAllStaff([]);
        setRoles([]);
      }
    })();
  }, [id]);

  // Recalculer les disponibles quand la liste ou les assignés changent
  useEffect(() => {
    const savedIds = new Set(assignedStaff.map((s) => s.id));
    setAvailableStaff(allStaff.filter((m) => !savedIds.has(m.id)));
  }, [allStaff, assignedStaff]);

  useEffect(() => {
    const source: ApiStaffMember[] = task ? assignedStaff : availableStaff;
    const uniqueRoles = Array.from(new Set(source.map((s) => s.role).filter((r): r is string => !!r)));
    setRoles(uniqueRoles);
  }, [task, assignedStaff, availableStaff]);

  // Charger le titre de l'événement depuis l'API
  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const ev = await getEvent(id);
        setEventTitle(ev.title || "Événement");
      } catch {
        setEventTitle("Événement");
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id || !selectedTask) {
        setTaskAssignedStaff([]);
        return;
      }
      try {
        const list = await getTaskAssignments(id, selectedTask.id);
        const normalized = (list as ApiStaffMember[]).map((s) => ({ ...s, id: String(s.id) }));
        setTaskAssignedStaff(normalized);
      } catch (_) {
        setTaskAssignedStaff([]);
      }
    })();
  }, [id, selectedTask]);

  const blockedIds = useMemo(() => {
    if (!id || !task) return new Set<string>();
    const incompatible = incompatibleMap[task] || [];
    const ids = new Set<string>();
    incompatible.forEach((t) => {
      const arr = readTaskAssigned(id, t);
      arr.forEach((m) => ids.add(m.id));
    });
    return ids;
  }, [id, task]);

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const source: ApiStaffMember[] = task
      ? assignedStaff.filter((m) => !taskAssignedStaff.some((t) => t.id === m.id))
      : availableStaff;
    return source.filter((member) => {
      if (blockedIds.has(member.id)) return false;
      const matchesRole = roleFilter === "tous" ? true : (member.role || "").toLowerCase() === roleFilter.toLowerCase();
      if (!term) return matchesRole;
      return matchesRole && member.name.toLowerCase().includes(term);
    });
  }, [task, availableStaff, assignedStaff, taskAssignedStaff, searchTerm, roleFilter, blockedIds]);

  const handleAssign = async (member: ApiStaffMember) => {
    if (task) {
      if (blockedIds.has(member.id)) return;
      if (!id || !selectedTask) return;
      try {
        const created = await addTaskAssignment(id, selectedTask.id, member.id);
        const normalized = { ...(created as ApiStaffMember), id: String((created as ApiStaffMember).id) };
        setTaskAssignedStaff((prev) => [...prev, normalized]);
      } catch (_) {
        // noop
      }
    } else {
      if (!id) return;
      try {
        const created = await addAssignment(id, member.id);
        const normalized = { ...(created as ApiStaffMember), id: String((created as ApiStaffMember).id) };
        setAssignedStaff((prev) => [...prev, normalized]);
        setAvailableStaff((prev) => prev.filter((m) => m.id !== member.id));
      } catch (_) {
        // noop: on pourrait afficher une alerte si besoin
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">{eventTitle}</h1>
            {taskLabel && (
              <Badge className="bg-primary text-white">Tâche: {taskLabel}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {taskLabel ? `Assignez vos employés pour ${taskLabel}.` : "Assignez vos employés à cet événement."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/admin/events/${id}/manage`)}
        >
          Retour
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Employés disponibles</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé par nom..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrer par poste"
                className="border border-border rounded-md px-4 py-2 text-sm bg-background"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value || "tous")
                }
              >
                <option value="tous">Tous les postes</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun employé disponible avec ces critères.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <Card
                  key={member.id}
                  className="border border-border hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {member.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full bg-primary hover:bg-primary-hover text-white"
                      onClick={() => handleAssign(member)}
                    >
                      {taskLabel ? "Assigner à la tâche" : "Assigner à l'événement"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {taskLabel && assignedStaff.length === 0 && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Aucun personnel n'est encore assigné à l'événement. Assignez d'abord des personnes pour pouvoir les affecter à cette tâche.
            </div>
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover text-white"
              onClick={() => navigate(`/admin/events/${id}/staff`)}
            >
              Assigner du personnel à l'événement
            </Button>
          </CardContent>
        </Card>
      )}

      {taskLabel ? (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Employés assignés à la tâche {taskLabel}</h2>
          </CardHeader>
          <CardContent>
            {taskAssignedStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun employé n'est encore assigné à cette tâche.</p>
            ) : (
              <ul className="text-sm space-y-1 text-muted-foreground">
                {taskAssignedStaff.map((member) => (
                  <li key={member.id}>
                    {member.name} - {member.role}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        assignedStaff.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-foreground">Employés déjà assignés à l'événement</h2>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {assignedStaff.map((member) => (
                  <li key={member.id}>
                    {member.name} - {member.role}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};

export default EventStaff;
