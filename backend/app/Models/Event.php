<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'entreprise_id',
        'venue_id',
        'title',
        'folder_path',
        'date',
        'start_time',
        'end_time',
        'guests',
        'budget',
        'status',
        'event_type',
        'area_choice',
        'mariage_interior_subtype',
        'mariage_exterior_subtype',
    ];

    public function entreprise(): BelongsTo
    {
        return $this->belongsTo(Entreprise::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }
}
