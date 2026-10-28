import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: {
        timeout: 5000,
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:8008',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'php artisan serve --host=127.0.0.1 --port=8008',
            url: 'http://127.0.0.1:8008/health',
            reuseExistingServer: !process.env.CI,
            timeout: 15000,
        },
        {
            command: 'node server/realtime-server.js',
            port: 8089,
            reuseExistingServer: !process.env.CI,
            timeout: 15000,
        },
    ],
});
