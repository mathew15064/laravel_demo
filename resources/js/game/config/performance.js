/**
 * Paradise Gods - Centralized Performance Configuration
 * Configures frame rates, network throttles, visual quality caps, and cull distances.
 */
export const PERFORMANCE_CONFIG = {
    // Rendering
    maxPixelRatio: 1.25,
    shadowMapSize: 1024,
    shadowCameraFar: 200,

    // Label culling
    maxVisibleLabels: 15,
    labelDistanceThresholdSq: 70 * 70, // 70 units

    // Subsystem update rates (milliseconds)
    ambientAiIntervalMs: 150,     // ~6.6 Hz citizen AI decision tick
    labelVisibilityIntervalMs: 350, // ~3 Hz label distance sort

    // Realtime Networking
    godNetworkIntervalMs: 100,    // 10 Hz
    godMovementThreshold: 0.04,   // minimum world-space distance delta to broadcast
    heldCitizenIntervalMs: 66,    // 15 Hz
    heldCitizenThreshold: 0.04,

    // Connection & Heartbeat
    heartbeatIntervalMs: 10000,   // 10 seconds
    reconnectNoticeDelayMs: 3000, // 3s silent reconnect
    reconnectDegradedDelayMs: 10000, // 10s degraded mode
    presenceTtlSeconds: 45,       // 45s in Redis
};
