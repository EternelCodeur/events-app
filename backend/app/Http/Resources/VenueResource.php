<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VenueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'folderPath' => $this->folder_path,
            'capacity' => (int) $this->capacity,
            'location' => $this->location,
            'status' => $this->status,
            'area' => $this->area,
        ];
    }
}
