// ScotDance.app's embed draws its own sign-in sheet; Challenge only asks for a pass
import { isUsingEmulators } from '@/lib/firebase'

export const scotdanceUrl =
  import.meta.env.VITE_SCOTDANCE_URL ||
  (isUsingEmulators ? 'http://localhost:5279' : 'https://scotdance.app')

export type SignInResult =
  | { signedIn: false }
  | { signedIn: true; pass: string; uid: string; email: string; name: string | null }

declare global {
  interface Window {
    ScotDance?: { signIn(options: { audience: string }): Promise<SignInResult> }
  }
}

let loading: Promise<void> | undefined
function loadEmbed() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${scotdanceUrl}/embed.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = undefined // let the next press try again
      script.remove()
      reject(new Error('Could not load ScotDance.app'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** Open ScotDance.app's sign-in sheet; resolves `{ signedIn: false }` if it was closed */
export async function requestPass() {
  await loadEmbed()
  if (!window.ScotDance) throw new Error('Could not load ScotDance.app')
  return window.ScotDance.signIn({ audience: 'challenge' })
}
