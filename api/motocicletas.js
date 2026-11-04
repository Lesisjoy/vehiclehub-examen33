import { proxyGet } from "./_proxy.js";

export default function handler(request, response) {
    return proxyGet(request, response, {
        environmentVariable: "API_MOTOS_URL",
        label: "motocicletas",
    });
}
