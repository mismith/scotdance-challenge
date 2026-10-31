export type Direction = 'asc' | 'desc'

/** Stable multi-key sort, like lodash's `orderBy` */
export function orderBy<T>(items: T[], keys: string[], dirs: Direction[] = []) {
  return [...items].sort((a, b) => {
    for (const [i, key] of keys.entries()) {
      const x = (a as Record<string, unknown>)[key] as number | string | boolean
      const y = (b as Record<string, unknown>)[key] as number | string | boolean
      if (x === y) continue
      const order = x > y ? 1 : -1
      return dirs[i] === 'desc' ? -order : order
    }
    return 0
  })
}

declare global {
  interface Window {
    $crisp?: unknown[][]
  }
}

/** Push a command to the Crisp live chat widget, if it loaded */
export function crisp(...command: unknown[]) {
  window.$crisp?.push(command)
}

/** Open the live chat (its bubble stays hidden, see index.html), optionally with a first message */
export function openChat(message?: string) {
  crisp('do', 'chat:show')
  if (message) crisp('do', 'message:send', ['text', message])
  crisp('do', 'chat:open')
}

/** Ink or white, whichever reads better on a `#rrggbb` colour */
export function textOn(color?: string | null) {
  const [r, g, b] = (color?.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)?.slice(1) ?? []).map(
    (hex) => parseInt(hex, 16),
  )
  if (r === undefined || g === undefined || b === undefined) return 'var(--color-ink)'
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? 'var(--color-ink)' : '#fff'
}
