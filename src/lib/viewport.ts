// When the iOS keyboard opens, the page keeps its full height and only the part you can see
// shrinks, so a bottom sheet would sit behind the keyboard and be too tall to scroll to its top.
// These CSS variables follow the part you can see, so sheets sit just above the keyboard instead
export function trackVisibleViewport() {
  const viewport = window.visualViewport
  if (!viewport) return
  const root = document.documentElement.style
  const update = () => {
    // pinch-zoomed in: the visible part is small for another reason, so leave sheets be
    if (Math.abs(viewport.scale - 1) > 0.01) {
      root.removeProperty('--visible-height')
      root.removeProperty('--visible-bottom')
      return
    }
    const bottom = window.innerHeight - viewport.height - viewport.offsetTop
    root.setProperty('--visible-height', `${viewport.height}px`)
    root.setProperty('--visible-bottom', `${Math.max(0, bottom)}px`)
  }
  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  update()
}
