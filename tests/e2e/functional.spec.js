import { test, expect } from '@playwright/test';

test.describe('DeployLab Backend & API Endpoints', () => {
    test('/health endpoint returns lightweight OK response', async ({ request }) => {
        const res = await request.get('/health');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.status).toBe('ok');
        expect(data.runtime).toContain('PHP 8.4');
    });

    test('/api/status returns independent dependency health breakdown', async ({ request }) => {
        const res = await request.get('/api/status');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.application).toBe('ok');
        expect(data.database).toBe('ok');
        expect(data.cache).toBe('ok');
        expect(data.details).toBeDefined();
        expect(['sqlite', 'mysql']).toContain(data.details.database_driver);
    });

    test('POST /contact records real database inquiry with JSON API', async ({ request }) => {
        const res = await request.post('/contact', {
            data: {
                name: 'Morgan Vance',
                email: 'morgan@sre-team.org',
                message: 'Interested in real-time Redis memory eviction and Linux socket troubleshooting.',
            },
            headers: {
                'Accept': 'application/json',
            },
        });

        expect(res.status()).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.inquiry.name).toBe('Morgan Vance');
    });
});
