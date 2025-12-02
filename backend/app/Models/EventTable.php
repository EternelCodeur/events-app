<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventTable extends Model
{
    use HasFactory;

    protected $fillable = [
        'entreprise_id',
        'event_id',
        'name',
        'capacity',
        'status',
    ];

    public function entreprise()
    {
        return $this->belongsTo(Entreprise::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
