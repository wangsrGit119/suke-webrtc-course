import Vue from 'vue'
import App from './App.vue'
import router from './router'

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
Vue.config.productionTip = false
Vue.use(ElementUI)
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
const host = window.location.host
const server = protocol+host
console.log("current server ",server);
console.log(process.env)

let serverSocketUrl = process.env.NODE_ENV === 'development' ? 'ws://127.0.0.1:18080' : server
Vue.prototype.$serverSocketUrl = serverSocketUrl;



new Vue({
	router,
  render: h => h(App),
}).$mount('#app')
