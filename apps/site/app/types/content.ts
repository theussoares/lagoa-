export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }

export interface Post {
  slug: string
  title: string
  description: string
  date: string
  readingMinutes: number
  body: Block[]
}

export interface GuideEntry {
  slug: string
  title: string
  description: string
  icon: string
  body: Block[]
}
