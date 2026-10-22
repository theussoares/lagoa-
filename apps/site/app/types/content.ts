export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }

/** Texto de um artigo em um idioma. `id` é o mesmo entre idiomas; o `slug` é da URL daquele idioma. */
export interface PostText {
  id: string
  slug: string
  title: string
  description: string
  body: Block[]
}

export interface GuideText {
  id: string
  slug: string
  title: string
  description: string
  body: Block[]
}

/** Artigo já no idioma pedido (texto + dados que não mudam entre idiomas). */
export interface Post extends PostText {
  date: string
  readingMinutes: number
}

export interface GuideEntry extends GuideText {
  icon: string
}
