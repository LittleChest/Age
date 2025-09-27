import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createApp } from 'vue'
import { createVuetify } from 'vuetify'

import App from './App.vue'

const app = createApp(App)

app.use(
  createVuetify({
    theme: {
      defaultTheme: 'system',
    },
  })
)

app.mount('#app')
