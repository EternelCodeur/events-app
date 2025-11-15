import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";

const mockEvents = [
  { id: "1", title: "Mariage Dupont" },
  { id: "2", title: "Conférence Tech 2025" },
  { id: "3", title: "Gala Entreprise ABC" },
];

const roles = [
  "Maître d'hôtel",
  "Serveurs",
  "Hôtesses",
  "Plonge",
  "Vestiaire",
  "Sécurité",
  "Autres",
] as const;

type StaffRole = (typeof roles)[number];

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
}

const initialStaff: StaffMember[] = [
  { id: "s1", name: "Alice Martin", role: "Maître d'hôtel" },
  { id: "s2", name: "Bruno Lopez", role: "Serveurs" },
  { id: "s3", name: "Carla Dubois", role: "Hôtesses" },
  { id: "s4", name: "David Morel", role: "Sécurité" },
  { id: "s5", name: "Emma Rossi", role: "Vestiaire" },
  { id: "s6", name: "Fabrice Jean", role: "Plonge" },
  { id: "s7", name: "Giselle Kone", role: "Autres" },
];

const EventStaff = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const event = mockEvents.find((e) => e.id === id);

  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>(initialStaff);
  const [assignedStaff, setAssignedStaff] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "tous">("tous");

  const filteredStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return availableStaff.filter((member) => {
      const matchesRole = roleFilter === "tous" ? true : member.role === roleFilter;
      if (!term) return matchesRole;
      return (
        matchesRole &&
        member.name.toLowerCase().includes(term)
      );
    });
  }, [availableStaff, searchTerm, roleFilter]);

  const handleAssign = (member: StaffMember) => {
    setAssignedStaff((prev) => [...prev, member]);
    setAvailableStaff((prev) => prev.filter((m) => m.id !== member.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {event ? event.title : "Événement inconnu"}
          </h1>
          <p className="text-muted-foreground">
            Assignez vos employés à cet événement.
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
                  setRoleFilter(
                    (e.target.value as StaffRole | "tous") || "tous",
                  )
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
                      Assigner à l'événement
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {assignedStaff.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              Employés déjà assignés
            </h2>
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
      )}
    </div>
  );
};

export default EventStaff;
