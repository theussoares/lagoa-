import type { Translate } from '../utils/translate'

/** O `t` do vue-i18n na forma que os mapeadores puros (utils) aceitam. */
export function useTranslate(): Translate {
  const { t } = useI18n()
  return (key, named = {}, plural) => (plural === undefined ? t(key, named) : t(key, named, plural))
}
