import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast, { type PluginOptions } from 'vue-toastification';
import 'vue-toastification/dist/index.css';

import App from './App.vue';
import router from './router';

// Toast opsiyonları
const toastOptions: PluginOptions = {
  timeout: 3000,
  position: 'top-right',
};

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Toast, toastOptions);
app.mount('#app');
