<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InviteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'nom' => (string) $this->nom,
            'prenom' => (string) $this->prenom,
            'telephone' => (string) $this->telephone,
            'personnes' => (int) $this->personnes,
            'table_id' => $this->event_table_id ? (int) $this->event_table_id : null,
            'table_name' => optional($this->table)->name,
            'statut' => (string) $this->statut,
            'present' => (bool) ($this->present ?? false),
            'heure_arrivee' => $this->heure_arrivee,
            'additionalGuests' => $this->additional_guests ?? [],
        ];
    }
}
