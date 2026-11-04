import { proxyGet } from "./_proxy.js";

export default function handler(request, response) {
    return proxyGet(request, response, {
        environmentVariable: "API_AUTOS_URL",
        label: "automóviles",
    });
}
