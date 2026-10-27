<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DeployLabTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test homepage loads with HTTP 200 and renders game container.
     */
    public function test_homepage_returns_successful_response_and_renders(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('Thiên Đường Quần Đảo');
        $response->assertSee('game-canvas-container');
        $response->assertSee('god-welcome-overlay');
        $response->assertSee('drowning-alerts-container');
    }

    /**
     * Test /world alias endpoint also renders game shell.
     */
    public function test_world_alias_endpoint_renders_game_shell(): void
    {
        $response = $this->get('/world');

        $response->assertStatus(200);
        $response->assertSee('Thiên Đường Quần Đảo');
        $response->assertSee('game-canvas-container');
    }

    /**
     * Test /health endpoint returns lightweight OK status without database coupling.
     */
    public function test_health_endpoint_returns_expected_structure(): void
    {
        $response = $this->get('/health');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'ok',
            'application' => 'DeployLab',
        ]);
        $response->assertJsonStructure([
            'status',
            'application',
            'runtime',
            'timestamp',
        ]);
    }

    /**
     * Test /api/status returns independent dependency health.
     */
    public function test_dependency_status_endpoint_returns_healthy_status(): void
    {
        $response = $this->get('/api/status');

        $response->assertStatus(200);
        $response->assertJson([
            'application' => 'ok',
            'database' => 'ok',
            'cache' => 'ok',
        ]);
        $response->assertJsonStructure([
            'application',
            'database',
            'cache',
            'details' => [
                'environment',
                'database_driver',
                'cache_store',
                'timestamp',
            ],
        ]);
    }

    /**
     * Test valid contact form submission persists Inquiry in database and redirects.
     */
    public function test_valid_contact_submission_persists_inquiry(): void
    {
        $payload = [
            'name' => 'Jordan Wright',
            'email' => 'jordan@secops.io',
            'message' => 'Registering for the Apache vs PHP-FPM fastcgi proxy troubleshooting lab.',
        ];

        $response = $this->post('/contact', $payload);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('inquiries', [
            'name' => 'Jordan Wright',
            'email' => 'jordan@secops.io',
        ]);
    }

    /**
     * Test AJAX contact form submission returns JSON with 201 Created.
     */
    public function test_valid_ajax_contact_submission_returns_json_response(): void
    {
        $payload = [
            'name' => 'Elena Rostova',
            'email' => 'elena@cloudinfra.net',
            'message' => 'Looking forward to MySQL InnoDB lock contention and Redis failover analysis.',
        ];

        $response = $this->postJson('/contact', $payload);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
        ]);
        $response->assertJsonStructure([
            'success',
            'message',
            'inquiry' => [
                'id',
                'name',
                'email',
                'created_at',
            ],
        ]);

        $this->assertDatabaseHas('inquiries', [
            'name' => 'Elena Rostova',
            'email' => 'elena@cloudinfra.net',
        ]);
    }

    /**
     * Test contact submission fails validation when fields are missing.
     */
    public function test_contact_submission_fails_when_required_fields_missing(): void
    {
        $response = $this->post('/contact', []);

        $response->assertSessionHasErrors(['name', 'email', 'message']);
        $this->assertDatabaseCount('inquiries', 0);
    }

    /**
     * Test contact submission fails validation with invalid email format.
     */
    public function test_contact_submission_fails_with_invalid_email(): void
    {
        $payload = [
            'name' => 'Test User',
            'email' => 'not-a-valid-email',
            'message' => 'Valid message content for the seminar.',
        ];

        $response = $this->postJson('/contact', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    /**
     * Test contact submission fails with message that is too short.
     */
    public function test_contact_submission_fails_with_too_short_message(): void
    {
        $payload = [
            'name' => 'Test User',
            'email' => 'valid@example.com',
            'message' => 'Hi',
        ];

        $response = $this->postJson('/contact', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['message']);
    }
}
