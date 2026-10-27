<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rescue extends Model
{
    use HasFactory;

    protected $fillable = [
        'citizen_id',
        'rescued_by_god_id',
        'citizen_owner_god_id',
        'island_id',
        'rescued_at',
    ];

    protected $casts = [
        'rescued_at' => 'datetime',
    ];

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(Citizen::class);
    }

    public function savior(): BelongsTo
    {
        return $this->belongsTo(God::class, 'rescued_by_god_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(God::class, 'citizen_owner_god_id');
    }

    public function island(): BelongsTo
    {
        return $this->belongsTo(Island::class);
    }
}
