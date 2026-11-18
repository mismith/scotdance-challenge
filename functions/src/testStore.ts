import { FieldValue, type Firestore } from 'firebase-admin/firestore'

type Value = Record<string, any>
/** Transactional store double: independent server calls share state and serialize their atomic commits. */
export function firestore(initial: Record<string, Value>) {
  const data = new Map(Object.entries(structuredClone(initial)))
  const copy = (v: Value | undefined) => (v == null ? v : structuredClone(v))
  const field = (v: Value, path: string) => path.split('.').reduce((next, key) => next?.[key], v)
  const update = (path: string, patch: Value) => {
    const value = copy(data.get(path)) ?? {}
    for (const [key, next] of Object.entries(patch)) {
      const parts = key.split('.'),
        last = parts.pop()!
      let target = value
      for (const part of parts) target = target[part] ??= {}
      if (next && typeof next.isEqual === 'function' && next.isEqual(FieldValue.delete()))
        delete target[last]
      else target[last] = copy(next)
    }
    data.set(path, value)
  }
  const ref = (path: string): any => ({
    path,
    id: path.split('/').at(-1),
    parent: collection(path.split('/').slice(0, -1).join('/')),
    collection: (name: string) => collection(`${path}/${name}`),
    get: async () => snapshot(path),
    set: async (value: Value, options?: { merge: boolean }) => {
      if (options?.merge) update(path, value)
      else data.set(path, copy(value)!)
    },
    create: async (value: Value) => {
      if (data.has(path)) throw new Error('exists')
      data.set(path, copy(value)!)
    },
    update: async (value: Value) => update(path, value),
    delete: async () => {
      data.delete(path)
    },
  })
  const snapshot = (path: string): any => ({
    id: path.split('/').at(-1),
    ref: ref(path),
    exists: data.has(path),
    data: () => copy(data.get(path)),
  })
  const collection = (
    path: string,
    filter?: (v: Value) => boolean,
    group = false,
    maximum = Infinity,
    sort?: string,
  ): any => ({
    path,
    id: path.split('/').at(-1),
    get parent() {
      return path.includes('/') ? ref(path.split('/').slice(0, -1).join('/')) : null
    },
    doc: (id: string) => ref(`${path}/${id}`),
    where: (key: string, operator: string, expected: any) =>
      collection(
        path,
        (v) =>
          (!filter || filter(v)) &&
          (operator === '<='
            ? field(v, key) <= expected
            : operator === '>'
              ? field(v, key) > expected
              : field(v, key) === expected),
        group,
        maximum,
        sort,
      ),
    limit: (count: number) => collection(path, filter, group, count, sort),
    orderBy: (key: string) => collection(path, filter, group, maximum, key),
    get: async () => ({
      docs: [...data]
        .filter(
          ([key, value]) =>
            (group
              ? key.split('/').at(-2) === path
              : key.startsWith(`${path}/`) &&
                key.split('/').length === path.split('/').length + 1) &&
            (!filter || filter(value)),
        )
        .sort((a, b) => (sort ? Number(field(a[1], sort)) - Number(field(b[1], sort)) : 0))
        .slice(0, maximum)
        .map(([key]) => snapshot(key)),
    }),
  })
  let tail = Promise.resolve()
  const db = {
    batch: () => {
      const pending: Array<() => void> = []
      const batch = {
        update: (r: any, value: Value) => (pending.push(() => update(r.path, value)), batch),
        set: (r: any, value: Value) => (pending.push(() => data.set(r.path, copy(value)!)), batch),
        delete: (r: any) => (pending.push(() => void data.delete(r.path)), batch),
        commit: async () => pending.forEach((write) => write()),
      }
      return batch
    },
    collection,
    collectionGroup: (name: string) => collection(name, undefined, true),
    getAll: async (...refs: any[]) => Promise.all(refs.map((r) => r.get())),
    runTransaction: async (action: (tx: any) => Promise<unknown>) => {
      let release!: () => void
      const previous = tail
      tail = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      const pending: Array<() => void> = []
      let writing = false
      const tx = {
        get: async (r: any) => {
          if (writing) throw new Error('Read after write')
          return r.get()
        },
        set: (r: any, value: Value, options?: { merge: boolean }) => {
          writing = true
          pending.push(() => {
            if (options?.merge) update(r.path, value)
            else data.set(r.path, copy(value)!)
          })
        },
        create: (r: any, value: Value) => {
          writing = true
          pending.push(() => {
            if (data.has(r.path)) throw new Error('exists')
            data.set(r.path, copy(value)!)
          })
        },
        update: (r: any, value: Value) => {
          writing = true
          pending.push(() => update(r.path, value))
        },
        delete: (r: any) => {
          writing = true
          pending.push(() => {
            data.delete(r.path)
          })
        },
      }
      try {
        const result = await action(tx)
        pending.forEach((write) => write())
        return result
      } finally {
        release()
      }
    },
  }
  return { db: db as unknown as Firestore, data }
}
