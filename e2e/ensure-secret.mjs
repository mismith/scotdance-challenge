// The Functions emulator reads secrets from functions/.secret.local (git-ignored).
// Give TOOL_PASS_SECRET a test-only value unless one is already set there.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'

const file = new URL('../functions/.secret.local', import.meta.url)
const contents = existsSync(file) ? readFileSync(file, 'utf8') : ''
if (!/^TOOL_PASS_SECRET=/m.test(contents)) {
  appendFileSync(
    file,
    `${contents && !contents.endsWith('\n') ? '\n' : ''}TOOL_PASS_SECRET=e2e-test-secret\n`,
  )
}
