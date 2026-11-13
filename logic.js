(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AracLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FUEL_TYPES = [
    { id: "gasoline", name: "Benzin" },
    { id: "gasoline_lpg", name: "Benzin + LPG" },
    { id: "diesel", name: "Dizel" },
    { id: "lpg", name: "LPG" },
    { id: "hybrid", name: "Hibrit" },
    { id: "electric", name: "Elektrik" }
  ];

  const FUEL_KINDS = [
    { id: "gasoline", name: "Benzin" },
    { id: "lpg", name: "LPG" }
  ];

  const STATIONS = ["Shell", "Opet", "TP", "Aytemiz"];

  const MAINTENANCE_ITEMS = [
    { id: "oil", name: "Yağ" },
    { id: "air", name: "Hava filtresi" },
    { id: "fuel", name: "Yakıt filtresi" },
    { id: "pollen", name: "Polen filtresi" }
  ];

  const SERVICE_TYPES = [
    { id: "general", name: "Genel bakım", short: "Genel" },
    { id: "oil", name: "Motor yağı", short: "Yağ" },
    { id: "filter", name: "Filtre", short: "Filtre" },
    { id: "tire", name: "Lastik", short: "Lastik" },
    { id: "brake", name: "Fren", short: "Fren" },
    { id: "inspection", name: "Muayene", short: "Muayene" },
    { id: "insurance", name: "Sigorta", short: "Sigorta" },
    { id: "battery", name: "Akü", short: "Akü" },
    { id: "other", name: "Diğer", short: "Diğer" }
  ];

  const EXPENSE_CATEGORIES = [
    { id: "fuel", name: "Yakıt", color: "#2563eb" },
    { id: "service", name: "Bakım", color: "#0ea5e9" },
    { id: "insurance", name: "Sigorta", color: "#8b5cf6" },
    { id: "tax", name: "Vergi / MTV", color: "#f59e0b" },
    { id: "fine", name: "Ceza", color: "#ef4444" },
    { id: "parking", name: "Otopark", color: "#14b8a6" },
    { id: "wash", name: "Yıkama", color: "#22c55e" },
    { id: "toll", name: "Köprü / Otoyol", color: "#64748b" },
    { id: "other", name: "Diğer", color: "#94a3b8" }
  ];

  const DOCUMENT_TYPES = [
    { id: "registration", name: "Ruhsat" },
    { id: "insurance", name: "Sigorta poliçesi" },
    { id: "inspection", name: "Muayene belgesi" },
    { id: "license", name: "Ehliyet" },
    { id: "invoice", name: "Fatura" },
    { id: "other", name: "Diğer" }
  ];

  const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const WEEKDAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const CURRENCIES = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };

  const SETTINGS_DEFAULTS = {
    theme: "auto",
    currency: "TRY",
    activeVehicleId: ""
  };

  const VEHICLE_INTERVALS_DEFAULTS = {
    oilKm: 10000,
    oilMonths: 12,
    inspectionMonths: 24,
    insuranceMonths: 12,
    tireKm: 40000,
    tireMonths: 60,
    inspectionDate: "",
    insuranceDate: ""
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function num(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value == null || value === "") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function round(value, digits) {
    const f = Math.pow(10, digits == null ? 1 : digits);
    return Math.round((num(value) + Number.EPSILON) * f) / f;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function todayISO(now) {
    const d = now ? new Date(now) : new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function isISODate(value) {
    if (typeof value !== "string") return false;
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }

  function parseDateTR(input) {
    if (input == null) return null;
    const s = String(input).trim();
    if (!s) return null;
    if (isISODate(s)) return s;

    let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/);
    let y;
    let mo;
    let d;
    if (m) {
      d = Number(m[1]);
      mo = Number(m[2]);
      y = Number(m[3]);
    } else {
      m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
      if (!m) return null;
      d = Number(m[1]);
      mo = Number(m[2]);
      y = Number(m[3]);
    }
    if (y < 100) y += y < 70 ? 2000 : 1900;
    const iso = y + "-" + pad2(mo) + "-" + pad2(d);
    return isISODate(iso) ? iso : null;
  }

  function formatDateTR(iso) {
    if (!isISODate(iso)) return "—";
    const p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function dateFromISO(iso) {
    const p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }

  function addDaysISO(iso, days) {
    if (!isISODate(iso)) return null;
    const dt = dateFromISO(iso);
    dt.setUTCDate(dt.getUTCDate() + num(days));
    return dt.getUTCFullYear() + "-" + pad2(dt.getUTCMonth() + 1) + "-" + pad2(dt.getUTCDate());
  }

  function addMonthsISO(iso, months) {
    if (!isISODate(iso)) return null;
    const p = iso.split("-").map(Number);
    const total = p[0] * 12 + (p[1] - 1) + num(months);
    const y = Math.floor(total / 12);
    const mo = total - y * 12;
    const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return y + "-" + pad2(mo + 1) + "-" + pad2(Math.min(p[2], lastDay));
  }

  function diffDays(fromISO, toISO) {
    if (!isISODate(fromISO) || !isISODate(toISO)) return null;
    return Math.round((dateFromISO(toISO).getTime() - dateFromISO(fromISO).getTime()) / 86400000);
  }

  function weekdayTR(iso) {
    if (!isISODate(iso)) return "";
    return WEEKDAYS_TR[dateFromISO(iso).getUTCDay()];
  }

  function monthKey(iso) {
    return isISODate(iso) ? iso.slice(0, 7) : "";
  }

  function addMonthsToKey(key, months) {
    const m = String(key).match(/^(\d{4})-(\d{2})$/);
    if (!m) return "";
    const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + num(months);
    const y = Math.floor(total / 12);
    const mo = total - y * 12;
    return y + "-" + pad2(mo + 1);
  }

  function formatMonthTR(key) {
    const m = String(key).match(/^(\d{4})-(\d{2})$/);
    if (!m) return "—";
    return MONTHS_TR[Number(m[2]) - 1] + " " + m[1];
  }

  function lastNMonths(n, today) {
    const base = monthKey(today || todayISO());
    const count = Math.max(1, Math.floor(num(n)));
    const out = [];
    for (let i = count - 1; i >= 0; i--) out.push(addMonthsToKey(base, -i));
    return out;
  }

  function formatNumber(value, digits) {
    const v = num(value);
    const d = Math.max(0, Math.floor(digits == null ? 0 : digits));
    const fixed = Math.abs(v).toFixed(d);
    const parts = fixed.split(".");
    const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (v < 0 ? "-" : "") + grouped + (parts[1] ? "," + parts[1] : "");
  }

  function currencySymbol(code) {
    return CURRENCIES[code] || code || "₺";
  }

  function formatMoney(value, code) {
    return formatNumber(value, 2) + " " + currencySymbol(code || "TRY");
  }

  function parseNumberInput(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
    let s = String(value == null ? "" : value).trim();
    if (!s) return NaN;
    s = s.replace(/\s/g, "").replace(/[₺$€£]/g, "").replace(/TL$/i, "");
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if ((s.match(/\./g) || []).length > 1) {
      s = s.replace(/\./g, "");
    } else {
      const m = s.match(/^(\d+)\.(\d{3})$/);
      if (m && m[1] !== "0") s = m[1] + m[2];
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function labelFor(list, id, fallback) {
    const hit = (list || []).find(function (item) { return item.id === id; });
    return hit ? hit.name : (fallback || id || "—");
  }

  function serviceTypeName(id) {
    return labelFor(SERVICE_TYPES, id, "Diğer");
  }

  function expenseCategoryName(id) {
    return labelFor(EXPENSE_CATEGORIES, id, "Diğer");
  }

  function expenseCategoryColor(id) {
    const hit = (EXPENSE_CATEGORIES || []).find(function (item) { return item.id === id; });
    return hit ? hit.color : "#94a3b8";
  }

  function documentTypeName(id) {
    return labelFor(DOCUMENT_TYPES, id, "Diğer");
  }

  function fuelTypeName(id) {
    return labelFor(FUEL_TYPES, id, "Diğer");
  }

  function fuelKindName(id) {
    return labelFor(FUEL_KINDS, id, "");
  }

  function fuelTypeOf(vehicle) {
    if (typeof vehicle === "string") return vehicle;
    return (vehicle && vehicle.fuelType) || "";
  }

  function isElectric(vehicle) {
    return fuelTypeOf(vehicle) === "electric";
  }

  function isDualFuel(vehicle) {
    return fuelTypeOf(vehicle) === "gasoline_lpg";
  }

  function energyUnit(vehicle) {
    if (isElectric(vehicle)) {
      return {
        amount: "kWh",
        amountLower: "kWh",
        short: "kWh",
        tank: "Batarya (kWh)",
        price: "kWh fiyatı",
        consumption: "kWh/100km",
        full: "Bataryayı doldurdum",
        fullShort: "Tam şarj",
        partial: "Kısmi şarj"
      };
    }
    return {
      amount: "Litre",
      amountLower: "litre",
      short: "L",
      tank: "Depo (L)",
      price: "Litre fiyatı",
      consumption: "L/100km",
      full: "Depoyu doldurdum",
      fullShort: "Dolu",
      partial: "Kısmi dolum"
    };
  }

  function validMaintenanceItems(items) {
    const list = Array.isArray(items) ? items : [];
    return MAINTENANCE_ITEMS.filter(function (item) {
      return list.indexOf(item.id) >= 0;
    }).map(function (item) { return item.id; });
  }

  function serviceItems(service) {
    if (!service || service.type !== "general") return [];
    return validMaintenanceItems(service.items);
  }

  function maintenanceItemsText(items) {
    const ids = validMaintenanceItems(items);
    return MAINTENANCE_ITEMS.filter(function (item) {
      return ids.indexOf(item.id) >= 0;
    }).map(function (item) { return item.name; }).join(", ");
  }

  function defaultState() {
    return {
      version: 1,
      settings: Object.assign({}, SETTINGS_DEFAULTS),
      vehicles: [],
      fuelLogs: [],
      services: [],
      expenses: [],
      documents: [],
      reminders: []
    };
  }

  function defaultIntervals() {
    return Object.assign({}, VEHICLE_INTERVALS_DEFAULTS);
  }

  function normalizeVehicle(raw) {
    const v = raw || {};
    const intervals = Object.assign({}, VEHICLE_INTERVALS_DEFAULTS, v.intervals || {});
    ["oilKm", "oilMonths", "inspectionMonths", "insuranceMonths", "tireKm", "tireMonths"].forEach(function (key) {
      intervals[key] = Math.max(0, Math.round(num(intervals[key])));
    });
    intervals.inspectionDate = isISODate(intervals.inspectionDate) ? intervals.inspectionDate : "";
    intervals.insuranceDate = isISODate(intervals.insuranceDate) ? intervals.insuranceDate : "";
    return {
      id: String(v.id || uid("vehicle")),
      name: String(v.name || "").trim(),
      plate: String(v.plate || "").trim().toUpperCase(),
      brand: String(v.brand || "").trim(),
      model: String(v.model || "").trim(),
      year: Math.round(num(v.year)) || 0,
      fuelType: FUEL_TYPES.some(function (f) { return f.id === v.fuelType; }) ? v.fuelType : "gasoline",
      tankL: Math.max(0, num(v.tankL)),
      purchaseOdometer: Math.max(0, Math.round(num(v.purchaseOdometer))),
      purchaseDate: isISODate(v.purchaseDate) ? v.purchaseDate : "",
      intervals: intervals,
      createdAt: v.createdAt || new Date().toISOString()
    };
  }

  function vehicleName(vehicle) {
    if (!vehicle) return "Araç";
    if (vehicle.name) return vehicle.name;
    const parts = [vehicle.brand, vehicle.model].filter(Boolean);
    if (parts.length) return parts.join(" ");
    return vehicle.plate || "Araç";
  }

  function vehicleSubtitle(vehicle) {
    if (!vehicle) return "";
    const parts = [];
    if (vehicle.plate) parts.push(vehicle.plate);
    if (vehicle.brand || vehicle.model) parts.push([vehicle.brand, vehicle.model].filter(Boolean).join(" "));
    if (vehicle.year) parts.push(String(vehicle.year));
    return parts.join(" · ");
  }

  function arrayOf(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Geçersiz yedek dosyası.");
    }
    if (!Array.isArray(raw.vehicles)) {
      throw new Error("Yedek dosyasında araç listesi bulunamadı.");
    }

    const settings = Object.assign({}, SETTINGS_DEFAULTS, raw.settings || {});
    if (settings.theme !== "light" && settings.theme !== "dark") settings.theme = "auto";
    if (!CURRENCIES[settings.currency]) settings.currency = "TRY";

    const vehicles = raw.vehicles.map(normalizeVehicle).filter(function (v) { return v.id; });
    const byId = {};
    vehicles.forEach(function (v) { byId[v.id] = v; });

    function keep(item) {
      return item && typeof item === "object" && byId[item.vehicleId];
    }

    const fuelLogs = arrayOf(raw.fuelLogs).filter(keep).map(function (log) {
      return {
        id: String(log.id || uid("fuel")),
        vehicleId: log.vehicleId,
        date: isISODate(log.date) ? log.date : todayISO(),
        odometer: Math.max(0, Math.round(num(log.odometer))),
        liters: Math.max(0, num(log.liters)),
        pricePerL: Math.max(0, num(log.pricePerL)),
        total: Math.max(0, num(log.total)),
        full: !!log.full,
        fuelKind: FUEL_KINDS.some(function (k) { return k.id === log.fuelKind; }) ? log.fuelKind : "",
        station: String(log.station || "").trim(),
        note: String(log.note || "").trim(),
        createdAt: log.createdAt || new Date().toISOString()
      };
    });

    const services = arrayOf(raw.services).filter(keep).map(function (s) {
      const type = SERVICE_TYPES.some(function (t) { return t.id === s.type; }) ? s.type : "other";
      const rawItems = Array.isArray(s.items) ? s.items : null;
      const items = type === "general"
        ? (rawItems ? validMaintenanceItems(rawItems) : MAINTENANCE_ITEMS.map(function (item) { return item.id; }))
        : [];
      return {
        id: String(s.id || uid("service")),
        vehicleId: s.vehicleId,
        type: type,
        items: items,
        date: isISODate(s.date) ? s.date : todayISO(),
        odometer: Math.max(0, Math.round(num(s.odometer))),
        cost: Math.max(0, num(s.cost)),
        note: String(s.note || "").trim(),
        nextDate: isISODate(s.nextDate) ? s.nextDate : "",
        nextOdometer: Math.max(0, Math.round(num(s.nextOdometer))),
        createdAt: s.createdAt || new Date().toISOString()
      };
    });

    const expenses = arrayOf(raw.expenses).filter(keep).map(function (e) {
      return {
        id: String(e.id || uid("expense")),
        vehicleId: e.vehicleId,
        date: isISODate(e.date) ? e.date : todayISO(),
        category: EXPENSE_CATEGORIES.some(function (c) { return c.id === e.category; }) ? e.category : "other",
        amount: Math.max(0, num(e.amount)),
        odometer: Math.max(0, Math.round(num(e.odometer))),
        note: String(e.note || "").trim(),
        createdAt: e.createdAt || new Date().toISOString()
      };
    });

    const documents = arrayOf(raw.documents).filter(keep).map(function (d) {
      return {
        id: String(d.id || uid("doc")),
        vehicleId: d.vehicleId,
        title: String(d.title || "").trim(),
        type: DOCUMENT_TYPES.some(function (t) { return t.id === d.type; }) ? d.type : "other",
        number: String(d.number || "").trim(),
        issuedDate: isISODate(d.issuedDate) ? d.issuedDate : "",
        expiryDate: isISODate(d.expiryDate) ? d.expiryDate : "",
        note: String(d.note || "").trim(),
        hasPhoto: !!d.hasPhoto,
        createdAt: d.createdAt || new Date().toISOString()
      };
    });

    const reminders = arrayOf(raw.reminders).filter(keep).map(function (r) {
      return {
        id: String(r.id || uid("reminder")),
        vehicleId: r.vehicleId,
        title: String(r.title || "Hatırlatma").trim() || "Hatırlatma",
        dueDate: isISODate(r.dueDate) ? r.dueDate : "",
        dueOdometer: Math.max(0, Math.round(num(r.dueOdometer))),
        done: !!r.done,
        createdAt: r.createdAt || new Date().toISOString()
      };
    });

    if (!byId[settings.activeVehicleId]) {
      settings.activeVehicleId = vehicles.length ? vehicles[0].id : "";
    }

    return {
      version: 1,
      settings: settings,
      vehicles: vehicles,
      fuelLogs: fuelLogs,
      services: services,
      expenses: expenses,
      documents: documents,
      reminders: reminders
    };
  }

  function activeVehicle(state) {
    if (!state || !state.vehicles) return null;
    const id = state.settings && state.settings.activeVehicleId;
    return state.vehicles.find(function (v) { return v.id === id; }) || state.vehicles[0] || null;
  }

  function forVehicle(items, vehicleId) {
    return arrayOf(items).filter(function (item) { return item.vehicleId === vehicleId; });
  }

  function sortByDateDesc(items) {
    return arrayOf(items).slice().sort(function (a, b) {
      const da = a.date || "";
      const db = b.date || "";
      if (da !== db) return db.localeCompare(da);
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function latestOdometerFrom(items) {
    let max = 0;
    arrayOf(items).forEach(function (item) {
      const value = num(item.odometer);
      if (value > max) max = value;
    });
    return max;
  }

  function currentOdometer(state, vehicleId) {
    const vehicle = arrayOf(state.vehicles).find(function (v) { return v.id === vehicleId; });
    const logs = [
      num(vehicle && vehicle.purchaseOdometer),
      latestOdometerFrom(forVehicle(state.fuelLogs, vehicleId)),
      latestOdometerFrom(forVehicle(state.services, vehicleId)),
      latestOdometerFrom(forVehicle(state.expenses, vehicleId))
    ];
    return Math.max.apply(null, logs);
  }

  function fuelLogTotal(log) {
    const total = num(log.total);
    if (total > 0) return total;
    return round(num(log.liters) * num(log.pricePerL), 2);
  }

  function consumptionPer100(liters, km) {
    if (!(num(liters) > 0) || !(num(km) > 0)) return 0;
    return round((num(liters) * 100) / num(km), 2);
  }

  function fuelConsumptionEntries(logs) {
    const sorted = arrayOf(logs)
      .filter(function (log) { return log && num(log.odometer) >= 0 && (num(log.liters) > 0 || log.full); })
      .slice()
      .sort(function (a, b) {
        if (num(a.odometer) !== num(b.odometer)) return num(a.odometer) - num(b.odometer);
        return String(a.date || "").localeCompare(String(b.date || ""));
      });

    const out = [];
    let baseOdometer = null;
    let accLiters = 0;
    let accCost = 0;

    sorted.forEach(function (log) {
      if (!log.full) {
        if (baseOdometer != null) {
          accLiters += num(log.liters);
          accCost += fuelLogTotal(log);
        }
        return;
      }
      const liters = accLiters + num(log.liters);
      const cost = accCost + fuelLogTotal(log);
      if (baseOdometer != null) {
        const km = num(log.odometer) - baseOdometer;
        if (km > 0 && liters > 0) {
          out.push({
            id: log.id,
            date: log.date,
            odometer: num(log.odometer),
            km: km,
            liters: round(liters, 2),
            cost: round(cost, 2),
            per100: consumptionPer100(liters, km),
            costPerKm: round(cost / km, 2)
          });
        }
      }
      baseOdometer = num(log.odometer);
      accLiters = 0;
      accCost = 0;
    });

    return out;
  }

  function avgConsumption(entries, lastN) {
    const list = arrayOf(entries);
    const take = lastN == null ? list.length : Math.max(1, Math.floor(num(lastN)));
    const window = take >= list.length ? list : list.slice(list.length - take);
    let liters = 0;
    let km = 0;
    window.forEach(function (entry) {
      liters += num(entry.liters);
      km += num(entry.km);
    });
    return consumptionPer100(liters, km);
  }

  function fuelTotals(logs) {
    const list = arrayOf(logs).filter(function (log) {
      return log && (num(log.liters) > 0 || fuelLogTotal(log) > 0);
    });
    let liters = 0;
    let cost = 0;
    let fullCount = 0;
    let minOdo = Infinity;
    let maxOdo = 0;
    list.forEach(function (log) {
      liters += num(log.liters);
      cost += fuelLogTotal(log);
      if (log.full) fullCount += 1;
      if (num(log.odometer) > 0) {
        minOdo = Math.min(minOdo, num(log.odometer));
        maxOdo = Math.max(maxOdo, num(log.odometer));
      }
    });
    const distance = maxOdo > minOdo ? maxOdo - minOdo : 0;
    return {
      entries: list.length,
      fullCount: fullCount,
      liters: round(liters, 2),
      cost: round(cost, 2),
      distance: distance,
      avgPrice: liters > 0 ? round(cost / liters, 2) : 0
    };
  }

  function fuelBreakdown(logs) {
    return FUEL_KINDS.map(function (kind) {
      const list = arrayOf(logs).filter(function (log) { return log && log.fuelKind === kind.id; });
      const entries = fuelConsumptionEntries(list);
      return {
        kind: kind.id,
        name: kind.name,
        logs: list,
        totals: fuelTotals(list),
        entries: entries,
        avgConsumption: avgConsumption(entries, 3),
        lastConsumption: entries.length ? entries[entries.length - 1] : null
      };
    });
  }

  function costEntries(state, vehicleId) {
    const out = [];
    forVehicle(state.fuelLogs, vehicleId).forEach(function (log) {
      out.push({
        id: log.id,
        kind: "fuel",
        category: "fuel",
        date: log.date,
        amount: fuelLogTotal(log),
        odometer: num(log.odometer),
        title: log.fuelKind ? "Yakıt · " + fuelKindName(log.fuelKind) : "Yakıt",
        note: log.note || "",
        source: log
      });
    });
    forVehicle(state.services, vehicleId).forEach(function (s) {
      out.push({
        id: s.id,
        kind: "service",
        category: "service",
        date: s.date,
        amount: num(s.cost),
        odometer: num(s.odometer),
        title: serviceTypeName(s.type),
        note: s.note || "",
        source: s
      });
    });
    forVehicle(state.expenses, vehicleId).forEach(function (e) {
      out.push({
        id: e.id,
        kind: "expense",
        category: e.category,
        date: e.date,
        amount: num(e.amount),
        odometer: num(e.odometer),
        title: expenseCategoryName(e.category),
        note: e.note || "",
        source: e
      });
    });
    return out.filter(function (entry) { return num(entry.amount) > 0; });
  }

  function monthlyTotals(entries, nMonths, today) {
    const months = lastNMonths(nMonths || 6, today || todayISO());
    const map = {};
    months.forEach(function (key) { map[key] = 0; });
    arrayOf(entries).forEach(function (entry) {
      const key = monthKey(entry.date);
      if (Object.prototype.hasOwnProperty.call(map, key)) map[key] += num(entry.amount);
    });
    return months.map(function (key) {
      return { key: key, label: formatMonthTR(key), total: round(map[key], 2) };
    });
  }

  function categoryTotals(entries) {
    const map = {};
    arrayOf(entries).forEach(function (entry) {
      const key = entry.category || "other";
      if (!map[key]) map[key] = { category: key, name: expenseCategoryName(key), color: expenseCategoryColor(key), total: 0, count: 0 };
      map[key].total += num(entry.amount);
      map[key].count += 1;
    });
    return Object.keys(map).map(function (key) {
      map[key].total = round(map[key].total, 2);
      return map[key];
    }).sort(function (a, b) { return b.total - a.total; });
  }

  function sumAmount(entries) {
    return round(arrayOf(entries).reduce(function (acc, entry) { return acc + num(entry.amount); }, 0), 2);
  }

  function entriesBetween(entries, fromISO, toISO) {
    return arrayOf(entries).filter(function (entry) {
      return entry.date >= fromISO && entry.date <= toISO;
    });
  }

  function odometerRange(state, vehicleId) {
    const vehicle = arrayOf(state.vehicles).find(function (v) { return v.id === vehicleId; });
    const values = [];
    if (vehicle && num(vehicle.purchaseOdometer) > 0) values.push(num(vehicle.purchaseOdometer));
    [state.fuelLogs, state.services, state.expenses].forEach(function (list) {
      forVehicle(list, vehicleId).forEach(function (item) {
        if (num(item.odometer) > 0) values.push(num(item.odometer));
      });
    });
    if (!values.length) return { min: 0, max: 0, distance: 0 };
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    return { min: min, max: max, distance: max - min };
  }

  function costPerKm(state, vehicleId) {
    const entries = costEntries(state, vehicleId);
    const total = sumAmount(entries);
    const range = odometerRange(state, vehicleId);
    return range.distance > 0 ? round(total / range.distance, 2) : 0;
  }

  function reminderStatus(item, today, currentOdo) {
    const dueDate = isISODate(item.dueDate) ? item.dueDate : "";
    const dueOdometer = num(item.dueOdometer);
    const hasDate = !!dueDate;
    const hasKm = dueOdometer > 0 && num(currentOdo) > 0;

    if (!hasDate && !hasKm) {
      return { state: "none", days: null, km: null, rank: 0 };
    }

    let rank = 0;
    let days = null;
    let km = null;

    if (hasDate) {
      days = diffDays(today, dueDate);
      if (days < 0) rank = Math.max(rank, 2);
      else if (days <= 30) rank = Math.max(rank, 1);
    }
    if (hasKm) {
      km = Math.round(dueOdometer - num(currentOdo));
      if (km < 0) rank = Math.max(rank, 2);
      else if (km <= 1000) rank = Math.max(rank, 1);
    }

    const states = ["ok", "soon", "overdue"];
    return { state: states[rank], days: days, km: km, rank: rank };
  }

  function autoReminders(vehicle, services, today, currentOdo) {
    if (!vehicle) return [];
    const intervals = Object.assign({}, VEHICLE_INTERVALS_DEFAULTS, vehicle.intervals || {});
    const specs = [
      { type: "oil", title: "Motor yağı", kmKey: "oilKm", monthKey: "oilMonths" },
      { type: "inspection", title: "Muayene", monthKey: "inspectionMonths", dateKey: "inspectionDate" },
      { type: "insurance", title: "Sigorta", monthKey: "insuranceMonths", dateKey: "insuranceDate" },
      { type: "tire", title: "Lastik", kmKey: "tireKm", monthKey: "tireMonths" }
    ];

    return specs.map(function (spec) {
      const related = forVehicle(services, vehicle.id).filter(function (s) {
        if (s.type === spec.type) return true;
        return spec.type === "oil" && s.type === "general" && serviceItems(s).indexOf("oil") >= 0;
      });
      const last = sortByDateDesc(related)[0] || null;
      const baseDate = (last && last.date) || vehicle.purchaseDate || "";
      const baseOdo = last && num(last.odometer) > 0 ? num(last.odometer) : num(vehicle.purchaseOdometer);
      const explicitDate = spec.dateKey && isISODate(intervals[spec.dateKey]) ? intervals[spec.dateKey] : "";
      const months = num(intervals[spec.monthKey]);
      const kmInterval = spec.kmKey ? num(intervals[spec.kmKey]) : 0;

      let dueDate = "";
      if (explicitDate) dueDate = explicitDate;
      else if (isISODate(baseDate) && months > 0) dueDate = addMonthsISO(baseDate, months);

      let dueOdometer = 0;
      if (kmInterval > 0 && baseOdo > 0) dueOdometer = baseOdo + kmInterval;

      if (!dueDate && !dueOdometer) return null;

      const item = {
        id: "auto-" + vehicle.id + "-" + spec.type,
        vehicleId: vehicle.id,
        title: spec.title,
        dueDate: dueDate,
        dueOdometer: dueOdometer,
        source: "auto",
        type: spec.type
      };
      const status = reminderStatus(item, today, currentOdo);
      return Object.assign(item, { status: status.state, days: status.days, km: status.km, rank: status.rank });
    }).filter(Boolean);
  }

  function manualReminders(state, vehicleId, today, currentOdo) {
    return forVehicle(state.reminders, vehicleId).filter(function (r) { return !r.done; }).map(function (r) {
      const status = reminderStatus(r, today, currentOdo);
      return Object.assign({}, r, {
        source: "manual",
        status: status.state,
        days: status.days,
        km: status.km,
        rank: status.rank
      });
    });
  }

  function upcomingReminders(state, vehicleId, today, currentOdo) {
    const vehicle = arrayOf(state.vehicles).find(function (v) { return v.id === vehicleId; });
    const odo = currentOdo == null ? currentOdometer(state, vehicleId) : currentOdo;
    const items = autoReminders(vehicle, state.services, today || todayISO(), odo)
      .concat(manualReminders(state, vehicleId, today || todayISO(), odo));
    return items.sort(function (a, b) {
      if (b.rank !== a.rank) return b.rank - a.rank;
      const ad = a.days == null ? Infinity : a.days;
      const bd = b.days == null ? Infinity : b.days;
      if (ad !== bd) return ad - bd;
      const ak = a.km == null ? Infinity : a.km;
      const bk = b.km == null ? Infinity : b.km;
      return ak - bk;
    });
  }

  function reminderText(item) {
    const parts = [];
    if (item.days != null) {
      if (item.days === 0) parts.push("bugün");
      else if (item.days < 0) parts.push(Math.abs(item.days) + " gün gecikti");
      else parts.push(item.days + " gün kaldı");
    }
    if (item.km != null) {
      if (item.km === 0) parts.push("KM tamam");
      else if (item.km < 0) parts.push(Math.abs(item.km) + " km gecikti");
      else parts.push(item.km + " km kaldı");
    }
    return parts.join(" · ");
  }

  function dashboard(state, vehicleId, today) {
    const day = today || todayISO();
    const vehicle = arrayOf(state.vehicles).find(function (v) { return v.id === vehicleId; }) || null;
    const logs = forVehicle(state.fuelLogs, vehicleId);
    const consumption = fuelConsumptionEntries(logs);
    const fuel = fuelTotals(logs);
    const entries = costEntries(state, vehicleId);
    const monthStart = monthKey(day) + "-01";
    const monthCost = sumAmount(entriesBetween(entries, monthStart, day));
    const odo = currentOdometer(state, vehicleId);
    return {
      vehicle: vehicle,
      odometer: odo,
      lastFuel: sortByDateDesc(logs)[0] || null,
      consumptionEntries: consumption,
      lastConsumption: consumption.length ? consumption[consumption.length - 1] : null,
      avgConsumption: avgConsumption(consumption, 3),
      avgConsumptionAll: avgConsumption(consumption),
      fuelTotals: fuel,
      fuelBreakdown: isDualFuel(vehicle) ? fuelBreakdown(logs) : [],
      totalCost: sumAmount(entries),
      monthCost: monthCost,
      costPerKm: costPerKm(state, vehicleId),
      reminders: upcomingReminders(state, vehicleId, day, odo),
      recent: entries.slice().sort(function (a, b) {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return String(b.source.createdAt || "").localeCompare(String(a.source.createdAt || ""));
      }).slice(0, 6)
    };
  }

  function statusLabel(state) {
    return { overdue: "Gecikti", soon: "Yaklaşıyor", ok: "Planlı", none: "Tarih yok" }[state] || "—";
  }

  return {
    FUEL_TYPES: FUEL_TYPES,
    FUEL_KINDS: FUEL_KINDS,
    STATIONS: STATIONS,
    MAINTENANCE_ITEMS: MAINTENANCE_ITEMS,
    SERVICE_TYPES: SERVICE_TYPES,
    EXPENSE_CATEGORIES: EXPENSE_CATEGORIES,
    DOCUMENT_TYPES: DOCUMENT_TYPES,
    CURRENCIES: CURRENCIES,
    SETTINGS_DEFAULTS: SETTINGS_DEFAULTS,
    VEHICLE_INTERVALS_DEFAULTS: VEHICLE_INTERVALS_DEFAULTS,
    pad2: pad2,
    num: num,
    round: round,
    clamp: clamp,
    uid: uid,
    todayISO: todayISO,
    isISODate: isISODate,
    parseDateTR: parseDateTR,
    formatDateTR: formatDateTR,
    addDaysISO: addDaysISO,
    addMonthsISO: addMonthsISO,
    diffDays: diffDays,
    weekdayTR: weekdayTR,
    monthKey: monthKey,
    addMonthsToKey: addMonthsToKey,
    formatMonthTR: formatMonthTR,
    lastNMonths: lastNMonths,
    formatNumber: formatNumber,
    currencySymbol: currencySymbol,
    formatMoney: formatMoney,
    parseNumberInput: parseNumberInput,
    serviceTypeName: serviceTypeName,
    expenseCategoryName: expenseCategoryName,
    expenseCategoryColor: expenseCategoryColor,
    documentTypeName: documentTypeName,
    fuelTypeName: fuelTypeName,
    fuelKindName: fuelKindName,
    isElectric: isElectric,
    isDualFuel: isDualFuel,
    energyUnit: energyUnit,
    validMaintenanceItems: validMaintenanceItems,
    serviceItems: serviceItems,
    maintenanceItemsText: maintenanceItemsText,
    defaultState: defaultState,
    defaultIntervals: defaultIntervals,
    normalizeVehicle: normalizeVehicle,
    normalizeState: normalizeState,
    activeVehicle: activeVehicle,
    forVehicle: forVehicle,
    sortByDateDesc: sortByDateDesc,
    currentOdometer: currentOdometer,
    vehicleName: vehicleName,
    vehicleSubtitle: vehicleSubtitle,
    fuelLogTotal: fuelLogTotal,
    consumptionPer100: consumptionPer100,
    fuelConsumptionEntries: fuelConsumptionEntries,
    avgConsumption: avgConsumption,
    fuelTotals: fuelTotals,
    fuelBreakdown: fuelBreakdown,
    costEntries: costEntries,
    monthlyTotals: monthlyTotals,
    categoryTotals: categoryTotals,
    sumAmount: sumAmount,
    entriesBetween: entriesBetween,
    odometerRange: odometerRange,
    costPerKm: costPerKm,
    reminderStatus: reminderStatus,
    autoReminders: autoReminders,
    manualReminders: manualReminders,
    upcomingReminders: upcomingReminders,
    reminderText: reminderText,
    dashboard: dashboard,
    statusLabel: statusLabel
  };
});
