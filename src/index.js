import { Controller } from './Controller.js';

if (!process.env.OIDC_CLIENT_ID || !process.env.OIDC_CLIENT_SECRET) {
    console.log('Please set the OIDC_CLIENT_ID and OIDC_CLIENT_SECRET environment variables');
    process.exit(1);
}

const controller = new Controller();
await controller.startPolling();
console.log('Rate limit status', controller.rateLimitStatus);
console.log('Devices', controller.devices);
