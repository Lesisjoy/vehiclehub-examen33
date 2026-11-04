import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSort, normalizePayload } from "../data.js";

test("normaliza arreglos directos", () => {
    const records = [{ id: 1 }];
    assert.equal(normalizePayload(records), records);
});

test("normaliza las colecciones aceptadas", () => {
    for (const key of ["automoviles", "motocicletas", "vehiculos", "datos"]) {
        assert.deepEqual(normalizePayload({ [key]: [{ id: key }] }), [{ id: key }]);
    }
});

test("rechaza respuestas sin una colección", () => {
    assert.throws(() => normalizePayload({ ok: true }), /lista de vehículos/);
});

test("filtra por marca o modelo y ordena por año", () => {
    const records = [
        { marca: "Nissan", modelo: "Versa", anio: 2021 },
        { marca: "Honda", modelo: "Civic", año: 2024 },
    ];
    assert.deepEqual(filterAndSort(records, "hon", "year-desc"), [records[1]]);
});
