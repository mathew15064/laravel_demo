<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Citizen extends Model
{
    use HasFactory;

    public const SKIN_TONE_PALETTE = [
        '#F2D6CB',
        '#E8C2A4',
        '#DFAF83',
        '#C98E64',
        '#AB6B47',
        '#875137',
        '#633B2A',
    ];

    public const CLOTHING_PALETTE = [
        '#3b82f6', // blue
        '#10b981', // emerald
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#14b8a6', // teal
    ];

    protected $fillable = [
        'island_id',
        'created_by_god_id',
        'name',
        'status',
        'skin_tone',
        'clothing_color',
        'position_x',
        'position_y',
        'position_z',
        'last_island_id',
        'death_reason',
    ];

    protected $casts = [
        'position_x' => 'float',
        'position_y' => 'float',
        'position_z' => 'float',
    ];

    protected static function booted(): void
    {
        static::creating(function (Citizen $citizen) {
            if (empty($citizen->skin_tone)) {
                $citizen->skin_tone = self::randomSkinTone();
            }
            if (empty($citizen->clothing_color)) {
                $citizen->clothing_color = self::randomClothingColor();
            }
        });
    }

    public static function randomSkinTone(): string
    {
        return self::SKIN_TONE_PALETTE[array_rand(self::SKIN_TONE_PALETTE)];
    }

    public static function randomClothingColor(): string
    {
        return self::CLOTHING_PALETTE[array_rand(self::CLOTHING_PALETTE)];
    }

    public function island(): BelongsTo
    {
        return $this->belongsTo(Island::class);
    }

    public function lastIsland(): BelongsTo
    {
        return $this->belongsTo(Island::class, 'last_island_id');
    }

    public function god(): BelongsTo
    {
        return $this->belongsTo(God::class, 'created_by_god_id');
    }
}
