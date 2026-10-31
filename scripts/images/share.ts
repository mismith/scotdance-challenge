// the picture a shared link shows (public/share.png): `npm run images` draws it with the app's own
// logo, ribbons and type
import { createApp, h } from 'vue'
import Ribbons from '@/components/Ribbons.vue'
import StepsMark from '@/components/StepsMark.vue'
import '@/style.css'

createApp({
  render: () =>
    h('div', { class: 'relative h-[630px] w-[1200px] overflow-hidden bg-violet text-white' }, [
      // the climb runs along the bottom, clear of the words (like a challenge's header)
      h('div', { class: 'absolute inset-x-0 bottom-0 h-[250px]' }, [
        h(Ribbons, { variant: 'shell', days: [] }),
      ]),
      h('div', { class: 'relative flex flex-col items-start gap-6 px-[80px] pt-[64px]' }, [
        // a light ring, so the violet tile shows on the violet page
        h(StepsMark, {
          size: 96,
          style: 'border-radius: 22px; box-shadow: 0 0 0 5px rgb(255 255 255 / 0.9)',
        }),
        h('h1', { class: 'hd text-[96px] leading-[0.9]' }, 'ScotDance Challenge'),
        h('p', { class: 'text-[36px] font-bold' }, 'Log your dancing and cheer each other on'),
      ]),
    ]),
}).mount('#app')
