import type { DataExportView } from '../types/dataExport'

const EXPORT_FILE_NAME = 'meus-dados-lagoa.json'

/** Pede os dados do cliente e entrega como arquivo JSON. */
export function useDataExport(): DataExportView {
  const { dataExport } = useCustomerServices()
  const { saveJson } = useFileDownload()
  const pending = ref(false)

  async function download(): ReturnType<DataExportView['download']> {
    pending.value = true
    const result = await dataExport.exportMyData()
    pending.value = false
    if (!result.ok) return result.error.code
    saveJson(EXPORT_FILE_NAME, result.value)
    return null
  }

  return { pending, download }
}
