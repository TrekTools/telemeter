import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setAppInstance } from './router'

const app = createApp(App)
app.use(router)
const vm = app.mount('#app')
setAppInstance(vm)
