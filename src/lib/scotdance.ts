// ScotDance.app's embed draws its own sign-in sheet; Challenge only asks for a pass
import { isUsingEmulators } from '@/lib/firebase'

// the embed lives on next.scotdance.app until v4 launches on scotdance.app (ScotDance ADR 0015)
export const scotdanceUrl =
  import.meta.env.VITE_SCOTDANCE_URL ||
  (isUsingEmulators ? 'http://localhost:5279' : 'https://next.scotdance.app')

// VITE_SCOTDANCE_SIGN_IN=false hides sign-in, should ScotDance.app's sheet need switching off
export const isSignInEnabled = import.meta.env.VITE_SCOTDANCE_SIGN_IN !== 'false'

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
