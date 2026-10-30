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
