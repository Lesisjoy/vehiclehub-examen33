import { filterAndSort, getVehicleValue, normalizePayload } from "./data.js";

const CATEGORIES = {
    automoviles: { label: "Automóviles", singular: "automóvil", endpoint: "/api/automoviles", icon: "car" },
    motocicletas: { label: "Motocicletas", singular: "motocicleta", endpoint: "/api/motocicletas", icon: "bike" },
};

const state = {
    active: "automoviles",
    query: "",
    order: "name",
    categories: {
        automoviles: { records: [], status: "idle", updatedAt: null, error: null },
        motocicletas: { records: [], status: "idle", updatedAt: null, error: null },
    },
};

const elements = {
    tabs: [...document.querySelectorAll("[data-category]")],
    refresh: document.querySelector("[data-refresh]"),
    search: document.querySelector("[data-search]"),
    order: document.querySelector("[data-order]"),
    grid: document.querySelector("[data-grid]"),
    status: document.querySelector("[data-status]"),
    resultCount: document.querySelector("[data-result-count]"),
    kpiRecords: document.querySelector("[data-kpi-records]"),
    kpiService: document.querySelector("[data-kpi-service]"),
    kpiUpdated: document.querySelector("[data-kpi-updated]"),
    activeService: document.querySelector("[data-active-service]"),
};

function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(number);
}

function formatTime(date) {
    return date ? new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date) : "—";
}

function createIcon(type) {
    const wrapper = document.createElement("div");
    wrapper.className = `vehicle-visual ${type}`;
    wrapper.setAttribute("aria-hidden", "true");
    const icon = document.createElement("span");
    icon.className = "vehicle-glyph";
    wrapper.append(icon);
    return wrapper;
}

function appendField(container, label, value, className = "") {
    if (value === null || value === undefined || String(value).trim() === "") return;
    const item = document.createElement("div");
    item.className = `vehicle-field ${className}`.trim();
    const caption = document.createElement("span");
    caption.textContent = label;
    const content = document.createElement("strong");
    content.textContent = String(value);
    item.append(caption, content);
    container.append(item);
}

function createVehicleCard(vehicle, category) {
    const article = document.createElement("article");
    article.className = "vehicle-card";
    const visual = createIcon(CATEGORIES[category].icon);
    const type = document.createElement("span");
    type.className = "vehicle-type";
    type.textContent = CATEGORIES[category].singular;
    visual.append(type);

    const body = document.createElement("div");
    body.className = "vehicle-body";
    const header = document.createElement("div");
    header.className = "vehicle-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.textContent = String(getVehicleValue(vehicle, "marca") || CATEGORIES[category].label);
    const title = document.createElement("h3");
    title.textContent = String(getVehicleValue(vehicle, "modelo") || "Modelo no especificado");
    titleGroup.append(eyebrow, title);
    const id = getVehicleValue(vehicle, "id", "vehiculo_id");
    if (id !== null) {
        const idBadge = document.createElement("span");
        idBadge.className = "id-badge";
        idBadge.textContent = `#${id}`;
        header.append(titleGroup, idBadge);
    } else {
        header.append(titleGroup);
    }

    const fields = document.createElement("div");
    fields.className = "vehicle-fields";
    appendField(fields, "Año", getVehicleValue(vehicle, "anio", "año"));
    appendField(fields, "Color", getVehicleValue(vehicle, "color"));
    const price = getVehicleValue(vehicle, "precio");
    appendField(fields, "Precio", price === null ? null : formatPrice(price), "price");

    const knownKeys = new Set(["id", "vehiculo_id", "tipo", "marca", "modelo", "anio", "año", "color", "precio"]);
    Object.entries(vehicle)
        .filter(([key, value]) => !knownKeys.has(key) && value !== null && value !== undefined && typeof value !== "object")
        .slice(0, 3)
        .forEach(([key, value]) => appendField(fields, key.replaceAll("_", " "), value));

    body.append(header, fields);
    article.append(visual, body);
    return article;
}

function renderSkeletons() {
    elements.grid.replaceChildren();
    for (let index = 0; index < 4; index += 1) {
        const skeleton = document.createElement("div");
        skeleton.className = "vehicle-card skeleton-card";
        skeleton.setAttribute("aria-hidden", "true");
        skeleton.innerHTML = '<div class="skeleton visual-skeleton"></div><div class="skeleton-lines"><span></span><span></span><span></span></div>';
        elements.grid.append(skeleton);
    }
}

function renderEmpty(title, message, retry = false) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const mark = document.createElement("span");
    mark.className = "empty-mark";
    mark.textContent = retry ? "!" : "0";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = message;
    empty.append(mark, heading, text);
    if (retry) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button secondary-button";
        button.textContent = "Reintentar conexión";
        button.addEventListener("click", () => loadActiveCategory());
        empty.append(button);
    }
    elements.grid.replaceChildren(empty);
}

function updateKpis(categoryState) {
    elements.kpiRecords.textContent = categoryState.status === "success" ? String(categoryState.records.length) : "—";
    elements.kpiService.textContent = CATEGORIES[state.active].label;
    elements.kpiUpdated.textContent = formatTime(categoryState.updatedAt);
    elements.activeService.textContent = CATEGORIES[state.active].label;
}

function render() {
    const categoryState = state.categories[state.active];
    const category = CATEGORIES[state.active];
    updateKpis(categoryState);
    elements.tabs.forEach((tab) => {
        const selected = tab.dataset.category === state.active;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
    });
    elements.refresh.disabled = categoryState.status === "loading";
    elements.search.disabled = categoryState.status !== "success";
    elements.order.disabled = categoryState.status !== "success";

    if (categoryState.status === "loading") {
        elements.status.className = "catalog-status loading";
        elements.status.textContent = `Consultando ${category.label.toLocaleLowerCase("es-MX")}…`;
        elements.resultCount.textContent = "Cargando datos reales";
        renderSkeletons();
        return;
    }

    if (categoryState.status === "error") {
        elements.status.className = "catalog-status error";
        elements.status.textContent = categoryState.error;
        elements.resultCount.textContent = "Servicio no disponible";
        renderEmpty(`No pudimos cargar ${category.label.toLocaleLowerCase("es-MX")}`, categoryState.error, true);
        return;
    }

    if (categoryState.status === "idle") {
        elements.status.className = "catalog-status";
        elements.status.textContent = "Preparando consulta…";
        elements.resultCount.textContent = "Sin consulta todavía";
        renderEmpty("Consulta pendiente", "Los registros aparecerán aquí al recibir una respuesta válida de la API.");
        return;
    }

    const visibleRecords = filterAndSort(categoryState.records, state.query, state.order);
    elements.status.className = "catalog-status success";
    elements.status.textContent = `${categoryState.records.length} registros recibidos correctamente a las ${formatTime(categoryState.updatedAt)}.`;
    elements.resultCount.textContent = state.query
        ? `${visibleRecords.length} de ${categoryState.records.length} resultados`
        : `${visibleRecords.length} ${visibleRecords.length === 1 ? "registro" : "registros"}`;

    if (!categoryState.records.length) {
        renderEmpty("No hay registros disponibles", `La API respondió correctamente, pero no devolvió ${category.label.toLocaleLowerCase("es-MX")}.`);
        return;
    }
    if (!visibleRecords.length) {
        renderEmpty("Sin coincidencias", "Prueba con otra marca o modelo.");
        return;
    }
    elements.grid.replaceChildren(...visibleRecords.map((vehicle) => createVehicleCard(vehicle, state.active)));
}

async function loadActiveCategory() {
    const categoryKey = state.active;
    const category = CATEGORIES[categoryKey];
    const categoryState = state.categories[categoryKey];
    categoryState.status = "loading";
    categoryState.error = null;
    render();

    try {
        const response = await fetch(category.endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
        const rawBody = await response.text();
        let payload;
        try {
            payload = rawBody ? JSON.parse(rawBody) : null;
        } catch {
            throw new Error("El servidor devolvió una respuesta no válida.");
        }
        if (!response.ok) throw new Error(payload?.error || `La consulta terminó con código HTTP ${response.status}.`);
        categoryState.records = normalizePayload(payload);
        categoryState.updatedAt = new Date();
        categoryState.status = "success";
    } catch (error) {
        categoryState.status = "error";
        categoryState.error = error instanceof Error ? error.message : "No fue posible completar la consulta.";
    }
    render();
}

elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        state.active = tab.dataset.category;
        state.query = "";
        elements.search.value = "";
        render();
        loadActiveCategory();
    });
});
elements.refresh.addEventListener("click", loadActiveCategory);
elements.search.addEventListener("input", (event) => { state.query = event.target.value; render(); });
elements.order.addEventListener("change", (event) => { state.order = event.target.value; render(); });

render();
loadActiveCategory();
