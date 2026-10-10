import { expect, test } from '@playwright/test'

// Fluxos que não exigem login: prova que o app sobe, que as rotas protegidas mandam para o login
// e que a tela de entrada do cliente renderiza. O fluxo com sessão (QR da visita, resgate) precisa do
// Supabase e de um celular de teste; fica para um spec próprio com credenciais de teste.

test('customer entry page renders', async ({ page }) => {
  await page.goto('/entrar')
  await expect(page).toHaveTitle(/Entrar/)
})

test('customer wallet sends a guest to the entry page', async ({ page }) => {
  await page.goto('/carteira')
  await expect(page).toHaveURL(/\/entrar/)
})

test('merchant panel sends a guest to the merchant sign-in', async ({ page }) => {
  await page.goto('/balcao')
  await expect(page).toHaveURL(/\/balcao\/entrar/)
})
