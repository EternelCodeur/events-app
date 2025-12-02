<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'file_path',
        'original_name',
        'mime_type',
        'size',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
