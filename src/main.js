import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.css'; // Importiert Tailwind CSS

createApp(App).use(router).mount('#app')
