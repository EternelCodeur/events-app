<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendances';

    protected $fillable = [
        'entreprise_id',
        'event_id',
        'staff_id',
        'arrived_at',
        'departed_at',
        'arrival_signature_path',
        'departure_signature_path',
    ];
}
