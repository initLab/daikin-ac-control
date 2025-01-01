import { Controller } from './Controller.js';
import { init as initPrometheus, startServer as startPrometheusServer } from './prometheus.js';

if (!process.env.OIDC_CLIENT_ID || !process.env.OIDC_CLIENT_SECRET) {
    console.log('Please set the OIDC_CLIENT_ID and OIDC_CLIENT_SECRET environment variables');
    process.exit(1);
}

const controller = new Controller();

initPrometheus(controller);
await controller.startPolling();
await startPrometheusServer();
