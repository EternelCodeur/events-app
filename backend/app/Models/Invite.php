<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invite extends Model
{
    use HasFactory;

    protected $fillable = [
        'entreprise_id',
        'event_id',
        'event_table_id',
        'nom',
        'prenom',
        'telephone',
        'personnes',
        'statut',
        'present',
        'heure_arrivee',
        'notes',
        'additional_guests',
    ];

    protected $casts = [
        'present' => 'boolean',
        'additional_guests' => 'array',
    ];

    public function entreprise()
    {
        return $this->belongsTo(Entreprise::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function table()
    {
        return $this->belongsTo(EventTable::class, 'event_table_id');
    }
}
