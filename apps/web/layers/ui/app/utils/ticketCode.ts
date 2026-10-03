const GROUP_SIZE = 3

/** Leitor de tela soletra letra por letra, do jeito que o cliente lê em voz alta no balcão. */
export function spellCode(code: string): string {
  return code.split('').join(' ')
}

/** Código de 6 caracteres em dois grupos de 3 (`ABC 123`). */
export function groupCode(code: string): string[] {
  return [code.slice(0, GROUP_SIZE), code.slice(GROUP_SIZE)]
}

/** Posição da letra no código inteiro, para escalonar a entrada de cada uma. */
export function charPosition(groupIndex: number, charIndex: number): number {
  return groupIndex * GROUP_SIZE + charIndex
}
