<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class WebSocketUrlConfigurationTest extends TestCase
{
    protected function tearDown(): void
    {
        Artisan::call('optimize:clear');
        parent::tearDown();
    }

    /**
     * Case A: Environment configuration through config/services.php
     * services.realtime.ws_url resolves accurately from configuration.
     */
    public function test_case_a_environment_config_resolves_ws_url(): void
    {
        Config::set('services.realtime.ws_url', 'wss://example.test/ws/');

        $this->assertSame('wss://example.test/ws/', config('services.realtime.ws_url'));
    }

    /**
     * Case B: Blade template outputs the configured WebSocket URL in meta tag.
     */
    public function test_case_b_blade_renders_configured_ws_url_meta_tag(): void
    {
        Config::set('services.realtime.ws_url', 'wss://example.test/ws/');

        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('<meta name="ws-url" content="wss://example.test/ws/">', false);
        $response->assertDontSee('ws://127.0.0.1:8089', false);
    }

    /**
     * Case C: Production configuration cache preserves the WebSocket URL in Blade.
     */
    public function test_case_c_production_config_cache_preserves_blade_rendering(): void
    {
        Artisan::call('config:cache');

        $expectedUrl = config('services.realtime.ws_url');
        $this->assertNotEmpty($expectedUrl);
        $this->assertSame('wss://alive.locallhost.shop/ws/', $expectedUrl);

        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertSee('<meta name="ws-url" content="'.$expectedUrl.'">', false);
        $response->assertDontSee('ws://127.0.0.1:8089', false);
    }

    /**
     * Case D: When meta tag is absent or null, fallback derives safe same-origin URL, never loopback.
     */
    public function test_case_d_safe_fallback_when_config_is_null_derives_same_origin(): void
    {
        Config::set('services.realtime.ws_url', null);

        $response = $this->get('http://remote-client.example.com/');
        $response->assertStatus(200);

        // Safe fallback derives same-origin ws://remote-client.example.com/ws/
        $response->assertSee('<meta name="ws-url" content="ws://remote-client.example.com/ws/">', false);
        $response->assertDontSee('ws://127.0.0.1:8089', false);
    }

    /**
     * Case E: HTTPS request with null config derives secure wss:// scheme.
     */
    public function test_case_e_secure_https_derives_wss_same_origin_fallback(): void
    {
        Config::set('services.realtime.ws_url', null);

        $response = $this->get('https://secure-gods.example.com/');
        $response->assertStatus(200);

        $response->assertSee('<meta name="ws-url" content="wss://secure-gods.example.com/ws/">', false);
        $response->assertDontSee('http://', false);
        $response->assertDontSee('ws://127.0.0.1:8089', false);
    }
}
