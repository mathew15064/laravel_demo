# VPS Deployment Notes — DeployLab

This guide details the target production architecture and manual deployment procedure for the DeployLab seminar application on an Ubuntu 24.04 VPS.

---

## 1. Intended Production Architecture

```text
               Internet (Client Browser)
                          │
                          ▼
                  DNS Resolution (A / AAAA)
                          │
                          ▼
            VPS Host Firewall (UFW: 80, 443)
                          │
                          ▼
             Apache 2.4 (Reverse Proxy / Web Server)
            ┌───────────────────────────────────────┐
            │ • TLS Termination (Certbot / SSL)     │
            │ • Static Asset Serving (public/build) │
            │ • FastCGI ProxyPass via unix socket   │
            └───────────────────────────────────────┘
                          │
            proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost
                          │
                          ▼
                  PHP-FPM 8.4 Pool
            ┌───────────────────────────────────────┐
            │ • Process Manager (dynamic pool)       │
            │ • Bytecode Cache (OPcache enabled)    │
            │ • Execution of public/index.php       │
            └───────────────────────────────────────┘
                          │
                          ▼
             Laravel 13 Application Core
            ┌───────────────────────────────────────┐
            │ • Routing Pipeline & Middleware       │
            │ • Service Container & Form Requests   │
            │ • Blade View Rendering                │
            └───────────────────────────────────────┘
                     │                 │
                     ▼                 ▼
          MySQL 8 (Relational DB)   Redis 7 (In-Memory Cache)
          ┌─────────────────────┐   ┌───────────────────────┐
          │ • Host: 127.0.0.1   │   │ • Host: 127.0.0.1     │
          │ • Port: 3306        │   │ • Port: 6379          │
          │ • DB: deploylab     │   │ • Client: phpredis    │
          │ • Persistent data   │   │ • Telemetry / Session │
          └─────────────────────┘   └───────────────────────┘
```

---

## 2. Directory Structure & Permissions

The target project path on the VPS:
```text
/var/www/deploylab
```

### Critical DocumentRoot Requirement
Apache's `DocumentRoot` directive **MUST** point to the `public/` directory, never the repository root:
```apache
DocumentRoot /var/www/deploylab/public
```

### Writable Directories
The web server and PHP-FPM user (`www-data`) must have write permissions to:
1. `storage/` (logs, framework sessions, cache, views)
2. `bootstrap/cache/` (cached configuration, routes, services)

Setup commands:
```bash
sudo chown -R deploylab:www-data /var/www/deploylab
sudo chmod -R 775 /var/www/deploylab/storage
sudo chmod -R 775 /var/www/deploylab/bootstrap/cache
```

---

## 3. Environment Configuration (`.env.vps`)

Copy `.env.vps.example` to `.env`:
```bash
cp .env.vps.example .env
```

Ensure production values are set:
```dotenv
APP_NAME=DeployLab
APP_ENV=production
APP_DEBUG=false
APP_URL=https://deploylab.example.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=deploylab
DB_USERNAME=deploylab
DB_PASSWORD=YOUR_STRONG_PASSWORD

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## 4. Production Build & Deployment Sequence

Execute these steps on the VPS during manual deployment:

```bash
# 1. Pull latest code
cd /var/www/deploylab

# 2. Install PHP production dependencies
composer install --no-dev --optimize-autoloader

# 3. Build frontend assets locally
npm ci
npm run build

# 4. Generate app key if needed
php artisan key:generate --force

# 5. Run database migrations
php artisan migrate --force

# 6. Optimize framework caches for production performance
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 7. Restart PHP-FPM to clear OPcache
sudo systemctl restart php8.4-fpm
sudo systemctl reload apache2
```

---

## 5. Apache VirtualHost Specification (Future Setup)

For reference, the Apache site configuration (`/etc/apache2/sites-available/deploylab.conf`):

```apache
<VirtualHost *:80>
    ServerName deploylab.example.com
    DocumentRoot /var/www/deploylab/public

    <Directory /var/www/deploylab/public>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Forward PHP execution to PHP-FPM 8.4 unix socket
    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.4-fpm.sock|fcgi://localhost"
    </FilesMatch>

    ErrorLog ${APACHE_LOG_DIR}/deploylab_error.log
    CustomLog ${APACHE_LOG_DIR}/deploylab_access.log combined
</VirtualHost>
```

HTTPS will subsequently be enabled via Certbot:
```bash
sudo certbot --apache -d deploylab.example.com
```
