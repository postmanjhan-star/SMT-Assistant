# Sentec SMT Assistant

- Fuji mounter material / slot checker
- Panasonic mounter material / slot checker

## Provision in staging machine

```sh
# Refer to Sente-Web README to provision machine first
# Install Node.js 18+
# Clone repository
$ cd /sentec-app/
$ git clone ssh://root@200.0.0.226:23/102573/SMT-Assistant.git
$ cd /sentec-app/SMT-Assistant/
$ git checkout --track origin/staging

# Install Node.js packages
$ npm install
$ npm run build:staging

# Porvision other Sentec apps.
# - Sentec Start
# - GE Warehouse Dashboard
# - SMT Assistant (the one we are working on)
# - WMS (codename Soda)
# - WMS-Web (codename Soda-Web)

# Start Caddy service
```

## Update staging deployment

```sh
# Pull updates from repository
$ cd /sentec-app/SMT-Assistant/
$ git checkout staging
$ git pull origin staging

# Install Node.js packages
$ npm install
$ npm run build:staging

# Restart Caddy service
$ sudo systemctl restart caddy.service
```

---

## Provision in production machine

```sh
# Refer to Sente-Web README to provision machine first
# Install Node.js 18+
# Clone repository
$ cd /sentec-app/
$ git clone ssh://root@200.0.0.226:23/102573/SMT-Assistant.git
$ cd /sentec-app/SMT-Assistant/
$ git checkout --track origin/production

# Install Node.js packages
$ npm install
$ npm run build

# Porvision other Sentec apps.
# - Sentec Start
# - GE Warehouse Dashboard
# - SMT Assistant (the one we are working on)
# - WMS (codename Soda)
# - WMS-Web (codename Soda-Web)

# Start Caddy service
```

## Update production deployment

```sh
# Pull updates from repository
$ cd /sentec-app/SMT-Assistant/
$ git checkout production
$ git pull origin production

# Install Node.js packages
$ npm install
$ npm run build

# Restart Caddy service
$ sudo systemctl restart caddy.service
```
