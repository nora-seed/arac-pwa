const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

function vehicle(overrides) {
  return Object.assign(L.normalizeVehicle({
    id: "v1",
    name: "Test Aracı",
    plate: "34ABC123",
    purchaseDate: "2025-01-01",
    purchaseOdometer: 50000,
    intervals: { oilKm: 10000, oilMonths: 12, inspectionDate: "2026-12-01" }
  }), overrides || {});
}

function fuel(overrides) {
  return Object.assign({
    id: L.uid("fuel"),
    vehicleId: "v1",
    date: "2026-01-01",
    odometer: 1000,
    liters: 40,
    pricePerL: 40,
    total: 1600,
    full: true
  }, overrides || {});
}

test("tarih gg/aa/yyyy biçimlenir ve ayrıştırılır", function () {
  assert.equal(L.formatDateTR("2026-11-03"), "03/11/2026");
  assert.equal(L.parseDateTR("03/11/2026"), "2026-11-03");
  assert.equal(L.parseDateTR("3.11.2026"), "2026-11-03");
  assert.equal(L.parseDateTR("03112026"), "2026-11-03");
  assert.equal(L.parseDateTR("2026-11-03"), "2026-11-03");
  assert.equal(L.parseDateTR("3/11/26"), "2026-11-03");
  assert.equal(L.parseDateTR("31/02/2026"), null);
  assert.equal(L.parseDateTR("03/13/2026"), null);
  assert.equal(L.parseDateTR("01/01/1800"), null);
  assert.equal(L.parseDateTR("abc"), null);
  assert.equal(L.formatDateTR("bozuk"), "—");
});

test("tarih aritmetiği ve ay sonu taşması", function () {
  assert.equal(L.addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(L.addDaysISO("2026-01-01", -1), "2025-12-31");
  assert.equal(L.addMonthsISO("2026-01-31", 1), "2026-02-28");
  assert.equal(L.addMonthsISO("2024-01-31", 1), "2024-02-29");
  assert.equal(L.addMonthsISO("2026-11-13", 12), "2027-11-13");
  assert.equal(L.diffDays("2026-11-01", "2026-11-13"), 12);
  assert.equal(L.weekdayTR("2026-11-13"), "Cuma");
  assert.equal(L.addMonthsToKey("2026-01", -1), "2025-12");
  assert.equal(L.formatMonthTR("2026-11"), "Kas 2026");
  assert.deepEqual(L.lastNMonths(3, "2026-11-13"), ["2026-09", "2026-10", "2026-11"]);
});

test("sayı girişi Türkçe biçimleri anlar", function () {
  assert.equal(L.parseNumberInput("1.234,56"), 1234.56);
  assert.equal(L.parseNumberInput("1.234"), 1234);
  assert.equal(L.parseNumberInput("1,5"), 1.5);
  assert.equal(L.parseNumberInput("0.5"), 0.5);
  assert.equal(L.parseNumberInput("₺1.500,00"), 1500);
  assert.equal(L.parseNumberInput(" 42 "), 42);
  assert.ok(Number.isNaN(L.parseNumberInput("abc")));
  assert.ok(Number.isNaN(L.parseNumberInput("")));
  assert.equal(L.formatNumber(1234.5, 2), "1.234,50");
  assert.equal(L.formatMoney(1234.5, "TRY"), "1.234,50 ₺");
  assert.equal(L.formatMoney(9.9, "USD"), "9,90 $");
});

test("dolu depo yöntemiyle tüketim hesaplanır", function () {
  const logs = [
    fuel({ id: "a", date: "2026-01-01", odometer: 1000, liters: 40, total: 1600, full: true }),
    fuel({ id: "b", date: "2026-01-10", odometer: 1200, liters: 20, total: 800, full: false }),
    fuel({ id: "c", date: "2026-01-20", odometer: 1400, liters: 25, total: 1000, full: true }),
    fuel({ id: "d", date: "2026-02-01", odometer: 1900, liters: 30, total: 1200, full: true })
  ];
  const entries = L.fuelConsumptionEntries(logs);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].km, 400);
  assert.equal(entries[0].liters, 45);
  assert.equal(entries[0].per100, 11.25);
  assert.equal(entries[0].cost, 1800);
  assert.equal(entries[0].costPerKm, 4.5);
  assert.equal(entries[1].per100, 6);
  assert.equal(L.avgConsumption(entries, 2), 8.33);
  assert.equal(L.avgConsumption(entries, 1), 6);
});

test("ilk dolu depo olmadan tüketim üretilmez", function () {
  const logs = [
    fuel({ odometer: 100, liters: 10, full: false }),
    fuel({ odometer: 300, liters: 20, full: true })
  ];
  assert.deepEqual(L.fuelConsumptionEntries(logs), []);
  assert.equal(L.consumptionPer100(0, 100), 0);
  assert.equal(L.consumptionPer100(8, 0), 0);
  assert.equal(L.consumptionPer100(8, 100), 8);
});

test("yakıt toplamları litre, maliyet ve mesafeyi birleştirir", function () {
  const logs = [
    fuel({ odometer: 1000, liters: 40, total: 1600 }),
    fuel({ odometer: 1200, liters: 20, total: 800, full: false }),
    fuel({ odometer: 1900, liters: 30, total: 1200 })
  ];
  const t = L.fuelTotals(logs);
  assert.equal(t.entries, 3);
  assert.equal(t.fullCount, 2);
  assert.equal(t.liters, 90);
  assert.equal(t.cost, 3600);
  assert.equal(t.distance, 900);
  assert.equal(t.avgPrice, 40);
  assert.equal(L.fuelLogTotal({ liters: 10, pricePerL: 42.5, total: 0 }), 425);
});

test("maliyet kalemleri yakıt, bakım ve masrafı birleştirir", function () {
  const state = L.defaultState();
  state.vehicles = [vehicle()];
  state.settings.activeVehicleId = "v1";
  state.fuelLogs = [fuel({ id: "f1", date: "2026-11-02", odometer: 60000, liters: 40, total: 1600 })];
  state.services = [{ id: "s1", vehicleId: "v1", type: "oil", date: "2026-11-03", odometer: 60100, cost: 2500, note: "" }];
  state.expenses = [{ id: "e1", vehicleId: "v1", date: "2026-11-04", category: "parking", amount: 100, odometer: 60120, note: "" }];

  const entries = L.costEntries(state, "v1");
  assert.equal(entries.length, 3);
  assert.equal(L.sumAmount(entries), 4200);
  const months = L.monthlyTotals(entries, 3, "2026-11-13");
  assert.deepEqual(months.map(function (m) { return m.key; }), ["2026-09", "2026-10", "2026-11"]);
  assert.equal(months[2].total, 4200);
  const cats = L.categoryTotals(entries);
  assert.equal(cats[0].category, "service");
  assert.equal(cats[0].total, 2500);
  const range = L.odometerRange(state, "v1");
  assert.equal(range.min, 50000);
  assert.equal(range.max, 60120);
  assert.equal(L.costPerKm(state, "v1"), 0.42);
});

test("hatırlatma durumu tarih ve km eşiklerini birleştirir", function () {
  const today = "2026-11-13";
  assert.deepEqual(
    L.reminderStatus({ dueDate: "", dueOdometer: 0 }, today, 60000),
    { state: "none", days: null, km: null, rank: 0 }
  );
  assert.equal(L.reminderStatus({ dueDate: "2026-11-10" }, today, 60000).state, "overdue");
  assert.equal(L.reminderStatus({ dueDate: "2026-11-20" }, today, 60000).state, "soon");
  assert.equal(L.reminderStatus({ dueDate: "2027-01-20" }, today, 60000).state, "ok");
  assert.equal(L.reminderStatus({ dueOdometer: 59500 }, today, 60000).state, "overdue");
  assert.equal(L.reminderStatus({ dueOdometer: 60500 }, today, 60000).state, "soon");
  assert.equal(L.reminderStatus({ dueOdometer: 70000 }, today, 60000).state, "ok");
  const both = L.reminderStatus({ dueDate: "2027-01-20", dueOdometer: 59999 }, today, 60000);
  assert.equal(both.state, "overdue");
  assert.equal(both.rank, 2);
});

test("otomatik hatırlatmalar servis ve aralıklardan üretilir", function () {
  const v = vehicle();
  const services = [{ id: "s1", vehicleId: "v1", type: "oil", date: "2026-01-10", odometer: 58000, cost: 2000, note: "" }];
  const items = L.autoReminders(v, services, "2026-11-13", 60000);
  const oil = items.find(function (item) { return item.type === "oil"; });
  assert.equal(oil.dueDate, "2027-01-10");
  assert.equal(oil.dueOdometer, 68000);
  assert.equal(oil.status, "ok");
  const inspection = items.find(function (item) { return item.type === "inspection"; });
  assert.equal(inspection.dueDate, "2026-12-01");
  assert.equal(inspection.status, "soon");
});

test("manuel ve otomatik hatırlatmalar öncelikle sıralanır", function () {
  const state = L.defaultState();
  state.vehicles = [vehicle({ intervals: { oilKm: 10000, oilMonths: 12, inspectionDate: "2026-12-01", insuranceDate: "2027-06-01" } })];
  state.settings.activeVehicleId = "v1";
  state.services = [{ id: "s1", vehicleId: "v1", type: "oil", date: "2026-10-01", odometer: 61000, cost: 2000 }];
  state.reminders = [
    { id: "r1", vehicleId: "v1", title: "Sigorta yenile", dueDate: "2026-11-01", dueOdometer: 0, done: false },
    { id: "r2", vehicleId: "v1", title: "Lastik kontrol", dueDate: "2026-11-20", dueOdometer: 0, done: false },
    { id: "r3", vehicleId: "v1", title: "Bitti", dueDate: "2026-11-01", dueOdometer: 0, done: true }
  ];
  const items = L.upcomingReminders(state, "v1", "2026-11-13", 62000);
  assert.equal(items[0].title, "Sigorta yenile");
  assert.equal(items[0].status, "overdue");
  assert.ok(items.every(function (item) { return item.id !== "r3"; }));
  assert.equal(L.reminderText({ days: -3, km: null }), "3 gün gecikti");
  assert.equal(L.reminderText({ days: 0, km: 0 }), "bugün · KM tamam");
});

test("güncel kilometre tüm kaynakların en büyüğüdür", function () {
  const state = L.defaultState();
  state.vehicles = [vehicle()];
  state.fuelLogs = [fuel({ odometer: 61000 })];
  state.services = [{ id: "s1", vehicleId: "v1", type: "oil", date: "2026-01-01", odometer: 62000, cost: 1 }];
  state.expenses = [{ id: "e1", vehicleId: "v1", date: "2026-01-01", category: "other", amount: 1, odometer: 60500 }];
  assert.equal(L.currentOdometer(state, "v1"), 62000);
});

test("panel özeti tüketim, maliyet ve hatırlatmaları toplar", function () {
  const state = L.defaultState();
  state.vehicles = [vehicle()];
  state.settings.activeVehicleId = "v1";
  state.fuelLogs = [
    fuel({ id: "a", date: "2026-10-01", odometer: 57000, liters: 40, total: 1600 }),
    fuel({ id: "b", date: "2026-10-20", odometer: 57500, liters: 35, total: 1400 }),
    fuel({ id: "c", date: "2026-11-05", odometer: 58100, liters: 36, total: 1440 })
  ];
  state.services = [{ id: "s1", vehicleId: "v1", type: "oil", date: "2026-02-01", odometer: 56000, cost: 2000 }];
  const d = L.dashboard(state, "v1", "2026-11-13");
  assert.equal(d.vehicle.id, "v1");
  assert.equal(d.odometer, 58100);
  assert.equal(d.lastFuel.id, "c");
  assert.equal(d.consumptionEntries.length, 2);
  assert.equal(d.lastConsumption.per100, 6);
  assert.equal(d.totalCost, 6440);
  assert.equal(d.monthCost, 1440);
  assert.ok(d.reminders.length >= 4);
});

test("yedek doğrulama geçersiz araç kayıtlarını ayıklar", function () {
  const raw = {
    vehicles: [
      { id: "v1", name: "A", purchaseOdometer: 1000 },
      { id: "v2", name: "B" }
    ],
    settings: { activeVehicleId: "yok", currency: "USD", theme: "dark" },
    fuelLogs: [
      { id: "f1", vehicleId: "v1", date: "2026-01-01", odometer: 1200, liters: 10, full: true },
      { id: "f2", vehicleId: "bilinmez", date: "2026-01-01", odometer: 1500, liters: 10 }
    ],
    services: [{ id: "s1", vehicleId: "v1", type: "olmayan", date: "bozuk", odometer: 0, cost: -5 }],
    expenses: [{ id: "e1", vehicleId: "v2", date: "2026-02-30", category: "x", amount: "12,5" }],
    documents: [],
    reminders: [{ id: "r1", vehicleId: "v1", title: "Muayene", dueDate: "2026-12-01", done: false }]
  };
  const state = L.normalizeState(raw);
  assert.equal(state.vehicles.length, 2);
  assert.equal(state.settings.activeVehicleId, "v1");
  assert.equal(state.settings.currency, "USD");
  assert.equal(state.fuelLogs.length, 1);
  assert.equal(state.services[0].type, "other");
  assert.equal(state.services[0].cost, 0);
  assert.equal(state.expenses[0].amount, 0);
  assert.equal(state.expenses[0].category, "other");
  assert.throws(function () { L.normalizeState(null); }, /Geçersiz/);
  assert.throws(function () { L.normalizeState({}); }, /araç listesi/);
});

test("varsayılan durum ve araç etiketleri", function () {
  const state = L.defaultState();
  assert.equal(state.version, 1);
  assert.equal(state.settings.theme, "auto");
  assert.equal(state.settings.currency, "TRY");
  const v = L.normalizeVehicle({ name: "  Clio  ", plate: "34 ab 123", intervals: { oilKm: 15000 } });
  assert.equal(L.vehicleName(v), "Clio");
  assert.equal(v.plate, "34 AB 123");
  assert.equal(v.intervals.oilKm, 15000);
  assert.equal(v.intervals.oilMonths, 12);
  const unnamed = L.normalizeVehicle({ brand: "Fiat", model: "Egea" });
  assert.equal(L.vehicleName(unnamed), "Fiat Egea");
  assert.equal(L.activeVehicle(state), null);
});
