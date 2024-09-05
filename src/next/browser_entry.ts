import BrowserAdapter from "./BrowserAdapter";

const { ready, authorize, init, client, options, utils } = new BrowserAdapter().getSmartApi();

// export default {
//     client,
//     utils,
//     oauth2: {
//         settings: options,
//         ready,
//         authorize,
//         init
//     }
// };

function smart(settings: Record<string, any> = {}) {
    return smart;
}

smart.authorize = authorize
smart.ready     = ready
smart.init      = init
smart.client    = client
smart.utils     = utils

export default smart