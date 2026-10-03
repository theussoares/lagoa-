import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Convenções do CLAUDE.md que dá para checar lendo arquivos. Dois tipos de lista:
 * - exceções permanentes (I/O de borda que mora fora de composable de browser por decisão);
 * - listas transitórias, uma por regra: o que ainda viola hoje. Cada refatoração tira
 *   arquivos daqui, e o teste falha se um item já cumpre a regra (a lista só encolhe).
 * Caminhos relativos a `apps/web`, com `/`, um por linha, em ordem alfabética.
 */

const PERMANENT_IO_EXCEPTIONS: readonly string[] = [
  'layers/core/app/stores/session.ts',
  'layers/core/app/plugins/backend.ts',
  'layers/core/app/mock/**',
]

/** `export interface|type` fora de `types/` (services e mock ficam de fora da regra). */
const TRANSITIONAL_EXPORTED_TYPES: readonly string[] = [
  'layers/core/app/composables/useAsyncResult.ts',
  'layers/core/app/utils/sessionPersistence.ts',
  'layers/core/app/utils/translate.ts',
  'layers/customer/app/components/profile/BirthdayForm.vue',
  'layers/customer/app/composables/useCheckIn.ts',
  'layers/customer/app/composables/useCustomerSignIn.ts',
  'layers/customer/app/composables/useQrScanner.ts',
  'layers/customer/app/composables/useRewardRedemption.ts',
  'layers/customer/app/utils/birthdayModel.ts',
  'layers/customer/app/utils/checkInModel.ts',
  'layers/customer/app/utils/discoverModel.ts',
  'layers/customer/app/utils/rewardsModel.ts',
  'layers/customer/app/utils/walletCardModel.ts',
  'layers/merchant/app/composables/useCampaigns.ts',
  'layers/merchant/app/composables/useClubSetup.ts',
  'layers/merchant/app/composables/useCounterLaunch.ts',
  'layers/merchant/app/composables/useCounterLedger.ts',
  'layers/merchant/app/composables/useMerchantCustomers.ts',
  'layers/merchant/app/composables/useMerchantHome.ts',
  'layers/merchant/app/composables/useMerchantSignIn.ts',
  'layers/merchant/app/composables/useProgramEditor.ts',
  'layers/merchant/app/composables/useProgramFormLabels.ts',
  'layers/merchant/app/composables/useRedemptionCheck.ts',
  'layers/merchant/app/composables/useShopStatus.ts',
  'layers/merchant/app/utils/campaignModels.ts',
  'layers/merchant/app/utils/clubSetupForm.ts',
  'layers/merchant/app/utils/clubSetupLabels.ts',
  'layers/merchant/app/utils/counterAction.ts',
  'layers/merchant/app/utils/homeModels.ts',
  'layers/merchant/app/utils/programForm.ts',
  'layers/merchant/app/utils/programFormLabels.ts',
  'layers/merchant/app/utils/programPreviewModel.ts',
  'layers/merchant/app/utils/programSummary.ts',
  'layers/merchant/app/utils/reminderForm.ts',
  'layers/ui/app/utils/qrPath.ts',
  'layers/ui/app/utils/tallyGroups.ts',
]

/** `window.` / `navigator.` / `document.` fora de composable de browser. */
const TRANSITIONAL_BROWSER_API: readonly string[] = [
  'layers/customer/app/composables/useSeenStamps.ts',
  'layers/customer/app/pages/check-in.vue',
  'layers/merchant/app/pages/club-setup.vue',
  'layers/merchant/app/pages/program.vue',
]

/** Página com mais de 30 linhas de script. */
const TRANSITIONAL_PAGE_SCRIPT: readonly string[] = [
  'layers/customer/app/pages/check-in.vue',
  'layers/customer/app/pages/discover.vue',
  'layers/customer/app/pages/profile.vue',
  'layers/customer/app/pages/reward-redemption.vue',
  'layers/customer/app/pages/sign-in.vue',
  'layers/customer/app/pages/wallet.vue',
  'layers/merchant/app/pages/campaigns.vue',
  'layers/merchant/app/pages/club-setup.vue',
  'layers/merchant/app/pages/counter.vue',
  'layers/merchant/app/pages/customers.vue',
  'layers/merchant/app/pages/merchant-sign-in.vue',
  'layers/merchant/app/pages/program.vue',
]

/** Página com mais de 60 linhas de template. */
const TRANSITIONAL_PAGE_TEMPLATE: readonly string[] = [
  'layers/customer/app/pages/check-in.vue',
  'layers/customer/app/pages/discover.vue',
  'layers/customer/app/pages/rewards.vue',
  'layers/customer/app/pages/sign-in.vue',
  'layers/merchant/app/pages/campaigns.vue',
  'layers/merchant/app/pages/club-setup.vue',
  'layers/merchant/app/pages/counter.vue',
  'layers/merchant/app/pages/customers.vue',
  'layers/merchant/app/pages/home.vue',
  'layers/merchant/app/pages/merchant-sign-in.vue',
  'layers/merchant/app/pages/program.vue',
]

/** Composables dedicados a API de navegador (CLAUDE.md, "Browser API"). */
const BROWSER_COMPOSABLES: readonly string[] = ['useFocus', 'useHaptics', 'useInputCaret', 'useLeaveGuard', 'usePrint', 'useQrScanner']

const PAGE_SCRIPT_MAX_LINES = 30
const PAGE_TEMPLATE_MAX_LINES = 60

const WEB_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (name === 'node_modules') return []
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function appFiles(): string[] {
  const layers = readdirSync(join(WEB_ROOT, 'layers')).filter((name) => statSync(join(WEB_ROOT, 'layers', name)).isDirectory())
  return layers
    .flatMap((layer) => {
      const appDirectory = join(WEB_ROOT, 'layers', layer, 'app')
      return exists(appDirectory) ? walk(appDirectory) : []
    })
    .map((path) => relative(WEB_ROOT, path).split(sep).join('/'))
    .filter((path) => path.endsWith('.vue') || path.endsWith('.ts'))
    .sort()
}

function exists(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function read(path: string): string {
  return readFileSync(join(WEB_ROOT, path), 'utf8')
}

function matchesException(path: string, entry: string): boolean {
  return entry.endsWith('/**') ? path.startsWith(entry.slice(0, -2)) : path === entry
}

function isPermanentException(path: string): boolean {
  return PERMANENT_IO_EXCEPTIONS.some((entry) => matchesException(path, entry))
}

function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

function layerOf(path: string): string {
  return path.split('/')[1] ?? ''
}

function segmentsOf(path: string): string[] {
  return path.split('/').slice(3)
}

function hasExportedType(path: string): boolean {
  const [folder] = segmentsOf(path)
  const inScope = path.endsWith('.vue') || folder === 'utils' || folder === 'composables' || folder === 'stores'
  if (!inScope || folder === 'types' || folder === 'services' || folder === 'mock') return false
  return /^\s*export (interface|type) /m.test(read(path))
}

function isBrowserComposable(path: string): boolean {
  const [folder, file] = segmentsOf(path)
  return folder === 'composables' && BROWSER_COMPOSABLES.includes((file ?? '').replace(/\.ts$/, ''))
}

function usesBrowserApi(path: string): boolean {
  if (isBrowserComposable(path)) return false
  return /(?<![\w.$])(window|navigator|document)\./.test(stripComments(read(path)))
}

function isPage(path: string): boolean {
  const parts = segmentsOf(path)
  return parts[0] === 'pages' && parts.length === 2 && path.endsWith('.vue')
}

function nonEmptyLines(block: string): number {
  return block.split('\n').filter((line) => line.trim() !== '').length
}

function scriptLines(source: string): number {
  const match = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source)
  return match?.[1] === undefined ? 0 : nonEmptyLines(match[1])
}

function templateLines(source: string): number {
  const start = source.indexOf('<template>')
  const end = source.lastIndexOf('</template>')
  if (start === -1 || end === -1) return 0
  return nonEmptyLines(source.slice(start + '<template>'.length, end))
}

function violations(rule: (path: string) => boolean, files: readonly string[]): string[] {
  return files.filter((path) => !isPermanentException(path) && rule(path))
}

function describeRule(name: string, transitional: readonly string[], rule: (path: string) => boolean, how: string): void {
  describe(name, () => {
    const files = appFiles()
    const current = violations(rule, files)

    it('keeps the transitional list sorted and without duplicates', () => {
      expect([...transitional]).toEqual([...new Set(transitional)].sort())
    })

    it(`has no new violation (${how})`, () => {
      const fresh = current.filter((path) => !transitional.includes(path))
      expect(fresh, `new violations, fix them (do not add to the list):\n${fresh.join('\n')}`).toEqual([])
    })

    it('only lists files that still violate the rule', () => {
      const stale = transitional.filter((path) => !current.includes(path))
      expect(stale, `already compliant, remove from the transitional list:\n${stale.join('\n')}`).toEqual([])
    })
  })
}

describe('permanent I/O exceptions', () => {
  it('are exactly the session persistence, the backend plugin and the mock', () => {
    expect([...PERMANENT_IO_EXCEPTIONS].sort()).toEqual(
      ['layers/core/app/mock/**', 'layers/core/app/plugins/backend.ts', 'layers/core/app/stores/session.ts'].sort(),
    )
  })

  it('exist in the tree', () => {
    const files = appFiles()
    for (const entry of PERMANENT_IO_EXCEPTIONS) {
      expect(files.some((path) => matchesException(path, entry)), entry).toBe(true)
    }
  })
})

describe('layer layout', () => {
  it('only finds app code inside layers/<layer>/app', () => {
    const files = appFiles()
    expect(files.length).toBeGreaterThan(0)
    expect(files.every((path) => layerOf(path) !== '' && path.split('/')[2] === 'app')).toBe(true)
  })
})

describeRule('exported types live in types/', TRANSITIONAL_EXPORTED_TYPES, hasExportedType, 'export interface/type only in types/ and services/')
describeRule('browser APIs live in browser composables', TRANSITIONAL_BROWSER_API, usesBrowserApi, 'window/navigator/document only in browser composables')

describe('page size limits', () => {
  const pages = appFiles().filter(isPage)

  it('finds the pages of every surface', () => {
    expect(pages.length).toBeGreaterThan(0)
  })

  describeRule(
    `page script is at most ${PAGE_SCRIPT_MAX_LINES} lines`,
    TRANSITIONAL_PAGE_SCRIPT,
    (path) => isPage(path) && scriptLines(read(path)) > PAGE_SCRIPT_MAX_LINES,
    `script <= ${PAGE_SCRIPT_MAX_LINES} non-empty lines`,
  )
  describeRule(
    `page template is at most ${PAGE_TEMPLATE_MAX_LINES} lines`,
    TRANSITIONAL_PAGE_TEMPLATE,
    (path) => isPage(path) && templateLines(read(path)) > PAGE_TEMPLATE_MAX_LINES,
    `template <= ${PAGE_TEMPLATE_MAX_LINES} non-empty lines`,
  )
})
