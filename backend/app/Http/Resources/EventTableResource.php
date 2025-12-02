<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventTableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'eventId' => (string) $this->event_id,
            'name' => (string) $this->name,
            'capacity' => (int) $this->capacity,
            'status' => (string) $this->status,
        ];
    }
}
