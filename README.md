# DeployLab — See Every Layer Behind a Web Request

DeployLab is a technical seminar platform designed to teach full-stack Linux, Apache, PHP-FPM, Laravel, MySQL, and Redis request flow debugging.

---

## 1. System Requirements

* **PHP 8.4+** (with `bcmath`, `curl`, `mbstring`, `mysqlnd`, `openssl`, `pdo_sqlite`, `pdo_mysql`, `redis`, `xml`, `zip`)
* **Composer 2.2+**
* **Node.js 20+** / **npm 10+**
* **Chromium** (for automated Playwright tests)

---

## 2. Fresh Local Setup

Clone and initialize the local environment with a single command sequence:

```bash
# 1. Install PHP dependencies
composer install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# 3. Install frontend dependencies and compile assets
npm install
npm run build

# 4. Prepare local SQLite database and seed demo inquiries
touch database/database.sqlite
php artisan migrate:fresh --seed
```

---

## 3. Running the Application

To start the local development server:

```bash
php artisan serve --host=127.0.0.1 --port=8008
```

Access the landing page in your browser at:
```text
http://127.0.0.1:8008
```

---

## 4. Automated Testing

### Laravel PHPUnit Feature Tests
Verifies homepage rendering, isolated `/health` checks, `/api/status` multi-layer diagnostics, CSRF enforcement, and Eloquent persistence:

```bash
php artisan test
```

### Playwright E2E Functional Tests
Launches headless Chromium, validates DOM rendering, Three.js WebGL canvas attachment, interactive layer tab transitions, and form validation:

```bash
npm run test:e2e
```

### Visual Verification Screenshots
Captures full-page and hero screenshots across all three mandatory device viewports:

```bash
npm run test:visual
```

Output screenshots are stored in:
```text
artifacts/screenshots/
├── landing-375.png    # Mobile (375x812)
├── landing-768.png    # Tablet (768x1024)
├── landing-1440.png   # Desktop (1440x1000)
├── hero-375.png
├── hero-768.png
└── hero-1440.png
```

---

## 5. Environment Configurations

### Local Baseline (Development & CI)
The local environment has zero external service dependencies:
* **Database**: `sqlite` (`database/database.sqlite`)
* **Cache**: `file`
* **Session**: `file`
* **Queue**: `database`

### Target VPS Production Environment
The seminar application is pre-configured for seamless transition to full infrastructure services:
* **Web Server**: Apache 2.4 with `mod_proxy_fcgi` and Certbot TLS
* **Runtime**: PHP-FPM 8.4 via `/run/php/php8.4-fpm.sock`
* **Database**: MySQL 8.x via PDO
* **Cache & Sessions**: Redis 7.x via `phpredis` extension

Refer to `docs/VPS_DEPLOYMENT_NOTES.md` and `docs/SEMINAR_DEBUG_MAP.md` for complete architecture diagrams and failure injection recipes.
