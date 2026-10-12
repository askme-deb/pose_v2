#!/usr/bin/env bash
# Creates (or resets) the platform super admin on a fresh install. Runs on the
# server. Prints the password once; only its hash is stored.
#
#   SUPER_ADMIN_EMAIL=you@example.com bash /opt/pospe/bootstrap-admin.sh
#   SUPER_ADMIN_PASSWORD=... overrides the generated password.
set -euo pipefail
cd "${APP_DIR:-/opt/pospe}"
EMAIL="${SUPER_ADMIN_EMAIL:?set SUPER_ADMIN_EMAIL}"
PASSWORD="${SUPER_ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)Aa1!}"
TAG="${TAG:-$(cat .last-good-tag)}"
export TAG

docker compose run --rm -T -e SA_EMAIL="${EMAIL}" -e SA_PASSWORD="${PASSWORD}" --entrypoint node migrate -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
(async () => {
  const p = new PrismaClient();
  const tenant = await p.tenant.upsert({
    where: { slug: "pospe-platform" },
    update: {},
    create: { name: "PosPe Platform", slug: "pospe-platform", status: "ACTIVE", plan: "ENTERPRISE", storesLimit: 1 },
  });
  const email = process.env.SA_EMAIL;
  const data = {
    tenantId: tenant.id, name: "Platform Super Admin", email, role: "SUPER_ADMIN",
    passwordHash: await bcrypt.hash(process.env.SA_PASSWORD, 10),
    isActive: true, emailVerifiedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null,
  };
  const existing = await p.user.findFirst({ where: { email } });
  if (existing) await p.user.update({ where: { id: existing.id }, data });
  else await p.user.create({ data });
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
'

echo
echo "Super admin ready."
echo "  email:    ${EMAIL}"
echo "  password: ${PASSWORD}"
echo "Sign in on the Super Admin tab at https://app.\$DOMAIN and change this password."
