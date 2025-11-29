<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => (string) $this->title,
            'folderPath' => $this->folder_path,
            'date' => (string) $this->date,
            'startTime' => $this->start_time ? substr((string) $this->start_time, 0, 5) : null,
            'endTime' => $this->end_time ? substr((string) $this->end_time, 0, 5) : null,
            'venue' => $this->venue_id ? (string) $this->venue_id : '',
            'guests' => (int) ($this->guests ?? 0),
            'status' => (string) $this->status,
            'budget' => $this->budget,
            'capacity' => (int) ($this->guests ?? 0),
            'eventType' => $this->event_type,
            'areaChoice' => $this->area_choice,
            'mariageInteriorSubtype' => $this->mariage_interior_subtype,
            'mariageExteriorSubtype' => $this->mariage_exterior_subtype,
        ];
    }
}
