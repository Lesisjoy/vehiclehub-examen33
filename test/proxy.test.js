import assert from "node:assert/strict";
import test from "node:test";
import { proxyGet } from "../api/_proxy.js";

function createResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        setHeader(name, value) { this.headers[name] = value; return this; },
        send(body) { this.body = JSON.parse(body); return this; },
    };
}

const options = { environmentVariable: "TEST_API_URL", label: "prueba" };

test("rechaza métodos distintos de GET", async () => {
    const response = createResponse();
    await proxyGet({ method: "POST" }, response, options);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "GET");
});

test("responde 503 cuando falta la URL", async () => {
    delete process.env.TEST_API_URL;
    const response = createResponse();
    await proxyGet({ method: "GET" }, response, options);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, "API_NOT_CONFIGURED");
});

test("propaga JSON válido y envía el token solo al origen", async (context) => {
    process.env.TEST_API_URL = "http://api.example.test/vehiculos";
    process.env.API_PROXY_TOKEN = "token-prueba";
    let receivedHeaders;
    context.mock.method(globalThis, "fetch", async (_url, init) => {
        receivedHeaders = init.headers;
        return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
    });
    const response = createResponse();
    await proxyGet({ method: "GET" }, response, options);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, [{ id: 1 }]);
    assert.equal(receivedHeaders["X-API-Key"], "token-prueba");
    assert.equal(response.headers["Cache-Control"], "no-store");
});

test("oculta el cuerpo de los errores del origen", async (context) => {
    process.env.TEST_API_URL = "http://api.example.test/vehiculos";
    context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "dato privado" }), { status: 500 }));
    const response = createResponse();
    await proxyGet({ method: "GET" }, response, options);
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.code, "UPSTREAM_ERROR");
    assert.doesNotMatch(JSON.stringify(response.body), /dato privado/);
});

test("conserva un 404 del origen sin filtrar detalles internos", async (context) => {
    process.env.TEST_API_URL = "http://api.example.test/vehiculos";
    context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "ruta interna inexistente" }), { status: 404 }));
    const response = createResponse();
    await proxyGet({ method: "GET" }, response, options);
    assert.equal(response.statusCode, 404);
    assert.equal(response.body.code, "UPSTREAM_ERROR");
    assert.doesNotMatch(JSON.stringify(response.body), /ruta interna inexistente/);
});

test("responde 502 ante JSON inválido", async (context) => {
    process.env.TEST_API_URL = "http://api.example.test/vehiculos";
    context.mock.method(globalThis, "fetch", async () => new Response("no-json", { status: 200 }));
    const response = createResponse();
    await proxyGet({ method: "GET" }, response, options);
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.code, "INVALID_UPSTREAM_JSON");
});

test("responde 504 cuando vence el timeout", async (context) => {
    process.env.TEST_API_URL = "http://api.example.test/vehiculos";
    context.mock.method(globalThis, "fetch", async (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
    }));
    const response = createResponse();
    await proxyGet({ method: "GET" }, response, { ...options, timeoutMs: 5 });
    assert.equal(response.statusCode, 504);
    assert.equal(response.body.code, "UPSTREAM_TIMEOUT");
});
