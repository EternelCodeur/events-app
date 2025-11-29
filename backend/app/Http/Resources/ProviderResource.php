<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProviderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $amount = (int) ($this->amount_cfa ?? 0);
        $advance = (int) ($this->advance_cfa ?? 0);
        $rest = max($amount - $advance, 0);
        return [
            'id' => (string) $this->id,
            'eventId' => (string) $this->event_id,
            'type' => $this->type,
            'designation' => $this->designation,
            'amountCfa' => $amount,
            'advanceCfa' => $advance,
            'restToPayCfa' => $rest,
            'comments' => $this->comments,
            'contact' => $this->contact,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
