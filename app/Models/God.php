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
        'god_color',
        'rescued_count',
        'citizens_created_count',
        'citizens_alive_count',
        'citizens_drowned_count',
        'other_gods_rescued_count',
        'rescued_by_others_count',
        'last_seen_at',
    ];

    protected $casts = [
        'rescued_count' => 'integer',
        'citizens_created_count' => 'integer',
        'citizens_alive_count' => 'integer',
        'citizens_drowned_count' => 'integer',
        'other_gods_rescued_count' => 'integer',
        'rescued_by_others_count' => 'integer',
        'last_seen_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (God $god) {
            if (empty($god->uuid)) {
                $god->uuid = (string) Str::uuid();
            }
            if (empty($god->god_color)) {
                $colors = ['#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#ec4899'];
                $god->god_color = $colors[array_rand($colors)];
            }
        });
    }

    public function citizens(): HasMany
    {
        return $this->hasMany(Citizen::class, 'created_by_god_id');
    }

    public function governedIslands(): HasMany
    {
        return $this->hasMany(Island::class, 'governed_by_god_id');
    }

    public function rescues(): HasMany
    {
        return $this->hasMany(Rescue::class, 'rescued_by_god_id');
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
        $governedIslands = Island::where('governed_by_god_id', $this->id)->count();

        return [
            'created' => $created,
            'alive' => $alive,
            'rescued' => $rescued,
            'drowned' => $drowned,
            'other_gods_rescued' => $this->other_gods_rescued_count,
            'rescued_by_others' => $this->rescued_by_others_count,
            'islands_governed' => $governedIslands,
            'god_color' => $this->god_color,
        ];
    }
}
