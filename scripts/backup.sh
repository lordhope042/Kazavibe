#!/bin/sh
# Run on the server from the project folder:  sh scripts/backup.sh
# Then COPY the backups/ folder off the server regularly (a backup on the same machine does not survive losing the machine).
set -e
mkdir -p backups
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_dump -U kazavibe kazavibe | gzip > "backups/db-$(date +%F-%H%M).sql.gz"
tar czf "backups/uploads-$(date +%F).tar.gz" data/storage 2>/dev/null || true
ls -t backups/db-*.sql.gz | tail -n +15 | xargs -r rm   # keep the last 14 database backups
echo "Backup done: $(ls backups | wc -l) files in backups/"
