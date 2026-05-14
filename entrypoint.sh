#!/bin/sh
set -e

# Ensure uploads directories exist and have correct ownership (volume may mount as root)
mkdir -p ./public/uploads/avatars
chown -R nextjs:nodejs ./public/uploads

echo "Running Prisma db push..."
./node_modules/.bin/prisma db push --accept-data-loss --url "$DATABASE_URL"
echo "Prisma db push complete."

# Write env for cron jobs and start cron daemon
echo "CRON_SECRET=$CRON_SECRET" > /etc/cron.env
crond -b -l 8
echo "Cron daemon started."

# Drop privileges and run as nextjs
exec su-exec nextjs "$@"
