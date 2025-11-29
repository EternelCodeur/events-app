<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Provider extends Model
{
    use HasFactory;

    protected $fillable = [
        'entreprise_id',
        'event_id',
        'type',
        'designation',
        'amount_cfa',
        'advance_cfa',
        'comments',
        'contact',
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
