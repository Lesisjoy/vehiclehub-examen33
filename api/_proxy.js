const DEFAULT_TIMEOUT_MS = 10_000;

function sendJson(response, status, body) {
    response.status(status);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    return response.send(JSON.stringify(body));
}

function readUpstreamUrl(environmentVariable) {
    const rawValue = process.env[environmentVariable]?.trim();
    if (!rawValue) throw new Error("NOT_CONFIGURED");
    const url = new URL(rawValue);
    if (!/^https?:$/.test(url.protocol)) throw new Error("INVALID_URL");
    return url.toString();
}

export async function proxyGet(request, response, { environmentVariable, label, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        return sendJson(response, 405, { error: "Método no permitido.", code: "METHOD_NOT_ALLOWED" });
    }

    let upstreamUrl;
    try {
        upstreamUrl = readUpstreamUrl(environmentVariable);
    } catch {
        return sendJson(response, 503, { error: `El servicio de ${label} todavía no está configurado.`, code: "API_NOT_CONFIGURED" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const headers = { Accept: "application/json" };
    const proxyToken = process.env.API_PROXY_TOKEN?.trim();
    if (proxyToken) headers["X-API-Key"] = proxyToken;

    try {
        const upstream = await fetch(upstreamUrl, { method: "GET", headers, signal: controller.signal, cache: "no-store" });
        const rawBody = await upstream.text();
        let body = null;

        if (rawBody) {
            try {
                body = JSON.parse(rawBody);
            } catch {
                return sendJson(response, 502, { error: `El servicio de ${label} devolvió una respuesta inválida.`, code: "INVALID_UPSTREAM_JSON" });
            }
        }

        if (!upstream.ok) {
            return sendJson(response, upstream.status, { error: `El servicio de ${label} no pudo completar la solicitud.`, code: "UPSTREAM_ERROR" });
        }

        return sendJson(response, upstream.status, body);
    } catch (error) {
        if (error?.name === "AbortError") {
            return sendJson(response, 504, { error: `El servicio de ${label} tardó demasiado en responder.`, code: "UPSTREAM_TIMEOUT" });
        }
        return sendJson(response, 502, { error: `No fue posible comunicarse con el servicio de ${label}.`, code: "UPSTREAM_UNAVAILABLE" });
    } finally {
        clearTimeout(timeout);
    }
}
