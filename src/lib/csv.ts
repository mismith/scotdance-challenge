type Cell = string | number | null | undefined

const escape = (cell: Cell) => {
  const text = String(cell ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** Save rows (the first being the headers) as a CSV file */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
