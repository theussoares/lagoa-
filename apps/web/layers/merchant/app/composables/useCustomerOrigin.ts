/** Origem do app do cliente: é para onde os QR codes (cartaz e QR da visita) apontam, mesmo com o lojista no Balcão. */
export function useCustomerOrigin(): string {
  const { customerUrl } = useRuntimeConfig().public
  return customerUrl === '' ? useRequestURL().origin : customerUrl.replace(/\/+$/, '')
}
