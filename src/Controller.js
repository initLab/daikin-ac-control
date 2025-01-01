import { DaikinCloudController } from 'daikin-controller-cloud';
import { resolve } from 'node:path';

const __dirname = import.meta.dirname;

export class Controller {
    #controller;
    #devices = [];
    #rateLimitStatus = {};
    static defaultHost = '127.0.0.1';

    constructor() {
        const {
            OIDC_CLIENT_ID,
            OIDC_CLIENT_SECRET,
            HOST,
            PORT,
            EXTERNAL_HOST,
            BASE_URL,
        } = process.env;

        this.#controller = new DaikinCloudController({
            /* OIDC client id */
            oidcClientId: OIDC_CLIENT_ID,
            /* OIDC client secret */
            oidcClientSecret: OIDC_CLIENT_SECRET,
            /* Network interface that the HTTP server should bind to. Bind to all interfaces for convenience, please limit as needed to single interfaces! */
            oidcCallbackServerBindAddr: HOST ?? Controller.defaultHost,
            /* port that the HTTP server should bind to */
            oidcCallbackServerPort: PORT,
            /* OIDC Redirect URI */
            oidcCallbackServerExternalAddress: EXTERNAL_HOST ?? Controller.defaultHost,
            oidcCallbackServerBaseUrl: BASE_URL,
            /* path of file used to cache the OIDC tokenset */
            oidcTokenSetFilePath: resolve(__dirname, '..', 'data', '.daikin-controller-cloud-tokenset'),
            /* time to wait for the user to go through the authorization grant flow before giving up (in seconds) */
            oidcAuthorizationTimeoutS: 120,
            // certificatePathKey: resolve(__dirname, '..', 'cert', 'cert.key'),
            // certificatePathCert: resolve(__dirname, '..', 'cert', 'cert.pem'),
        });

        this.#controller.on('authorization_request', url => {
            console.log(
`Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
 
Then please open the URL ${url} in your browser.
 
Afterwards you are redirected to Daikin to approve the access and then redirected back.`
            );
        });

        this.#controller.on('rate_limit_status', rateLimitStatus => {
            this.#rateLimitStatus = rateLimitStatus;
        });
    }

    get devices() {
        return this.#devices;
    }

    get rateLimitStatus() {
        return this.#rateLimitStatus;
    }

    async startPolling() {
        this.#devices = await this.#controller.getCloudDevices();
        // TODO
        // this.#rateLimitStatus is now available
    }
}
