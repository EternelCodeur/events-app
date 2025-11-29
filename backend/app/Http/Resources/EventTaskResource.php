<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventTaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'eventId' => (string) $this->event_id,
            'name' => (string) $this->name,
            'slug' => (string) $this->slug,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
