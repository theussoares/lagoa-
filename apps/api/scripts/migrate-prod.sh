#!/usr/bin/env bash
# Único caminho para aplicar migration no banco de produção. Só segue se o banco de teste
# já estiver igual ao repo (migrations aplicadas e testes de integração passando nele) e se a
# produção estiver atrás do repo, nunca divergente. Precisa de PROD_DATABASE_URL e TEST_DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${PROD_DATABASE_URL:?defina PROD_DATABASE_URL}"
: "${TEST_DATABASE_URL:?defina TEST_DATABASE_URL (banco de teste, nunca o de produção)}"
if [ "$TEST_DATABASE_URL" = "$PROD_DATABASE_URL" ]; then
  echo "TEST_DATABASE_URL e PROD_DATABASE_URL são o mesmo banco." >&2; exit 1
fi

echo "1/4 banco de teste igual ao repo"
node scripts/check-db-parity.mjs "$TEST_DATABASE_URL" --exact
echo "2/4 testes de integração no banco de teste"
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test
echo "3/4 produção atrás do repo (sem divergência)"
node scripts/check-db-parity.mjs "$PROD_DATABASE_URL" --behind
echo "4/4 aplicando em produção"
DATABASE_URL="$PROD_DATABASE_URL" pnpm db:migrate
node scripts/check-db-parity.mjs "$PROD_DATABASE_URL" --exact
