import { DaikinCloudController } from 'daikin-controller-cloud';
import { resolve } from 'node:path';

const __dirname = import.meta.dirname;

export class Controller {
    #controller;
    #devices = [];
    #rateLimitStatus = {};
    #pollingIntervalMs;
    static defaultHost = '127.0.0.1';
    // split 50/50 between polling and control
    static pollingQuotaRatio = 0.5;

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
            oidcAuthorizationTimeoutS: 3600,
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

    static #calculatePollingInterval(dailyLimit) {
        const pollingQuota = dailyLimit * this.pollingQuotaRatio;
        const dailyMs = 24 * 60 * 60 * 1000;
        return dailyMs / pollingQuota;
    }

    #isQuotaAvailable() {
        if (!this.#rateLimitStatus) {
            // no rate limit status yet, let it through
            return true;
        }

        if (this.#rateLimitStatus.remainingDay < this.#rateLimitStatus.limitDay * Controller.pollingQuotaRatio) {
            // daily quota reached
            return false;
        }

        if (this.#rateLimitStatus.remainingMinute < this.#rateLimitStatus.limitMinute * Controller.pollingQuotaRatio) {
            // minute quota reached
            return false;
        }

        // clear to send update
        return true;
    }

    async #updateDevices() {
        if (!this.#isQuotaAvailable()) {
            console.warn('Skipping update as no quota is available', this.#rateLimitStatus);
            return;
        }

        this.#devices = await this.#controller.getCloudDevices();
        this.#pollingIntervalMs = Controller.#calculatePollingInterval(this.#rateLimitStatus.limitDay);
    }

    #scheduleNextUpdate() {
        console.log('Scheduling next update in', Math.round(this.#pollingIntervalMs / 1000), 'seconds');
        setTimeout(() => this.#updateAndScheduleNext(), this.#pollingIntervalMs);
    }

    async #updateAndScheduleNext() {
        await this.#updateDevices();
        this.#scheduleNextUpdate();
    }

    async startPolling() {
        await this.#updateAndScheduleNext();
    }
}
