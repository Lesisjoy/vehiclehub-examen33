import { proxyGet } from "./_proxy.js";

export default function handler(request, response) {
    return proxyGet(request, response, {
        environmentVariable: "API_MOTOS_URL",
        tokenEnvironmentVariable: "API_MOTOS_KEY",
        label: "motocicletas",
    });
}
