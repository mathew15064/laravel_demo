<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Island extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'world_x',
        'world_z',
        'radius',
        'type',
        'seed',
        'governed_by_god_id',
        'banner_name',
    ];

    protected $casts = [
        'world_x' => 'float',
        'world_z' => 'float',
        'radius' => 'float',
        'seed' => 'integer',
        'governed_by_god_id' => 'integer',
    ];

    protected $appends = [
        'population',
    ];

    protected static function booted(): void
    {
        static::creating(function (Island $island) {
            if (empty($island->slug)) {
                $island->slug = Str::slug($island->name).'-'.Str::random(5);
            }
        });
    }

    public function citizens(): HasMany
    {
        return $this->hasMany(Citizen::class);
    }

    public function governingGod(): BelongsTo
    {
        return $this->belongsTo(God::class, 'governed_by_god_id');
    }

    /**
     * Population includes living, drowning & held citizens currently assigned to this island.
     * Dead citizens are excluded.
     */
    public function getPopulationAttribute(): int
    {
        return $this->citizens()
            ->living()
            ->count();
    }
}
