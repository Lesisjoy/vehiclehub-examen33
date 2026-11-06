import { proxyGet } from "./_proxy.js";

export default function handler(request, response) {
    return proxyGet(request, response, {
        environmentVariable: "API_AUTOS_URL",
        tokenEnvironmentVariable: "API_AUTOS_KEY",
        label: "automóviles",
    });
}
