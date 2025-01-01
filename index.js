import { resolve } from 'node:path';
import { DaikinCloudController } from 'daikin-controller-cloud';

const __dirname = import.meta.dirname;

// ============================================================================
// Read OIDC client credentials as environment variables.
// ============================================================================

const { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;

if (!OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET) {
    console.log('Please set the OIDC_CLIENT_ID and OIDC_CLIENT_SECRET environment variables');
    process.exit(1);
}

const defaultHost = '127.0.0.1';

// ============================================================================
// Create a new instance of the Onecta API client. Note that the
// `oidcCallbackServerBaseUrl` **must** be set as the application's
// "Redirect URI" within the Daikin Developer Portal.
// See https://developer.cloud.daikineurope.com .
// ============================================================================

const controller = new DaikinCloudController({
    /* OIDC client id */
    oidcClientId: OIDC_CLIENT_ID,
    /* OIDC client secret */
    oidcClientSecret: OIDC_CLIENT_SECRET,
    /* Network interface that the HTTP server should bind to. Bind to all interfaces for convenience, please limit as needed to single interfaces! */
    oidcCallbackServerBindAddr: process.env.HOST ?? defaultHost,
    /* port that the HTTP server should bind to */
    oidcCallbackServerPort: process.env.PORT,
    /* OIDC Redirect URI */
    oidcCallbackServerExternalAddress: process.env.EXTERNAL_HOST ?? defaultHost,
    // oidcCallbackServerBaseUrl: 'https://daikin.local:8765',
    /* path of file used to cache the OIDC tokenset */
    oidcTokenSetFilePath: resolve(__dirname, 'data', '.daikin-controller-cloud-tokenset'),
    /* time to wait for the user to go through the authorization grant flow before giving up (in seconds) */
    oidcAuthorizationTimeoutS: 120,
    // certificatePathKey: resolve(__dirname, 'cert', 'cert.key'),
    // certificatePathCert: resolve(__dirname, 'cert', 'cert.pem'),
});

// ============================================================================
// The client instance will emit the "authorization_request" event when user
// action is required to proceed with the flow that characterizes the OIDC
// Authorization grant. Applications using this library should prompt the user
// to open the provided URL in their browser of choice.
// ============================================================================

controller.on('authorization_request', (url) => {
    console.log(`
Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
 
Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
 
Afterwards you are redirected to Daikin to approve the access and then redirected back.`);
});

// ============================================================================
// The client instance will emit the "rate_limit" event on every request,
// relaying the information returned by the Onecta API on the state of its rate
// limiting.
// ============================================================================

controller.on('rate_limit_status', (rateLimitStatus) => {
    console.log(rateLimitStatus);
});

(async () => {

    // ==========================================================================
    // OIDC authentication, authorization and token management are all abstracted
    // away. The public methods exposed by the client map to the endpoints
    // provided by the Onecta API.
    // See https://developer.cloud.daikineurope.com/spec/b0dffcaa-7b51-428a-bdff-a7c8a64195c0/70b10aca-1b4c-470b-907d-56879784ea9c
    // ==========================================================================

    const devices = await controller.getCloudDeviceDetails();
    console.log(devices);

})().catch(console.error);
