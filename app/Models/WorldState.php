<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorldState extends Model
{
    use HasFactory;

    protected $fillable = [
        'world_version',
    ];

    protected $casts = [
        'world_version' => 'integer',
    ];
}
