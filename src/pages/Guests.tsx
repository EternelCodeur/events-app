import { Plus, Search, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockGuests = [
  {
    id: "1",
    name: "Pierre Durand",
    email: "pierre.d@example.com",
    phone: "+33 6 11 22 33 44",
    event: "Mariage Dupont",
    status: "confirmed",
    table: "Table 5",
  },
  {
    id: "2",
    name: "Claire Martin",
    email: "claire.m@example.com",
    phone: "+33 6 22 33 44 55",
    event: "Mariage Dupont",
    status: "pending",
    table: "Table 3",
  },
  {
    id: "3",
    name: "Luc Bernard",
    email: "luc.b@example.com",
    phone: "+33 6 33 44 55 66",
    event: "Gala ABC",
    status: "confirmed",
    table: "Table 8",
  },
];

const statusColors = {
  confirmed: "bg-success hover:bg-success/90",
  pending: "bg-accent hover:bg-accent/90",
  declined: "bg-destructive hover:bg-destructive/90",
};

const statusLabels = {
  confirmed: "Confirmé",
  pending: "En attente",
  declined: "Décliné",
};

const Guests = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Invités</h1>
          <p className="text-muted-foreground">
            Gérez vos invités et leurs confirmations
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter invité
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un invité..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Guests Table */}
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">{guest.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{guest.email}</div>
                      <div className="text-muted-foreground">{guest.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{guest.event}</TableCell>
                  <TableCell>{guest.table}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[guest.status as keyof typeof statusColors]}>
                      {statusLabels[guest.status as keyof typeof statusLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Détails
                      </Button>
                      <Button size="sm" className="bg-primary hover:bg-primary-hover">
                        Éditer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Guests;
