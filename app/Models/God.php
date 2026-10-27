<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class God extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'name',
        'rescued_count',
    ];

    protected static function booted(): void
    {
        static::creating(function (God $god) {
            if (empty($god->uuid)) {
                $god->uuid = (string) Str::uuid();
            }
        });
    }

    public function citizens(): HasMany
    {
        return $this->hasMany(Citizen::class, 'created_by_god_id');
    }

    /**
     * Compute real-time God statistics.
     */
    public function getStatsAttribute(): array
    {
        $created = $this->citizens()->count();
        $alive = $this->citizens()->where('status', 'alive')->count();
        $drowned = $this->citizens()->where('status', 'dead')->where('death_reason', 'drowned')->count();
        $rescued = $this->rescued_count;
        $governedIslands = $this->citizens()
            ->whereIn('status', ['alive', 'drowning'])
            ->whereNotNull('island_id')
            ->distinct('island_id')
            ->count('island_id');

        return [
            'created' => $created,
            'alive' => $alive,
            'rescued' => $rescued,
            'drowned' => $drowned,
            'islands_governed' => $governedIslands,
        ];
    }
}
