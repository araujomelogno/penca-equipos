#!/bin/sh
set -e

# Ensure uploads directories exist and have correct ownership (volume may mount as root)
mkdir -p ./public/uploads/avatars
chown -R nextjs:nodejs ./public/uploads

echo "Running Prisma db push..."
./node_modules/.bin/prisma db push --accept-data-loss --url "$DATABASE_URL"
echo "Prisma db push complete."

# Highlights are triggered by the host droplet's crontab (deploy/cron-trigger.sh),
# not from inside this container — the bundled dcron daemon wedged and never fired.

# Drop privileges and run as nextjs
exec su-exec nextjs "$@"
