const COLLECTION_KEYS = ["automoviles", "motocicletas", "vehiculos", "datos", "data", "items"];

export function normalizePayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") {
        throw new Error("La API no devolvió una colección válida.");
    }

    for (const key of COLLECTION_KEYS) {
        if (Array.isArray(payload[key])) return payload[key];
    }

    throw new Error("La respuesta no contiene una lista de vehículos reconocible.");
}

export function getVehicleValue(vehicle, ...keys) {
    for (const key of keys) {
        const value = vehicle?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
}

export function filterAndSort(records, query, order) {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
    const filtered = normalizedQuery
        ? records.filter((record) => [getVehicleValue(record, "marca"), getVehicleValue(record, "modelo")]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("es-MX").includes(normalizedQuery)))
        : [...records];

    return filtered.sort((left, right) => {
        if (order === "year-desc") return Number(getVehicleValue(right, "anio", "año") || 0) - Number(getVehicleValue(left, "anio", "año") || 0);
        if (order === "price-asc") return Number(getVehicleValue(left, "precio") || 0) - Number(getVehicleValue(right, "precio") || 0);
        if (order === "price-desc") return Number(getVehicleValue(right, "precio") || 0) - Number(getVehicleValue(left, "precio") || 0);
        return String(getVehicleValue(left, "marca", "modelo") || "").localeCompare(String(getVehicleValue(right, "marca", "modelo") || ""), "es");
    });
}
