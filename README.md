# Paradise Gods (Thiên Đường Quần Đảo) — Seminar Demo Application

**Paradise Gods** is a playable 3D miniature god-game built with **Laravel 13**, **PHP 8.4**, **Three.js** (npm-bundled via Vite), and **Tailwind CSS**.

The project is designed as an interactive application for a live technical seminar covering:
* **DNS & Network Debugging**
* **Apache & VirtualHost Configuration**
* **PHP-FPM 8.4 Pool Debugging**
* **Laravel Runtime & Configuration Debugging**
* **MySQL 8+ Contention & Outage Recovery**
* **Redis Cache & Session Debugging**
* **HTTPS & Certbot Troubleshooting**

The core game experience allows the visitor to become a God, manage an archipelago of islands, create and customize citizens, throw them across islands or into the ocean, manage active drowning countdowns, and witness the dramatic **3D Volcano Failure World** when backend data services are severed.

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

# 4. Prepare local SQLite database and seed initial archipelago
touch database/database.sqlite
php artisan migrate:fresh --seed
```

---

## 3. Running the Application

To start the local development server:

```bash
php artisan serve --host=127.0.0.1 --port=8008
```

Access the game in your browser at:
```text
http://127.0.0.1:8008/
```
(or `/world`)

---

## 4. In-Game God Controls & Seminar Mechanics

1. **God Identity**: First-time visitors enter their God name (e.g. `Thần Huynh`). A persistent UUID is generated and stored in `localStorage` (`paradise_god_uuid`). Returning visitors are greeted and resume control immediately.
2. **God Statistics & Renaming**: Clicking the HUD God badge opens the God Profile showing:
   * Citizens created (`Dân đã tạo`)
   * Living citizens (`Đang sống`)
   * Rescued citizens (`Đã cứu`)
   * Drowned citizens (`Đã chết đuối`)
   * An inline form to rename the God.
3. **Island Interaction**: Clicking any island opens the Island context panel with current population, rename capability, camera focus, and citizen creation.
4. **Citizen Life & Throwing**:
   * Citizens are spawned with persistent random natural skin tones (`#F2D6CB`–`#633B2A`) and clothing palettes.
   * Clicking a citizen opens their profile card and allows picking them up.
   * Gods can drag and throw citizens across islands or into the ocean along realistic parabolic arcs.
5. **Drowning & Rescue Loop**:
   * Falling into the ocean triggers splash particles, expanding ripples, and switches status to `drowning`.
   * A 3.0-second countdown alert appears with a live `[ CỨU {Name} ]` action button.
   * Clicking rescue flies the citizen back to dry land, increments God rescue stats, and preserves world population.
   * If the timer reaches 0, the citizen sinks, status transitions to `dead`, death reason records `drowned`, and population decrements.
6. **Volcano Failure World (Seminar Database Failure)**:
   * If MySQL / SQLite becomes unreachable, the decoupled Blade shell still loads and detects a 503 from `/api/world`.
   * The scene transforms into a dramatic **Volcano Failure World** (dark red skies, smoking volcanic cone, bubbling lava, embers) with the diagnostic alert `"KHÔNG THỂ KẾT NỐI TỚI THIÊN ĐƯỜNG — DATA LAYER OFFLINE"`.
   * Clicking `[ THỬ KẾT NỐI LẠI ]` probes `/api/health/database` and automatically restores the tropical archipelago when the database is repaired.

---

## 5. Automated Testing & Verification

### Laravel Feature & Unit Tests (24 tests)
```bash
php artisan test
```

### Playwright End-to-End Tests (10 tests)
Verifies God registration, persistence across reloads, stats tracking, island creation, citizen throwing/rescue, drowning expiration, and volcano failover/recovery:
```bash
npx playwright test
```

### Visual Verification Screenshots (10 required captures)
Captures high-resolution visual evidence across all required viewports and game states:
```bash
node tests/e2e/capture-game-screenshots.js
```

Generated screenshots:
* `artifacts/screenshots/welcome-god.png`: First-time cinematic God welcome modal with name input.
* `artifacts/screenshots/world-1440.png`: Desktop 1440x900 archipelago view with HUD and living citizens.
* `artifacts/screenshots/world-1024.png`: Tablet landscape (1024x768) responsive view.
* `artifacts/screenshots/world-768.png`: Tablet portrait (768x1024) responsive view.
* `artifacts/screenshots/world-375.png`: Mobile (375x667) responsive view.
* `artifacts/screenshots/island-selected.png`: Island selection panel with population and actions.
* `artifacts/screenshots/citizen-selected.png`: Citizen card showing skin tone swatch and status.
* `artifacts/screenshots/citizen-drowning.png`: Ocean drowning event with active countdown alert.
* `artifacts/screenshots/citizen-rescued.png`: Rescued citizen returning safely to land.
* `artifacts/screenshots/database-failure-volcano.png`: Catastrophic 3D Volcano scene during data layer failure.

---

## 6. Seminar Reset Command

To restore the archipelago and seed data back to the clean deterministic state during a live seminar:

```bash
php artisan world:reset
```
