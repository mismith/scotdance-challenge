import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { trackTheme } from './lib/theme'
import { trackUpdates } from './lib/update'
import { trackVisibleViewport } from './lib/viewport'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
trackVisibleViewport()
trackTheme()
trackUpdates(router)
