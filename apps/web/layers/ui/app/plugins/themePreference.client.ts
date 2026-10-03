/**
 * O app não segue o sistema: abre no escuro e o claro é escolha da pessoa.
 * Quem ficou com "sistema" guardado vai para o escuro uma vez.
 */
export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  if (colorMode.preference !== 'light' && colorMode.preference !== 'dark') colorMode.preference = 'dark'
})
