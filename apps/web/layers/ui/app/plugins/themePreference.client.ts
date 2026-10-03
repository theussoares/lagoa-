/**
 * Antes o app seguia o sistema. Agora abre no claro e o escuro é escolha da
 * pessoa: quem ficou com "sistema" guardado volta para o claro uma vez.
 */
export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  if (colorMode.preference !== 'light' && colorMode.preference !== 'dark') colorMode.preference = 'light'
})
