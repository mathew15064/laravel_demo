<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
    ];

    protected $casts = [
        'world_x' => 'float',
        'world_z' => 'float',
        'radius' => 'float',
        'seed' => 'integer',
    ];

    protected $appends = [
        'population',
    ];

    protected static function booted(): void
    {
        static::creating(function (Island $island) {
            if (empty($island->slug)) {
                $island->slug = Str::slug($island->name) . '-' . Str::random(5);
            }
        });
    }

    public function citizens(): HasMany
    {
        return $this->hasMany(Citizen::class);
    }

    /**
     * Population includes living & drowning citizens currently assigned to this island.
     * Dead citizens are excluded.
     */
    public function getPopulationAttribute(): int
    {
        return $this->citizens()
            ->whereIn('status', ['alive', 'drowning'])
            ->count();
    }
}
