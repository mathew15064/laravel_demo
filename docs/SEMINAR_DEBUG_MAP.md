# DeployLab — Seminar Debugging Map & Troubleshooting Guide

This map links the layers of the DeployLab architecture to planned failure injection scenarios and demonstrates how each endpoint is used to isolate root causes during live technical presentations.

---

## 1. Diagnostic Endpoints Matrix

| Endpoint | Protocol / Method | Dependencies | Diagnostic Role | Expected Baseline Response |
| :--- | :--- | :--- | :--- | :--- |
| **`/`** | HTTP GET | Apache, PHP-FPM, Laravel, Cache | End-to-end user request pipeline | HTTP 200, renders Blade + Three.js |
| **`/health`** | HTTP GET | Apache, PHP-FPM, Laravel Core | Lightweight runtime check; **zero DB/Redis coupling** | `{"status":"ok","application":"DeployLab"}` |
| **`/api/status`** | HTTP GET | Laravel, DB (PDO), Cache | Independent multi-tier dependency inspection | `{"application":"ok","database":"ok","cache":"ok"}` |
| **`/contact`** | HTTP POST | Laravel, Session, CSRF, MySQL DB | Write transaction verification | HTTP 201 Created / Session Redirect |

---

## 2. Layer-by-Layer Failure Injection Scenarios

### Layer 1: DNS & Ingress Network
* **Failure Trigger**: Stale DNS A-record, domain expired, or UFW firewall blocking ports:
  ```bash
  sudo ufw deny 443/tcp
  ```
* **Observed Symptom**: Client browser displays `ERR_NAME_NOT_RESOLVED`, `ERR_CONNECTION_REFUSED`, or hangs indefinitely during TCP handshake.
* **Diagnostic Proof**:
  - `dig +trace deploylab.example.com` → fails to return correct VPS IP.
  - `nc -zv <vps-ip> 443` → connection refused or timed out.
  - No entries appear in `/var/log/apache2/access.log`.

---

### Layer 2: TLS Termination / Certbot
* **Failure Trigger**: Expired Let's Encrypt certificate or corrupted SSL VirtualHost directives:
  ```bash
  # Broken SSLCertificateFile path in Apache conf
  ```
* **Observed Symptom**: Browser displays `SEC_ERROR_EXPIRED_CERTIFICATE` or `SSL_ERROR_RX_RECORD_TOO_LONG`. Plain HTTP (`:80`) continues to respond, while HTTPS (`:443`) throws handshake errors.
* **Diagnostic Proof**:
  - `curl -Iv https://deploylab.example.com` → reports handshake failure.
  - `curl -Iv http://deploylab.example.com` → succeeds.
  - `sudo certbot certificates` reveals expiration or mismatch.

---

### Layer 3: Apache 2.4 Web Server
* **Failure Trigger**: Apache stopped, wrong DocumentRoot (targeting repo root instead of `public/`), or broken `.htaccess` syntax:
  ```bash
  sudo systemctl stop apache2
  # Or pointing DocumentRoot to /var/www/deploylab instead of /var/www/deploylab/public
  ```
* **Observed Symptom**: 
  - If stopped: `ERR_CONNECTION_REFUSED`.
  - If wrong DocumentRoot: `403 Forbidden` (directory index of `/` is forbidden).
  - If broken `.htaccess`: `500 Internal Server Error` generated directly by Apache.
* **Diagnostic Proof**:
  - `apache2ctl -S` → reports VirtualHost configuration errors.
  - `sudo tail -n 30 /var/log/apache2/error.log`.
  - `/health` cannot be reached.

---

### Layer 4: PHP-FPM 8.4 Process Manager
* **Failure Trigger**: FPM service halted, UNIX socket permissions changed to root-only, or worker exhaustion:
  ```bash
  sudo systemctl stop php8.4-fpm
  # Or: sudo chmod 600 /run/php/php8.4-fpm.sock
  ```
* **Observed Symptom**: Apache returns **`502 Bad Gateway`** or **`503 Service Unavailable`** (`AH01079: failed to make connection to backend: httpd-UDS`).
* **Diagnostic Proof**:
  - Apache port 80/443 accepts TCP connections (`nc -zv localhost 80` succeeds).
  - Apache error log shows `proxy: No protocol handler was valid for the URL /index.php`.
  - `systemctl status php8.4-fpm` shows `inactive (dead)`.
  - Static assets (e.g. `public/build/assets/*.css`) still load with HTTP 200 via Apache, while dynamic routes fail with 502!

---

### Layer 5: Laravel Framework Runtime
* **Failure Trigger**: Missing `APP_KEY`, unwritable `storage/` directory, or corrupted cached configuration:
  ```bash
  sudo chmod -R 000 storage/ bootstrap/cache/
  ```
* **Observed Symptom**: Laravel outputs **`500 Server Error`** or blank white screen.
* **Diagnostic Proof**:
  - `/health` returns HTTP 500.
  - PHP-FPM is alive and executing `index.php`.
  - PHP-FPM error log reports `PHP Fatal error: Uncaught RuntimeException: The stream or file "/var/www/deploylab/storage/logs/laravel.log" could not be opened in append mode: Failed to open stream: Permission denied`.

---

### Layer 6: Relational Database (MySQL)
* **Failure Trigger**: MySQL stopped, connection pool full, or bad password in `.env`:
  ```bash
  sudo systemctl stop mysql
  ```
* **Observed Symptom**:
  - **`/health` responds with HTTP 200 OK!** (Proving PHP + Laravel runtime are healthy).
  - **Game Blade Shell (`/` or `/world`) renders with HTTP 200!** (Because the Blade shell is decoupled from database queries).
  - **`/api/world` returns HTTP 503** with code `DATABASE_UNAVAILABLE`.
  - **3D World Catastrophic Failover**: The Three.js scene switches from the peaceful tropical archipelago into the **Volcano Failure World** (dark red skies, smoking volcanic cone, pulsating lava, ash particles) with the diagnostic alert:
    ```text
    KHÔNG THỂ KẾT NỐI TỚI THIÊN ĐƯỜNG — DATA LAYER OFFLINE
    Seminar Diagnostic Notice: MySQL / SQLite database connection unreachable.
    [ THỬ KẾT NỐI LẠI ]
    ```
  - **`/api/status` returns HTTP 503**:
    ```json
    {
      "application": "ok",
      "database": "error",
      "cache": "ok"
    }
    ```
* **Diagnostic & Recovery Proof**:
  - The contrast between `/health` (working) and `/api/status` (database error) instantly isolates the issue to the database layer without guessing.
  - Restart MySQL: `sudo systemctl start mysql`.
  - Click `[ THỬ KẾT NỐI LẠI ]` in the browser: The diagnostic probe hits `/api/health/database`, recovers, and smoothly re-initializes the peaceful Paradise archipelago!

---

### Layer 7: In-Memory Cache (Redis)
* **Failure Trigger**: Redis daemon stopped, maxmemory limit hit with `noeviction`, or Redis port firewall drop:
  ```bash
  sudo systemctl stop redis
  ```
* **Observed Symptom**:
  - **`/health` responds with HTTP 200 OK!**
  - **`POST /contact` continues to succeed!** (MySQL is unaffected).
  - **`/api/status` reports cache degraded**:
    ```json
    {
      "application": "ok",
      "database": "ok",
      "cache": "error"
    }
    ```
  - Homepage request telemetry counter falls back gracefully to local default.
* **Diagnostic Proof**:
  - `redis-cli ping` fails (`Could not connect to Redis at 127.0.0.1:6379: Connection refused`).
  - Isolate cache failure without impacting transactional database writes.

---

## 3. Seminar Demonstration Sequence

During the live seminar, demonstrate in this exact sequence:
1. **Show Clean Baseline**: Show Three.js visualization, verify all systems operational on `/api/status`.
2. **Break Layer 4 (Kill PHP-FPM)**: Show Apache 502 vs static asset survival.
3. **Restore Layer 4 & Break Layer 6 (Stop MySQL)**: Show `/health` remaining 200 OK while `/api/status` alerts and `/contact` fails.
4. **Break Layer 7 (Stop Redis)**: Show database persisting while cache telemetry alerts.
5. **Restore All Layers**: Verify all tests pass.
