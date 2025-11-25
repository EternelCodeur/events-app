<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'name_slug',
        'name',
        'email',
        'phone',
        'admin_name',
        'status',
    ];
}
