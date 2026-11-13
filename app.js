(function () {
  "use strict";

  const L = window.AracLogic;
  const DB = window.AracDB;
  const LS_KEY = "aracTakip.v1";
  const ROUTES = ["panel", "yakit", "bakim", "masraf", "belgeler", "ayarlar"];
  const LS_DEFAULT = "panel";

  let state = loadState();
  let expenseMonths = 6;
  let confirmResolver = null;
  let lastFocus = null;
  let photoUrls = [];
  let chartSeq = 0;

  const ICONS = {
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5V13l1.6-4.2A2.2 2.2 0 0 1 8.7 7.4h6.6a2.2 2.2 0 0 1 2.1 1.4L19 13v3.5"/><path d="M4.5 13h15"/><circle cx="7.5" cy="17.6" r="1.7"/><circle cx="16.5" cy="17.6" r="1.7"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><path d="M4 21h13"/><path d="M8 8h5"/><path d="M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2-3"/></svg>',
    service: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4.5 4.5 0 0 0-5.9 5.9L3 18v3h3l5.8-5.8a4.5 4.5 0 0 0 5.9-5.9l-2.6 2.6-2.5-2.5z"/></svg>',
    expense: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-10"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>'
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return L.defaultState();
      return L.normalizeState(JSON.parse(raw));
    } catch (error) {
      return L.defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      toast("Kayıt yapılamadı. Cihaz depolaması dolu olabilir.");
      return false;
    }
  }

  function activeVehicle() {
    return L.activeVehicle(state);
  }

  function money(value) {
    return L.formatMoney(value, state.settings.currency);
  }

  function km(value) {
    return L.formatNumber(value) + " km";
  }

  function today() {
    return L.todayISO();
  }

  function currentRoute() {
    const hash = location.hash.replace(/^#/, "");
    return ROUTES.indexOf(hash) >= 0 ? hash : LS_DEFAULT;
  }

  function findById(list, id) {
    return (list || []).find(function (item) { return item.id === id; });
  }

  function vehicleOf(id) {
    return findById(state.vehicles, id);
  }

  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.classList.remove("show"); }, 2600);
  }

  function applyTheme() {
    const pref = state.settings.theme;
    const dark = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0c1219" : "#2563eb");
    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.textContent = pref === "auto" ? "◐" : pref === "dark" ? "☀" : "☾";
      btn.setAttribute("title", pref === "auto" ? "Tema: otomatik" : pref === "dark" ? "Tema: koyu" : "Tema: açık");
    }
  }

  function cycleTheme() {
    const order = ["auto", "light", "dark"];
    const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
    state.settings.theme = next;
    saveState();
    applyTheme();
    toast(next === "auto" ? "Tema: otomatik" : next === "dark" ? "Tema: koyu" : "Tema: açık");
    if (route() === "ayarlar") render();
  }

  function route() {
    return currentRoute();
  }

  function revokePhotos() {
    photoUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    photoUrls = [];
  }

  function loadPhotos() {
    revokePhotos();
    if (!DB) return;
    const nodes = document.querySelectorAll("[data-photo-id]");
    Array.prototype.forEach.call(nodes, function (node) {
      const id = node.getAttribute("data-photo-id");
      if (!id) return;
      DB.getPhoto(id).then(function (record) {
        if (!record || !record.blob) {
          if (node.tagName === "IMG") node.classList.add("hidden");
          return;
        }
        const url = URL.createObjectURL(record.blob);
        photoUrls.push(url);
        if (node.tagName === "IMG") {
          node.src = url;
          node.classList.remove("hidden");
        } else {
          node.style.backgroundImage = "url(" + url + ")";
        }
      }).catch(function () {});
    });
  }

  document.getElementById("themeBtn").addEventListener("click", cycleTheme);
  document.getElementById("settingsBtn").addEventListener("click", function () { location.hash = "ayarlar"; });
  document.getElementById("addVehicleBtn").addEventListener("click", function () { openVehicleForm(null); });
  document.getElementById("fab").addEventListener("click", openQuickAdd);
  document.getElementById("vehicleSelect").addEventListener("change", function (event) {
    state.settings.activeVehicleId = event.target.value;
    saveState();
    render();
  });

  const overlay = document.getElementById("overlay");
  const sheet = document.getElementById("sheet");
  const sheetBody = document.getElementById("sheetBody");

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) closeSheet();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      closeSheet();
    }
  });

  sheetBody.addEventListener("click", function (event) {
    if (event.target.closest("[data-close]")) closeSheet();
  });

  document.getElementById("importFile").addEventListener("change", handleImportFile);

  window.addEventListener("hashchange", render);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  if (media.addEventListener) {
    media.addEventListener("change", function () {
      if (state.settings.theme === "auto") applyTheme();
    });
  }

  document.getElementById("view").addEventListener("click", handleViewClick);

  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () { if (overlay.classList.contains("hidden") === false) closeSheet(); });
  });

  function render() {
    revokePhotos();
    applyTheme();
    const r = route();
    const topDate = document.getElementById("topDate");
    topDate.textContent = L.weekdayTR(today()) + ", " + L.formatDateTR(today());
    renderVehicleSelect();
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.classList.toggle("active", tab.getAttribute("data-nav") === r);
    });
    const fab = document.getElementById("fab");
    fab.classList.toggle("hidden", r === "ayarlar");
    const view = document.getElementById("view");
    view.innerHTML = renderRoute(r);
    loadPhotos();
  }

  function renderVehicleSelect() {
    const select = document.getElementById("vehicleSelect");
    const current = activeVehicle();
    if (!state.vehicles.length) {
      select.innerHTML = '<option value="">Araç eklenmedi</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = state.vehicles.map(function (v) {
      return '<option value="' + esc(v.id) + '"' + (current && current.id === v.id ? " selected" : "") + ">" + esc(L.vehicleName(v)) + "</option>";
    }).join("");
  }

  function renderRoute(r) {
    if (r === "ayarlar") return renderSettings();
    if (!activeVehicle()) return renderWelcome();
    if (r === "yakit") return renderFuel();
    if (r === "bakim") return renderService();
    if (r === "masraf") return renderExpense();
    if (r === "belgeler") return renderDocuments();
    return renderPanel();
  }

  function pageHead(title, subtitle, action) {
    return '<div class="page-head"><div><h2>' + esc(title) + "</h2>" +
      (subtitle ? "<p>" + esc(subtitle) + "</p>" : "") + "</div>" +
      (action ? '<div class="head-action">' + action + "</div>" : "") + "</div>";
  }

  function emptyState(iconName, title, text, action) {
    return '<div class="empty"><div class="empty-icon">' + (ICONS[iconName] || ICONS.car) + "</div>" +
      "<h3>" + esc(title) + "</h3><p>" + esc(text) + "</p>" + (action || "") + "</div>";
  }

  function renderWelcome() {
    return '<div class="welcome card">' +
      '<div class="welcome-mark" aria-hidden="true">' + ICONS.car + "</div>" +
      "<h2>Garajına hoş geldin</h2>" +
      "<p>Yakıt, bakım, masraf ve belgelerini tek yerde takip etmek için ilk aracını ekle. Tüm veriler yalnızca bu cihazda kalır.</p>" +
      '<button class="btn primary" type="button" data-action="add-vehicle">' + ICONS.plus + " Araç ekle</button>" +
      "</div>";
  }

  function renderPanel() {
    const v = activeVehicle();
    const d = L.dashboard(state, v.id, today());
    const c = L.currencySymbol(state.settings.currency);
    const reminders = d.reminders.slice(0, 4);
    const hasData = d.fuelTotals.entries || state.services.length || state.expenses.length;

    let html = "";
    html += '<section class="hero">' +
      '<div class="hero-top"><div><h2>' + esc(L.vehicleName(v)) + "</h2>" +
      '<p class="hero-sub">' + esc(L.vehicleSubtitle(v) || L.fuelTypeName(v.fuelType)) + "</p></div>" +
      (v.plate ? '<span class="plate">' + esc(v.plate) + "</span>" : "") + "</div>" +
      '<div class="hero-stats">' +
      '<div class="hero-stat"><span>Güncel KM</span><strong>' + L.formatNumber(d.odometer) + "</strong></div>" +
      '<div class="hero-stat"><span>Ort. tüketim</span><strong>' + (d.avgConsumption ? L.formatNumber(d.avgConsumption, 1) + " <small>L/100</small>" : "—") + "</strong></div>" +
      '<div class="hero-stat"><span>Bu ay masraf</span><strong>' + L.formatNumber(d.monthCost, 0) + " <small>" + esc(c) + "</small></strong></div>" +
      "</div></section>";

    html += '<div class="stat-grid">' +
      statCard("Son tüketim", d.lastConsumption ? L.formatNumber(d.lastConsumption.per100, 1) + " <small>L/100km</small>" : "—", d.lastConsumption ? L.formatDateTR(d.lastConsumption.date) : "Dolu depo bekleniyor") +
      statCard("Toplam maliyet", money(d.totalCost), d.fuelTotals.entries + " yakıt · " + state.services.filter(function (s) { return s.vehicleId === v.id; }).length + " bakım") +
      statCard("KM başı maliyet", d.costPerKm ? L.formatMoney(d.costPerKm, state.settings.currency) + " <small>/km</small>" : "—", "Yakıt + bakım + masraf") +
      statCard("Yakıt", L.formatNumber(d.fuelTotals.liters, 0) + " <small>L</small>", money(d.fuelTotals.cost)) +
      "</div>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Hatırlatmalar</h3>' +
      '<button class="section-link" type="button" data-action="go-bakim">Tümünü gör</button></div>';
    html += reminders.length
      ? '<div class="list">' + reminders.map(reminderRow).join("") + "</div>"
      : '<div class="empty" style="padding:18px"><p>Yaklaşan bakım veya hatırlatma yok.</p></div>';
    html += "</section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Hızlı işlem</h3></div><div class="quick-grid">' +
      quickBtn("fuel", "Yakıt ekle", "Litre ve KM kaydı", "add-fuel") +
      quickBtn("service", "Bakım ekle", "Servis ve onarım", "add-service") +
      quickBtn("expense", "Masraf ekle", "Vergi, ceza, otopark", "add-expense") +
      quickBtn("doc", "Belge ekle", "Ruhsat, poliçe, not", "add-doc") +
      "</div></section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Son hareketler</h3></div>';
    html += d.recent.length
      ? '<div class="list">' + d.recent.map(recentRow).join("") + "</div>"
      : '<div class="empty"><p>' + (hasData ? "Henüz hareket yok." : "İlk kaydını ekleyerek başla.") + "</p></div>";
    html += "</section>";

    return html;
  }

  function statCard(label, value, sub) {
    return '<div class="stat"><div class="stat-label">' + esc(label) + '</div><div class="stat-value">' + value + '</div><div class="stat-sub">' + esc(sub) + "</div></div>";
  }

  function quickBtn(iconName, title, sub, action) {
    return '<button class="quick-btn" type="button" data-action="' + action + '"><span class="q-icon">' + (ICONS[iconName] || ICONS.plus) + "</span><span><strong>" + esc(title) + "</strong><small>" + esc(sub) + "</small></span></button>";
  }

  function reminderRow(item) {
    const source = item.source === "auto" ? "Otomatik" : "Manuel";
    const due = L.reminderText(item);
    const target = [item.dueDate ? "Tarih " + L.formatDateTR(item.dueDate) : "", item.dueOdometer ? km(item.dueOdometer) : ""].filter(Boolean).join(" · ");
    const actions = item.source === "manual"
      ? '<div class="item-actions">' +
        '<button class="mini-btn" type="button" data-action="done-reminder" data-id="' + esc(item.id) + '" aria-label="Tamamlandı" title="Tamamlandı">' + ICONS.check + "</button>" +
        '<button class="mini-btn" type="button" data-action="edit-reminder" data-id="' + esc(item.id) + '" aria-label="Düzenle" title="Düzenle">' + ICONS.edit + "</button>" +
        '<button class="mini-btn danger" type="button" data-action="delete-reminder" data-id="' + esc(item.id) + '" aria-label="Sil" title="Sil">' + ICONS.trash + "</button></div>"
      : "";
    return '<div class="reminder ' + esc(item.status) + '"><div class="reminder-body">' +
      '<div class="reminder-title">' + esc(item.title) + ' <span class="badge ' + esc(item.status) + '">' + esc(L.statusLabel(item.status)) + "</span></div>" +
      '<div class="reminder-sub">' + esc(target || "Tarih / KM yok") + (due ? " · " + esc(due) : "") + " · " + esc(source) + "</div></div>" +
      actions + "</div>";
  }

  function recentRow(entry) {
    const cls = entry.kind === "fuel" ? "fuel" : entry.kind === "service" ? "service" : entry.category;
    const iconName = entry.kind === "fuel" ? "fuel" : entry.kind === "service" ? "service" : "expense";
    return '<button class="item" type="button" data-action="edit-' + (entry.kind === "fuel" ? "fuel" : entry.kind === "service" ? "service" : "expense") + '" data-id="' + esc(entry.id) + '" style="text-align:left">' +
      '<span class="item-icon ' + esc(cls) + '">' + (ICONS[iconName] || ICONS.expense) + "</span>" +
      '<span class="item-body"><span class="item-title"><span>' + esc(entry.title) + '</span></span>' +
      '<span class="item-sub">' + esc(L.formatDateTR(entry.date) + (entry.odometer ? " · " + km(entry.odometer) : "") + (entry.note ? " · " + entry.note : "")) + "</span></span>" +
      '<span class="item-side"><span class="item-amount">' + money(entry.amount) + "</span></span></button>";
  }

  function renderFuel() {
    const v = activeVehicle();
    const logs = L.sortByDateDesc(L.forVehicle(state.fuelLogs, v.id));
    const entries = L.fuelConsumptionEntries(logs);
    const totals = L.fuelTotals(logs);
    const avg = L.avgConsumption(entries, 3);
    const entryMap = {};
    entries.forEach(function (entry) { entryMap[entry.id] = entry; });

    let html = pageHead("Yakıt", "Dolu depo yöntemiyle tüketim", '<button class="btn small primary" type="button" data-action="add-fuel">' + ICONS.plus + " Ekle</button>");
    html += '<div class="stat-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
      statCard("Ort. tüketim", avg ? L.formatNumber(avg, 1) + " <small>L/100</small>" : "—", "Son 3 dolum") +
      statCard("Toplam yakıt", L.formatNumber(totals.liters, 0) + " <small>L</small>", totals.entries + " kayıt") +
      statCard("Yakıt maliyeti", money(totals.cost), "Ort. " + money(totals.avgPrice) + "/L") +
      "</div>";

    html += '<section class="section"><div class="chart-card">' +
      '<div class="chart-head"><h3>Tüketim trendi</h3><span>son 12 dolum</span></div>' +
      lineChart(entries.slice(-12).map(function (entry) { return { label: L.formatDateTR(entry.date).slice(0, 5), value: entry.per100 }; }), "L/100km") +
      "</div></section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Yakıt kayıtları</h3><span class="badge accent">' + logs.length + "</span></div>";
    if (!logs.length) {
      html += emptyState("fuel", "Yakıt kaydı yok", "İlk dolumu ekleyerek tüketim takibine başla.", '<button class="btn primary" type="button" data-action="add-fuel">Yakıt ekle</button>');
    } else {
      html += '<div class="list">' + logs.map(function (log) {
        const entry = entryMap[log.id];
        const sub = L.formatDateTR(log.date) + " · " + km(log.odometer) + " · " + L.formatNumber(log.liters, 2) + " L" + (log.full ? "" : " (kısmi)") + (log.station ? " · " + log.station : "");
        return '<div class="item"><span class="item-icon fuel">' + ICONS.fuel + "</span>" +
          '<div class="item-body"><div class="item-title"><span>' + esc(L.formatDateTR(log.date)) + "</span>" +
          (entry ? '<span class="badge cyan">' + L.formatNumber(entry.per100, 1) + " L/100</span>" : "") + "</div>" +
          '<div class="item-sub">' + esc(sub) + "</div></div>" +
          '<div class="item-side"><div class="item-amount">' + money(L.fuelLogTotal(log)) + "</div>" +
          '<div class="item-note">' + (log.note ? esc(log.note) : L.formatMoney(log.pricePerL, state.settings.currency) + "/L") + "</div></div>" +
          '<div class="item-actions"><button class="mini-btn" type="button" data-action="edit-fuel" data-id="' + esc(log.id) + '" aria-label="Düzenle" title="Düzenle">' + ICONS.edit + "</button>" +
          '<button class="mini-btn danger" type="button" data-action="delete-fuel" data-id="' + esc(log.id) + '" aria-label="Sil" title="Sil">' + ICONS.trash + "</button></div></div>";
      }).join("") + "</div>";
    }
    html += "</section>";
    return html;
  }

  function renderService() {
    const v = activeVehicle();
    const services = L.sortByDateDesc(L.forVehicle(state.services, v.id));
    const reminders = L.upcomingReminders(state, v.id, today());

    let html = pageHead("Bakım", "Servis geçmişi ve hatırlatmalar", '<button class="btn small primary" type="button" data-action="add-service">' + ICONS.plus + " Bakım</button>");
    html += '<section class="section" style="margin-top:0"><div class="section-head"><h3 class="section-title">Hatırlatmalar</h3>' +
      '<button class="section-link" type="button" data-action="add-reminder">+ Manuel</button></div>';
    html += reminders.length
      ? '<div class="list">' + reminders.map(reminderRow).join("") + "</div>"
      : '<div class="empty"><p>Hatırlatma yok. Araç aralıklarından otomatik oluşturulur.</p></div>';
    html += "</section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Servis kayıtları</h3><span class="badge accent">' + services.length + "</span></div>";
    if (!services.length) {
      html += emptyState("service", "Bakım kaydı yok", "Yağ, lastik, muayene ve diğer bakımları buraya ekle.", '<button class="btn primary" type="button" data-action="add-service">Bakım ekle</button>');
    } else {
      html += '<div class="list">' + services.map(function (s) {
        const next = [s.nextDate ? L.formatDateTR(s.nextDate) : "", s.nextOdometer ? km(s.nextOdometer) : ""].filter(Boolean).join(" · ");
        const sub = L.formatDateTR(s.date) + " · " + km(s.odometer) + (next ? " · Sonraki: " + next : "");
        return '<div class="item"><span class="item-icon service">' + ICONS.service + "</span>" +
          '<div class="item-body"><div class="item-title"><span>' + esc(L.serviceTypeName(s.type)) + "</span></div>" +
          '<div class="item-sub">' + esc(sub) + (s.note ? " · " + esc(s.note) : "") + "</div></div>" +
          '<div class="item-side"><div class="item-amount">' + money(s.cost) + "</div></div>" +
          '<div class="item-actions"><button class="mini-btn" type="button" data-action="edit-service" data-id="' + esc(s.id) + '" aria-label="Düzenle" title="Düzenle">' + ICONS.edit + "</button>" +
          '<button class="mini-btn danger" type="button" data-action="delete-service" data-id="' + esc(s.id) + '" aria-label="Sil" title="Sil">' + ICONS.trash + "</button></div></div>";
      }).join("") + "</div>";
    }
    html += "</section>";
    return html;
  }

  function renderExpense() {
    const v = activeVehicle();
    const all = L.costEntries(state, v.id);
    const expenses = L.sortByDateDesc(L.forVehicle(state.expenses, v.id));
    const months = L.monthlyTotals(all, expenseMonths, today());
    const total = months.reduce(function (acc, m) { return acc + m.total; }, 0);
    const cats = L.categoryTotals(all.filter(function (entry) { return entry.date >= months[0].key + "-01" && entry.date <= today(); }));

    let html = pageHead("Masraf", "Tüm giderler ve dağılım", '<button class="btn small primary" type="button" data-action="add-expense">' + ICONS.plus + " Masraf</button>");
    html += '<div class="section-head" style="margin-bottom:8px"><span class="badge accent">Son ' + expenseMonths + " ay · " + money(total) + "</span>" +
      '<span class="segmented">' + [3, 6, 12].map(function (n) {
        return '<button type="button" data-action="period" data-value="' + n + '" class="' + (expenseMonths === n ? "active" : "") + '">' + n + " ay</button>";
      }).join("") + "</span></div>";

    html += '<div class="chart-card">' +
      '<div class="chart-head"><h3>Aylık toplam</h3><span>yakıt + bakım + masraf</span></div>' +
      monthBarChart(months) + "</div>";

    if (cats.length) {
      html += '<section class="section"><div class="chart-card"><div class="chart-head"><h3>Kategori dağılımı</h3><span>seçilen dönem</span></div><div class="bar-list">' +
        cats.map(function (cat) {
          const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0;
          return '<div class="bar-row"><span class="bar-label">' + esc(cat.name) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + pct + "%;background:" + esc(cat.color) + '"></span></span><span class="bar-value">' + money(cat.total) + "</span></div>";
        }).join("") + "</div></div></section>";
    }

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Masraf kayıtları</h3><span class="badge accent">' + expenses.length + "</span></div>";
    if (!expenses.length) {
      html += emptyState("expense", "Ek masraf yok", "Vergi, sigorta, ceza, otopark gibi giderleri buraya ekle. Yakıt ve bakım otomatik sayılır.", '<button class="btn primary" type="button" data-action="add-expense">Masraf ekle</button>');
    } else {
      html += '<div class="list">' + expenses.map(function (e) {
        const sub = L.formatDateTR(e.date) + (e.odometer ? " · " + km(e.odometer) : "") + (e.note ? " · " + e.note : "");
        return '<div class="item"><span class="item-icon ' + esc(e.category) + '">' + ICONS.expense + "</span>" +
          '<div class="item-body"><div class="item-title"><span>' + esc(L.expenseCategoryName(e.category)) + "</span></div>" +
          '<div class="item-sub">' + esc(sub) + "</div></div>" +
          '<div class="item-side"><div class="item-amount">' + money(e.amount) + "</div></div>" +
          '<div class="item-actions"><button class="mini-btn" type="button" data-action="edit-expense" data-id="' + esc(e.id) + '" aria-label="Düzenle" title="Düzenle">' + ICONS.edit + "</button>" +
          '<button class="mini-btn danger" type="button" data-action="delete-expense" data-id="' + esc(e.id) + '" aria-label="Sil" title="Sil">' + ICONS.trash + "</button></div></div>";
      }).join("") + "</div>";
    }
    html += "</section>";
    return html;
  }

  function renderDocuments() {
    const v = activeVehicle();
    const docs = L.sortByDateDesc(L.forVehicle(state.documents, v.id));
    let html = pageHead("Belgeler", "Poliçe, ruhsat ve notlar", '<button class="btn small primary" type="button" data-action="add-doc">' + ICONS.plus + " Belge</button>");
    if (!docs.length) {
      return html + emptyState("doc", "Belge yok", "Ruhsat, sigorta poliçesi, muayene ve notlarını fotoğrafla birlikte sakla.", '<button class="btn primary" type="button" data-action="add-doc">Belge ekle</button>');
    }
    html += '<div class="doc-grid">' + docs.map(function (doc) {
      const status = doc.expiryDate ? L.reminderStatus({ dueDate: doc.expiryDate }, today(), 0) : null;
      const badge = status && status.state !== "ok"
        ? '<span class="badge ' + status.state + '">' + (status.state === "overdue" ? "Süresi geçti" : status.days + " gün") + "</span>"
        : "";
      return '<div class="doc-card">' +
        '<div class="doc-thumb" data-photo-thumb="' + esc(doc.id) + '">' +
        (doc.hasPhoto ? '<img data-photo-id="' + esc(doc.id) + '" alt="' + esc(doc.title) + ' belgesi">' : ICONS.doc) +
        "</div>" +
        '<div class="doc-body"><div class="doc-title">' + esc(doc.title) + "</div>" +
        '<div class="doc-meta">' + esc(L.documentTypeName(doc.type) + (doc.number ? " · " + doc.number : "")) + "</div>" +
        '<div class="doc-meta">' + (doc.expiryDate ? "Bitiş: " + esc(L.formatDateTR(doc.expiryDate)) : "Bitiş tarihi yok") + " " + badge + "</div>" +
        '<div class="doc-actions">' +
        (doc.hasPhoto ? '<button class="mini-btn" type="button" data-action="view-doc" data-id="' + esc(doc.id) + '" aria-label="Fotoğrafı gör" title="Fotoğrafı gör">' + ICONS.camera + "</button>" : "") +
        '<button class="mini-btn" type="button" data-action="edit-doc" data-id="' + esc(doc.id) + '" aria-label="Düzenle" title="Düzenle">' + ICONS.edit + "</button>" +
        '<button class="mini-btn danger" type="button" data-action="delete-doc" data-id="' + esc(doc.id) + '" aria-label="Sil" title="Sil">' + ICONS.trash + "</button>" +
        "</div></div></div>";
    }).join("") + "</div>";
    return html;
  }

  function renderSettings() {
    const vCount = state.vehicles.length;
    const usage = new Blob([JSON.stringify(state)]).size;
    let html = pageHead("Ayarlar", "Araçlar, görünüm ve yedekleme");

    html += '<section class="section" style="margin-top:0"><div class="section-head"><h3 class="section-title">Araçlar</h3>' +
      '<button class="section-link" type="button" data-action="add-vehicle">+ Araç ekle</button></div>';
    if (!vCount) {
      html += '<div class="empty"><p>Henüz araç eklenmedi.</p></div>';
    } else {
      html += '<div class="list">' + state.vehicles.map(function (vehicle) {
        const isActive = state.settings.activeVehicleId === vehicle.id;
        return '<div class="vehicle-card card item" style="align-items:flex-start"><span class="item-icon ' + (isActive ? "fuel" : "") + '">' + ICONS.car + "</span>" +
          '<div class="item-body"><div class="item-title"><span>' + esc(L.vehicleName(vehicle)) + "</span>" + (isActive ? '<span class="badge accent">Aktif</span>' : "") + "</div>" +
          '<div class="item-sub">' + esc([L.vehicleSubtitle(vehicle), L.fuelTypeName(vehicle.fuelType), L.formatNumber(L.currentOdometer(state, vehicle.id)) + " km"].filter(Boolean).join(" · ")) + "</div>" +
          '<div class="vc-actions">' +
          (!isActive ? '<button class="btn small ghost" type="button" data-action="select-vehicle" data-id="' + esc(vehicle.id) + '">Aktif yap</button>' : "") +
          '<button class="mini-btn" type="button" data-action="edit-vehicle" data-id="' + esc(vehicle.id) + '" aria-label="Düzenle" title="Düzenle">' + ICONS.edit + "</button>" +
          '<button class="mini-btn danger" type="button" data-action="delete-vehicle" data-id="' + esc(vehicle.id) + '" aria-label="Sil" title="Sil">' + ICONS.trash + "</button>" +
          "</div></div></div>";
      }).join("") + "</div>";
    }
    html += "</section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Görünüm</h3></div><div class="settings-group">' +
      '<div class="setting-row"><div><div class="setting-label">Tema</div><div class="setting-sub">Otomatik, açık veya koyu</div></div><div class="setting-side">' +
      '<span class="segmented">' + ["auto", "light", "dark"].map(function (theme) {
        const label = theme === "auto" ? "Oto" : theme === "light" ? "Açık" : "Koyu";
        return '<button type="button" data-action="set-theme" data-value="' + theme + '" class="' + (state.settings.theme === theme ? "active" : "") + '">' + label + "</button>";
      }).join("") + "</span></div></div>" +
      '<div class="setting-row"><div><div class="setting-label">Para birimi</div><div class="setting-sub">Sembol ve biçim</div></div><div class="setting-side">' +
      '<select id="currencySelect" aria-label="Para birimi">' + Object.keys(L.CURRENCIES).map(function (code) {
        return '<option value="' + code + '"' + (state.settings.currency === code ? " selected" : "") + ">" + code + " " + L.CURRENCIES[code] + "</option>";
      }).join("") + "</select></div></div></div></section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Yedekleme</h3></div><div class="settings-group">' +
      '<div class="setting-row"><div><div class="setting-label">Yedek al</div><div class="setting-sub">JSON dosyası indir (fotoğraflar dahil)</div></div><div class="setting-side"><button class="btn small ghost" type="button" data-action="export">Dışa aktar</button></div></div>' +
      '<div class="setting-row"><div><div class="setting-label">Yedekten yükle</div><div class="setting-sub">Mevcut verilerin yerine geçer</div></div><div class="setting-side"><button class="btn small ghost" type="button" data-action="import">İçe aktar</button></div></div>' +
      '<div class="setting-row"><div><div class="setting-label">Tüm verileri sil</div><div class="setting-sub">Bu cihazdaki araç ve kayıtlar silinir</div></div><div class="setting-side"><button class="btn small danger" type="button" data-action="clear">Sıfırla</button></div></div>' +
      "</div></section>";

    html += '<section class="section"><div class="section-head"><h3 class="section-title">Hakkında</h3></div><div class="settings-group">' +
      '<div class="setting-row"><div><div class="setting-label">Araç Takip</div><div class="setting-sub">Sürüm 1.0 · ' + vCount + " araç · " + L.formatNumber(usage / 1024, 0) + " KB veri</div></div></div>" +
      '<div class="setting-row"><div><div class="setting-label">Gizlilik</div><div class="setting-sub">Veriler yalnızca bu cihazda saklanır; hesap veya sunucu yoktur.</div></div></div>' +
      "</div></section>";
    return html;
  }

  function lineChart(points, unit) {
    if (!points || points.length < 2) {
      return '<div class="chart-empty">Grafik için en az iki dolu depo kaydı gerekir.</div>';
    }
    const W = 600;
    const H = 170;
    const pad = { l: 38, r: 12, t: 14, b: 24 };
    const values = points.map(function (p) { return p.value; });
    let min = Math.min.apply(null, values);
    let max = Math.max.apply(null, values);
    if (min === max) { min = Math.max(0, min - 1); max = max + 1; }
    const span = max - min;
    min = Math.max(0, min - span * 0.12);
    max = max + span * 0.12;
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const x = function (i) { return pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW); };
    const y = function (v) { return pad.t + innerH - ((v - min) / (max - min)) * innerH; };
    const coords = points.map(function (p, i) { return [x(i), y(p.value)]; });
    const line = coords.map(function (c) { return c[0].toFixed(1) + "," + c[1].toFixed(1); }).join(" ");
    const area = "M " + coords[0][0].toFixed(1) + " " + (H - pad.b) + " L " + line.replace(/ /g, " L ") + " L " + coords[coords.length - 1][0].toFixed(1) + " " + (H - pad.b) + " Z";
    const gid = "chart-grad-" + (++chartSeq);
    const grid = [0, 0.5, 1].map(function (t) {
      const value = max - (max - min) * t;
      const yy = pad.t + innerH * t;
      return '<line x1="' + pad.l + '" y1="' + yy.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + yy.toFixed(1) + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4"/>' +
        '<text x="' + (pad.l - 6) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + esc(L.formatNumber(value, 1)) + "</text>";
    }).join("");
    const labelIdx = points.length > 4 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1];
    const xLabels = labelIdx.map(function (i) {
      return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? "start" : i === points.length - 1 ? "end" : "middle") + '" font-size="10" fill="var(--muted)">' + esc(points[i].label) + "</text>";
    }).join("");
    const last = coords[coords.length - 1];
    return '<div class="chart-wrap"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(unit + " grafiği") + '">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.26"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<polyline points="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>' +
      xLabels + "</svg></div>" +
      '<div class="chart-legend"><span>' + esc(points[0].label) + "</span><span>" + esc(points[points.length - 1].label) + "</span></div>";
  }

  function monthBarChart(months) {
    const max = Math.max.apply(null, months.map(function (m) { return m.total; }).concat([1]));
    const currentKey = L.monthKey(today());
    return '<div class="month-chart">' + months.map(function (m) {
      const pct = Math.round((m.total / max) * 100);
      return '<div class="month-col' + (m.key === currentKey ? " active" : "") + '" title="' + esc(m.label + ": " + money(m.total)) + '">' +
        '<span class="month-value">' + (m.total > 0 ? L.formatNumber(m.total, 0) : "") + "</span>" +
        '<span class="month-bar" style="height:' + Math.max(3, pct) + '%"></span>' +
        '<span class="month-label">' + esc(m.label.split(" ")[0]) + "</span></div>";
    }).join("") + "</div>";
  }

  function openQuickAdd() {
    const v = activeVehicle();
    showSheet(
      sheetHead("Ne eklemek istersin?", v ? L.vehicleName(v) + " için yeni kayıt" : "Önce araç ekle") +
      '<div class="quick-grid" style="margin-bottom:6px">' +
      quickBtn("fuel", "Yakıt", "Litre, fiyat, KM", "add-fuel") +
      quickBtn("service", "Bakım", "Servis ve onarım", "add-service") +
      quickBtn("expense", "Masraf", "Vergi, ceza, diğer", "add-expense") +
      quickBtn("doc", "Belge", "Ruhsat, poliçe, not", "add-doc") +
      quickBtn("bell", "Hatırlatma", "Manuel takip", "add-reminder") +
      quickBtn("car", "Araç", "Garaja araç ekle", "add-vehicle") +
      "</div>"
    );
    sheetBody.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const action = btn.getAttribute("data-action");
        closeSheet();
        setTimeout(function () { runAction(action); }, 0);
      });
    });
  }

  function sheetHead(title, subtitle) {
    return '<div class="sheet-head"><div><h2 class="sheet-title" id="sheetTitle">' + esc(title) + "</h2>" +
      (subtitle ? '<p class="sheet-sub">' + esc(subtitle) + "</p>" : "") + "</div>" +
      '<button type="button" class="sheet-close" data-close aria-label="Kapat">×</button></div>';
  }

  function showSheet(html) {
    lastFocus = document.activeElement;
    sheetBody.innerHTML = html;
    overlay.classList.remove("hidden");
    document.body.classList.add("locked");
    sheet.focus();
    setTimeout(function () {
      const first = sheetBody.querySelector("input:not([type=hidden]), select, textarea, button");
      if (first) first.focus();
    }, 70);
  }

  function closeSheet() {
    overlay.classList.add("hidden");
    document.body.classList.remove("locked");
    sheetBody.innerHTML = "";
    revokePhotos();
    if (confirmResolver) {
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve(false);
    }
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }

  function askConfirm(title, message, confirmLabel, danger) {
    return new Promise(function (resolve) {
      confirmResolver = resolve;
      showSheet(
        sheetHead(title, "") +
        '<p class="hint" style="font-size:13px;color:var(--text);line-height:1.5;margin-bottom:16px">' + esc(message) + "</p>" +
        '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button>' +
        '<button class="btn ' + (danger ? "danger" : "primary") + '" type="button" data-confirm>' + esc(confirmLabel || "Onayla") + "</button></div>"
      );
      const confirmBtn = sheetBody.querySelector("[data-confirm]");
      confirmBtn.addEventListener("click", function () {
        const fn = confirmResolver;
        confirmResolver = null;
        closeSheet();
        if (fn) fn(true);
      });
    });
  }

  function readValue(form, name) {
    const el = form.elements[name];
    return el ? String(el.value || "").trim() : "";
  }

  function readNumber(form, name) {
    return L.parseNumberInput(readValue(form, name));
  }

  function clearErrors(form) {
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    form.querySelectorAll("[data-error]").forEach(function (el) { el.textContent = ""; });
  }

  function setError(form, name, message) {
    const el = form.elements[name];
    if (el) el.setAttribute("aria-invalid", "true");
    const err = form.querySelector('[data-error="' + name + '"]');
    if (err) err.textContent = message;
    if (el && typeof el.focus === "function") el.focus();
  }

  function errorSlot(name) {
    return '<span class="error-text" data-error="' + name + '"></span>';
  }

  function options(list, selected, placeholder) {
    return (placeholder ? '<option value="">' + esc(placeholder) + "</option>" : "") + list.map(function (item) {
      return '<option value="' + esc(item.id) + '"' + (item.id === selected ? " selected" : "") + ">" + esc(item.name) + "</option>";
    }).join("");
  }

  function openFuelForm(existing) {
    const v = activeVehicle();
    if (!v) { openVehicleForm(null); return; }
    const currentOdo = L.currentOdometer(state, v.id);
    const f = existing || {};
    const price = f.pricePerL || (f.total && f.liters ? L.round(f.total / f.liters, 2) : 0);
    showSheet(
      sheetHead(existing ? "Yakıt kaydını düzenle" : "Yakıt kaydı", "Dolu depo yöntemiyle tüketim hesaplanır.") +
      '<form class="form" id="fuelForm" novalidate>' +
      '<div class="field-row"><div class="field"><label for="fuelDate">Tarih</label><input id="fuelDate" name="date" type="date" value="' + esc(f.date || today()) + '" required>' + errorSlot("date") + "</div>" +
      '<div class="field"><label for="fuelOdo">Kilometre</label><input id="fuelOdo" name="odometer" inputmode="numeric" value="' + esc(f.odometer || currentOdo || "") + '" placeholder="örn. 125000" required>' + errorSlot("odometer") + "</div></div>" +
      '<div class="field-row"><div class="field"><label for="fuelLiters">Litre</label><input id="fuelLiters" name="liters" inputmode="decimal" value="' + esc(f.liters || "") + '" placeholder="örn. 42,5" required>' + errorSlot("liters") + "</div>" +
      '<div class="field"><label for="fuelPrice">Litre fiyatı</label><input id="fuelPrice" name="pricePerL" inputmode="decimal" value="' + esc(price || "") + '" placeholder="örn. 42,50">' + errorSlot("pricePerL") + "</div></div>" +
      '<div class="field-row"><div class="field"><label for="fuelTotal">Toplam tutar</label><input id="fuelTotal" name="total" inputmode="decimal" value="' + esc(f.total || "") + '" placeholder="Otomatik">' + errorSlot("total") + "</div>" +
      '<div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" name="full"' + (f.full === false ? "" : " checked") + '> Depoyu doldurdum</label><span class="hint">Kısmi dolumda işareti kaldır.</span></div></div>' +
      '<div class="field"><label for="fuelStation">İstasyon (isteğe bağlı)</label><input id="fuelStation" name="station" value="' + esc(f.station || "") + '" placeholder="örn. Shell"></div>' +
      '<div class="field"><label for="fuelNote">Not (isteğe bağlı)</label><textarea id="fuelNote" name="note" rows="2">' + esc(f.note || "") + "</textarea></div>" +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">' + (existing ? "Güncelle" : "Kaydet") + "</button></div>" +
      "</form>"
    );

    const form = sheetBody.querySelector("#fuelForm");
    const litersEl = form.elements.liters;
    const priceEl = form.elements.pricePerL;
    const totalEl = form.elements.total;
    function recalc() {
      if (totalEl.dataset.manual === "1") return;
      const liters = L.parseNumberInput(litersEl.value);
      const unit = L.parseNumberInput(priceEl.value);
      if (liters > 0 && unit > 0) totalEl.value = String(L.round(liters * unit, 2));
    }
    litersEl.addEventListener("input", recalc);
    priceEl.addEventListener("input", recalc);
    totalEl.addEventListener("input", function () { totalEl.dataset.manual = totalEl.value ? "1" : ""; });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors(form);
      const date = readValue(form, "date");
      const odometer = Math.round(readNumber(form, "odometer"));
      const liters = readNumber(form, "liters");
      let pricePerL = readNumber(form, "pricePerL");
      let total = readNumber(form, "total");
      if (!L.isISODate(date)) return setError(form, "date", "Geçerli bir tarih seç.");
      if (!(odometer > 0)) return setError(form, "odometer", "Kilometre 0'dan büyük olmalı.");
      if (!(liters > 0)) return setError(form, "liters", "Litre 0'dan büyük olmalı.");
      if (!(total > 0) && !(pricePerL > 0)) return setError(form, "total", "Tutar veya litre fiyatı gir.");
      if (!(pricePerL > 0) && total > 0) pricePerL = L.round(total / liters, 2);
      if (!(total > 0) && pricePerL > 0) total = L.round(liters * pricePerL, 2);
      const latest = L.currentOdometer(state, v.id);
      if (!existing && latest > 0 && odometer < latest) {
        if (!window.confirm("Girilen kilometre (" + L.formatNumber(odometer) + " km) mevcut değerden (" + L.formatNumber(latest) + " km) düşük. Yine de kaydedilsin mi?")) return;
      }
      const record = {
        id: existing ? existing.id : L.uid("fuel"),
        vehicleId: v.id,
        date: date,
        odometer: odometer,
        liters: L.round(liters, 2),
        pricePerL: L.round(pricePerL, 2),
        total: L.round(total, 2),
        full: form.elements.full.checked,
        station: readValue(form, "station"),
        note: readValue(form, "note"),
        createdAt: existing ? existing.createdAt : new Date().toISOString()
      };
      if (existing) {
        const idx = state.fuelLogs.findIndex(function (log) { return log.id === existing.id; });
        if (idx >= 0) state.fuelLogs[idx] = record;
      } else {
        state.fuelLogs.push(record);
      }
      saveState();
      closeSheet();
      render();
      toast(existing ? "Yakıt kaydı güncellendi." : "Yakıt kaydı eklendi.");
    });
  }

  function openServiceForm(existing) {
    const v = activeVehicle();
    if (!v) { openVehicleForm(null); return; }
    const currentOdo = L.currentOdometer(state, v.id);
    const s = existing || {};
    showSheet(
      sheetHead(existing ? "Bakım kaydını düzenle" : "Bakım kaydı", "Servis, onarım ve resmi işlemler.") +
      '<form class="form" id="serviceForm" novalidate>' +
      '<div class="field-row"><div class="field"><label for="serviceType">Tür</label><select id="serviceType" name="type">' + options(L.SERVICE_TYPES, s.type || "oil") + "</select></div>" +
      '<div class="field"><label for="serviceDate">Tarih</label><input id="serviceDate" name="date" type="date" value="' + esc(s.date || today()) + '">' + errorSlot("date") + "</div></div>" +
      '<div class="field-row"><div class="field"><label for="serviceOdo">Kilometre</label><input id="serviceOdo" name="odometer" inputmode="numeric" value="' + esc(s.odometer || currentOdo || "") + '" placeholder="örn. 125000">' + errorSlot("odometer") + "</div>" +
      '<div class="field"><label for="serviceCost">Maliyet</label><input id="serviceCost" name="cost" inputmode="decimal" value="' + esc(s.cost || "") + '" placeholder="örn. 2.500">' + errorSlot("cost") + "</div></div>" +
      '<div class="field-row"><div class="field"><label for="serviceNextDate">Sonraki tarih</label><input id="serviceNextDate" name="nextDate" type="date" value="' + esc(s.nextDate || "") + '"></div>' +
      '<div class="field"><label for="serviceNextOdo">Sonraki KM</label><input id="serviceNextOdo" name="nextOdometer" inputmode="numeric" value="' + esc(s.nextOdometer || "") + '" placeholder="örn. 135000"></div></div>' +
      '<p class="hint">Boş bırakılırsa hatırlatma, araç aralıklarından otomatik hesaplanır.</p>' +
      '<div class="field"><label for="serviceNote">Not</label><textarea id="serviceNote" name="note" rows="2" placeholder="Yapılan işlem, usta, garanti...">' + esc(s.note || "") + "</textarea></div>" +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">' + (existing ? "Güncelle" : "Kaydet") + "</button></div>" +
      "</form>"
    );
    const form = sheetBody.querySelector("#serviceForm");
    const typeEl = form.elements.type;
    const dateEl = form.elements.date;
    const odoEl = form.elements.odometer;

    function suggest() {
      const intervals = Object.assign({}, L.VEHICLE_INTERVALS_DEFAULTS, v.intervals || {});
      const map = {
        oil: { km: intervals.oilKm, months: intervals.oilMonths },
        tire: { km: intervals.tireKm, months: intervals.tireMonths },
        inspection: { months: intervals.inspectionMonths },
        insurance: { months: intervals.insuranceMonths }
      };
      const rule = map[typeEl.value];
      if (!rule) return;
      const baseDate = L.isISODate(dateEl.value) ? dateEl.value : today();
      const odo = Math.round(L.parseNumberInput(odoEl.value));
      if (rule.months && !form.elements.nextDate.value) form.elements.nextDate.value = L.addMonthsISO(baseDate, rule.months) || "";
      if (rule.km && odo > 0 && !form.elements.nextOdometer.value) form.elements.nextOdometer.value = String(odo + rule.km);
    }
    typeEl.addEventListener("change", suggest);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors(form);
      const date = readValue(form, "date");
      const odometer = Math.round(readNumber(form, "odometer"));
      const cost = readNumber(form, "cost");
      const nextDate = readValue(form, "nextDate");
      const nextOdometer = Math.round(readNumber(form, "nextOdometer"));
      if (!L.isISODate(date)) return setError(form, "date", "Geçerli bir tarih seç.");
      if (!Number.isFinite(odometer) || odometer < 0) return setError(form, "odometer", "Geçerli bir kilometre gir.");
      if (cost < 0) return setError(form, "cost", "Maliyet negatif olamaz.");
      const record = {
        id: existing ? existing.id : L.uid("service"),
        vehicleId: v.id,
        type: typeEl.value,
        date: date,
        odometer: odometer,
        cost: L.round(cost, 2),
        note: readValue(form, "note"),
        nextDate: L.isISODate(nextDate) ? nextDate : "",
        nextOdometer: nextOdometer > 0 ? nextOdometer : 0,
        createdAt: existing ? existing.createdAt : new Date().toISOString()
      };
      if (existing) {
        const idx = state.services.findIndex(function (item) { return item.id === existing.id; });
        if (idx >= 0) state.services[idx] = record;
      } else {
        state.services.push(record);
      }
      saveState();
      closeSheet();
      render();
      toast(existing ? "Bakım kaydı güncellendi." : "Bakım kaydı eklendi.");
    });
  }

  function openExpenseForm(existing) {
    const v = activeVehicle();
    if (!v) { openVehicleForm(null); return; }
    const currentOdo = L.currentOdometer(state, v.id);
    const e = existing || {};
    showSheet(
      sheetHead(existing ? "Masrafı düzenle" : "Masraf kaydı", "Yakıt ve bakım dışındaki giderler.") +
      '<form class="form" id="expenseForm" novalidate>' +
      '<div class="field-row"><div class="field"><label for="expenseCategory">Kategori</label><select id="expenseCategory" name="category">' + options(L.EXPENSE_CATEGORIES, e.category || "tax") + "</select></div>" +
      '<div class="field"><label for="expenseDate">Tarih</label><input id="expenseDate" name="date" type="date" value="' + esc(e.date || today()) + '">' + errorSlot("date") + "</div></div>" +
      '<div class="field-row"><div class="field"><label for="expenseAmount">Tutar</label><input id="expenseAmount" name="amount" inputmode="decimal" value="' + esc(e.amount || "") + '" placeholder="örn. 1.250" required>' + errorSlot("amount") + "</div>" +
      '<div class="field"><label for="expenseOdo">Kilometre (isteğe bağlı)</label><input id="expenseOdo" name="odometer" inputmode="numeric" value="' + esc(e.odometer || "") + '" placeholder="' + esc(currentOdo || "") + '"></div></div>' +
      '<div class="field"><label for="expenseNote">Not</label><textarea id="expenseNote" name="note" rows="2" placeholder="Açıklama...">' + esc(e.note || "") + "</textarea></div>" +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">' + (existing ? "Güncelle" : "Kaydet") + "</button></div>" +
      "</form>"
    );
    const form = sheetBody.querySelector("#expenseForm");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors(form);
      const date = readValue(form, "date");
      const amount = readNumber(form, "amount");
      const odometer = Math.round(readNumber(form, "odometer"));
      if (!L.isISODate(date)) return setError(form, "date", "Geçerli bir tarih seç.");
      if (!(amount > 0)) return setError(form, "amount", "Tutar 0'dan büyük olmalı.");
      const record = {
        id: existing ? existing.id : L.uid("expense"),
        vehicleId: v.id,
        date: date,
        category: form.elements.category.value,
        amount: L.round(amount, 2),
        odometer: odometer > 0 ? odometer : 0,
        note: readValue(form, "note"),
        createdAt: existing ? existing.createdAt : new Date().toISOString()
      };
      if (existing) {
        const idx = state.expenses.findIndex(function (item) { return item.id === existing.id; });
        if (idx >= 0) state.expenses[idx] = record;
      } else {
        state.expenses.push(record);
      }
      saveState();
      closeSheet();
      render();
      toast(existing ? "Masraf güncellendi." : "Masraf eklendi.");
    });
  }

  function openDocumentForm(existing) {
    const v = activeVehicle();
    if (!v) { openVehicleForm(null); return; }
    const d = existing || {};
    showSheet(
      sheetHead(existing ? "Belgeyi düzenle" : "Belge ekle", "Ruhsat, poliçe, muayene veya not.") +
      '<form class="form" id="docForm" novalidate>' +
      '<div class="field-row"><div class="field"><label for="docTitle">Başlık</label><input id="docTitle" name="title" value="' + esc(d.title || "") + '" placeholder="örn. Kasko poliçesi" required>' + errorSlot("title") + "</div>" +
      '<div class="field"><label for="docType">Tür</label><select id="docType" name="type">' + options(L.DOCUMENT_TYPES, d.type || "insurance") + "</select></div></div>" +
      '<div class="field-row"><div class="field"><label for="docNumber">Numara</label><input id="docNumber" name="number" value="' + esc(d.number || "") + '" placeholder="Poliçe / belge no"></div>' +
      '<div class="field"><label for="docExpiry">Bitiş tarihi</label><input id="docExpiry" name="expiryDate" type="date" value="' + esc(d.expiryDate || "") + '"></div></div>' +
      '<div class="field"><label for="docIssued">Düzenlenme tarihi</label><input id="docIssued" name="issuedDate" type="date" value="' + esc(d.issuedDate || "") + '"></div>' +
      '<div class="field"><label for="docNote">Not</label><textarea id="docNote" name="note" rows="2" placeholder="Detay, acente, telefon...">' + esc(d.note || "") + "</textarea></div>" +
      '<div class="field"><label for="docPhoto">Fotoğraf (isteğe bağlı)</label><input id="docPhoto" name="photo" type="file" accept="image/*">' +
      '<span class="hint">Fotoğraf cihazda, IndexedDB içinde saklanır.</span>' +
      (existing && existing.hasPhoto ? '<label class="check"><input type="checkbox" name="removePhoto"> Mevcut fotoğrafı kaldır</label>' : "") +
      '<div class="photo-preview' + (existing && existing.hasPhoto ? " show" : "") + '">' + (existing && existing.hasPhoto ? '<img data-photo-id="' + esc(existing.id) + '" alt="Belge fotoğrafı">' : "") + "</div></div>" +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">' + (existing ? "Güncelle" : "Kaydet") + "</button></div>" +
      "</form>"
    );
    const form = sheetBody.querySelector("#docForm");
    if (existing && existing.hasPhoto) loadPhotos();
    form.elements.photo.addEventListener("change", function () {
      const file = form.elements.photo.files[0];
      const preview = form.querySelector(".photo-preview");
      if (!file) { preview.classList.remove("show"); return; }
      const url = URL.createObjectURL(file);
      photoUrls.push(url);
      preview.innerHTML = '<img src="' + url + '" alt="Seçilen fotoğraf">';
      preview.classList.add("show");
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearErrors(form);
      const title = readValue(form, "title");
      const expiryDate = readValue(form, "expiryDate");
      const issuedDate = readValue(form, "issuedDate");
      if (!title) return setError(form, "title", "Belge başlığı gir.");
      if (expiryDate && !L.isISODate(expiryDate)) return setError(form, "expiryDate", "Geçerli bir tarih seç.");
      if (issuedDate && !L.isISODate(issuedDate)) return setError(form, "issuedDate", "Geçerli bir tarih seç.");
      const record = {
        id: existing ? existing.id : L.uid("doc"),
        vehicleId: v.id,
        title: title,
        type: form.elements.type.value,
        number: readValue(form, "number"),
        issuedDate: L.isISODate(issuedDate) ? issuedDate : "",
        expiryDate: L.isISODate(expiryDate) ? expiryDate : "",
        note: readValue(form, "note"),
        hasPhoto: existing ? !!existing.hasPhoto : false,
        createdAt: existing ? existing.createdAt : new Date().toISOString()
      };
      const file = form.elements.photo.files[0];
      const removePhoto = form.elements.removePhoto && form.elements.removePhoto.checked;
      try {
        if (removePhoto && record.hasPhoto) {
          await DB.deletePhoto(record.id);
          record.hasPhoto = false;
        }
        if (file) {
          const blob = await resizeImage(file);
          await DB.putPhoto(record.id, blob, v.id);
          record.hasPhoto = true;
        }
      } catch (error) {
        toast("Fotoğraf kaydedilemedi: " + error.message);
      }
      if (existing) {
        const idx = state.documents.findIndex(function (item) { return item.id === existing.id; });
        if (idx >= 0) state.documents[idx] = record;
      } else {
        state.documents.push(record);
      }
      saveState();
      closeSheet();
      render();
      toast(existing ? "Belge güncellendi." : "Belge eklendi.");
    });
  }

  function openReminderForm(existing) {
    const v = activeVehicle();
    if (!v) { openVehicleForm(null); return; }
    const currentOdo = L.currentOdometer(state, v.id);
    const r = existing || {};
    showSheet(
      sheetHead(existing ? "Hatırlatmayı düzenle" : "Manuel hatırlatma", "Tarih ve/veya kilometre bazlı.") +
      '<form class="form" id="reminderForm" novalidate>' +
      '<div class="field"><label for="reminderTitle">Başlık</label><input id="reminderTitle" name="title" value="' + esc(r.title || "") + '" placeholder="örn. Kış lastiği tak" required>' + errorSlot("title") + "</div>" +
      '<div class="field-row"><div class="field"><label for="reminderDate">Tarih</label><input id="reminderDate" name="dueDate" type="date" value="' + esc(r.dueDate || "") + '">' + errorSlot("dueDate") + "</div>" +
      '<div class="field"><label for="reminderOdo">Kilometre</label><input id="reminderOdo" name="dueOdometer" inputmode="numeric" value="' + esc(r.dueOdometer || "") + '" placeholder="örn. ' + esc((currentOdo || 0) + 5000) + '">' + errorSlot("dueOdometer") + "</div></div>" +
      '<p class="hint">En az bir tarih veya kilometre gir.</p>' +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">' + (existing ? "Güncelle" : "Kaydet") + "</button></div>" +
      "</form>"
    );
    const form = sheetBody.querySelector("#reminderForm");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors(form);
      const title = readValue(form, "title");
      const dueDate = readValue(form, "dueDate");
      const dueOdometer = Math.round(readNumber(form, "dueOdometer"));
      if (!title) return setError(form, "title", "Başlık gir.");
      if (dueDate && !L.isISODate(dueDate)) return setError(form, "dueDate", "Geçerli bir tarih seç.");
      if (!dueDate && !(dueOdometer > 0)) return setError(form, "dueDate", "Tarih veya kilometre gir.");
      const record = {
        id: existing ? existing.id : L.uid("reminder"),
        vehicleId: v.id,
        title: title,
        dueDate: L.isISODate(dueDate) ? dueDate : "",
        dueOdometer: dueOdometer > 0 ? dueOdometer : 0,
        done: existing ? !!existing.done : false,
        createdAt: existing ? existing.createdAt : new Date().toISOString()
      };
      if (existing) {
        const idx = state.reminders.findIndex(function (item) { return item.id === existing.id; });
        if (idx >= 0) state.reminders[idx] = record;
      } else {
        state.reminders.push(record);
      }
      saveState();
      closeSheet();
      render();
      toast(existing ? "Hatırlatma güncellendi." : "Hatırlatma eklendi.");
    });
  }

  function openVehicleForm(existing) {
    const v = existing || {};
    const intervals = Object.assign({}, L.VEHICLE_INTERVALS_DEFAULTS, v.intervals || {});
    showSheet(
      sheetHead(existing ? "Aracı düzenle" : "Araç ekle", "Bilgiler yalnızca bu cihazda saklanır.") +
      '<form class="form" id="vehicleForm" novalidate>' +
      '<div class="field"><label for="vehicleName">Araç adı</label><input id="vehicleName" name="name" value="' + esc(v.name || "") + '" placeholder="örn. Günlük araba" required>' + errorSlot("name") + "</div>" +
      '<div class="field-row"><div class="field"><label for="vehiclePlate">Plaka</label><input id="vehiclePlate" name="plate" value="' + esc(v.plate || "") + '" placeholder="34 ABC 123"></div>' +
      '<div class="field"><label for="vehicleFuelType">Yakıt</label><select id="vehicleFuelType" name="fuelType">' + options(L.FUEL_TYPES, v.fuelType || "gasoline") + "</select></div></div>" +
      '<div class="field-row"><div class="field"><label for="vehicleBrand">Marka</label><input id="vehicleBrand" name="brand" value="' + esc(v.brand || "") + '" placeholder="Renault"></div>' +
      '<div class="field"><label for="vehicleModel">Model</label><input id="vehicleModel" name="model" value="' + esc(v.model || "") + '" placeholder="Clio"></div></div>' +
      '<div class="field-row"><div class="field"><label for="vehicleYear">Yıl</label><input id="vehicleYear" name="year" inputmode="numeric" value="' + esc(v.year || "") + '" placeholder="2020">' + errorSlot("year") + "</div>" +
      '<div class="field"><label for="vehicleTank">Depo (L)</label><input id="vehicleTank" name="tankL" inputmode="decimal" value="' + esc(v.tankL || "") + '" placeholder="50"></div></div>' +
      '<div class="field-row"><div class="field"><label for="vehicleOdo">Alış kilometresi</label><input id="vehicleOdo" name="purchaseOdometer" inputmode="numeric" value="' + esc(v.purchaseOdometer || "") + '" placeholder="120000">' + errorSlot("purchaseOdometer") + "</div>" +
      '<div class="field"><label for="vehiclePurchaseDate">Alış tarihi</label><input id="vehiclePurchaseDate" name="purchaseDate" type="date" value="' + esc(v.purchaseDate || "") + '"></div></div>' +
      '<details class="intervals"><summary>Bakım aralıkları ve muayene / sigorta</summary>' +
      '<div class="field-row"><div class="field"><label for="intervalOilKm">Yağ (km)</label><input id="intervalOilKm" name="oilKm" inputmode="numeric" value="' + esc(intervals.oilKm) + '"></div>' +
      '<div class="field"><label for="intervalOilMonths">Yağ (ay)</label><input id="intervalOilMonths" name="oilMonths" inputmode="numeric" value="' + esc(intervals.oilMonths) + '"></div></div>' +
      '<div class="field-row"><div class="field"><label for="intervalTireKm">Lastik (km)</label><input id="intervalTireKm" name="tireKm" inputmode="numeric" value="' + esc(intervals.tireKm) + '"></div>' +
      '<div class="field"><label for="intervalTireMonths">Lastik (ay)</label><input id="intervalTireMonths" name="tireMonths" inputmode="numeric" value="' + esc(intervals.tireMonths) + '"></div></div>' +
      '<div class="field-row"><div class="field"><label for="intervalInspectionDate">Muayene tarihi</label><input id="intervalInspectionDate" name="inspectionDate" type="date" value="' + esc(intervals.inspectionDate || "") + '"></div>' +
      '<div class="field"><label for="intervalInsuranceDate">Sigorta bitişi</label><input id="intervalInsuranceDate" name="insuranceDate" type="date" value="' + esc(intervals.insuranceDate || "") + '"></div></div>' +
      "</details>" +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Vazgeç</button><button class="btn primary" type="submit">' + (existing ? "Güncelle" : "Araç ekle") + "</button></div>" +
      "</form>"
    );
    const form = sheetBody.querySelector("#vehicleForm");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors(form);
      const name = readValue(form, "name");
      const year = Math.round(readNumber(form, "year"));
      const purchaseOdometer = Math.round(readNumber(form, "purchaseOdometer"));
      if (!name) return setError(form, "name", "Araç adı gir.");
      if (year && (year < 1900 || year > 2100)) return setError(form, "year", "1900–2100 arası bir yıl gir.");
      if (purchaseOdometer < 0) return setError(form, "purchaseOdometer", "Kilometre negatif olamaz.");
      const record = L.normalizeVehicle({
        id: existing ? existing.id : L.uid("vehicle"),
        name: name,
        plate: readValue(form, "plate"),
        brand: readValue(form, "brand"),
        model: readValue(form, "model"),
        year: year,
        fuelType: form.elements.fuelType.value,
        tankL: readNumber(form, "tankL"),
        purchaseOdometer: purchaseOdometer,
        purchaseDate: readValue(form, "purchaseDate"),
        intervals: {
          oilKm: L.parseNumberInput(readValue(form, "oilKm")),
          oilMonths: L.parseNumberInput(readValue(form, "oilMonths")),
          tireKm: L.parseNumberInput(readValue(form, "tireKm")),
          tireMonths: L.parseNumberInput(readValue(form, "tireMonths")),
          inspectionDate: readValue(form, "inspectionDate"),
          insuranceDate: readValue(form, "insuranceDate"),
          inspectionMonths: intervals.inspectionMonths,
          insuranceMonths: intervals.insuranceMonths
        },
        createdAt: existing ? existing.createdAt : new Date().toISOString()
      });
      if (existing) {
        const idx = state.vehicles.findIndex(function (item) { return item.id === existing.id; });
        if (idx >= 0) state.vehicles[idx] = record;
      } else {
        state.vehicles.push(record);
        state.settings.activeVehicleId = record.id;
      }
      saveState();
      closeSheet();
      render();
      toast(existing ? "Araç güncellendi." : "Araç eklendi.");
    });
  }

  function openPhoto(id) {
    const doc = findById(state.documents, id);
    if (!doc) return;
    showSheet(
      sheetHead(doc.title, L.documentTypeName(doc.type)) +
      '<div class="photo-view"><img data-photo-id="' + esc(doc.id) + '" alt="' + esc(doc.title) + '"></div>' +
      '<div class="form-actions"><button class="btn ghost" type="button" data-close>Kapat</button><button class="btn primary" type="button" data-edit-photo="' + esc(doc.id) + '">Düzenle</button></div>'
    );
    loadPhotos();
    const editBtn = sheetBody.querySelector("[data-edit-photo]");
    if (editBtn) editBtn.addEventListener("click", function () { closeSheet(); setTimeout(function () { openDocumentForm(doc); }, 0); });
  }

  function resizeImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) { reject(new Error("Seçilen dosya görsel değil.")); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const limit = maxDim || 1400;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const ratio = Math.min(1, limit / Math.max(width, height));
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Görsel dönüştürülemedi."));
        }, "image/jpeg", quality || 0.78);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Görsel okunamadı.")); };
      img.src = url;
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataUrl) {
    const parts = String(dataUrl).split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(parts[1] || "");
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  async function exportBackup() {
    try {
      toast("Yedek hazırlanıyor...");
      const photos = [];
      if (DB) {
        try {
          const records = await DB.allPhotos();
          for (const record of records) {
            try {
              photos.push({ id: record.id, vehicleId: record.vehicleId, dataUrl: await blobToDataURL(record.blob) });
            } catch (error) { /* atla */ }
          }
        } catch (error) { /* fotoğraf deposu yoksa metin yedeği yine alınır */ }
      }
      const payload = {
        app: "arac-takip",
        version: 1,
        exportedAt: new Date().toISOString(),
        state: state,
        photos: photos
      };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "arac-takip-yedek-" + today() + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast("Yedek indirildi (" + photos.length + " fotoğraf).");
    } catch (error) {
      toast("Yedek oluşturulamadı: " + error.message);
    }
  }

  function handleImportFile(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function () {
      let imported;
      try {
        const parsed = JSON.parse(reader.result);
        imported = L.normalizeState(parsed.state || parsed);
      } catch (error) {
        toast("Yedek okunamadı: " + error.message);
        return;
      }
      const ok = await askConfirm(
        "Yedekten yükle",
        "Mevcut " + state.vehicles.length + " araç ve tüm kayıtlar, seçilen yedekle değiştirilecek. Devam edilsin mi?",
        "Yükle",
        true
      );
      if (!ok) return;
      try {
        const parsed = JSON.parse(reader.result);
        state = imported;
        saveState();
        if (DB) {
          try {
            await DB.clearPhotos();
            const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
            for (const photo of photos) {
              if (photo && photo.id && photo.dataUrl) {
                try { await DB.putPhoto(photo.id, dataURLToBlob(photo.dataUrl), photo.vehicleId || ""); } catch (error) { /* atla */ }
              }
            }
          } catch (error) { /* fotoğraflar geri yüklenemedi, metin verisi korunur */ }
        }
        if (location.hash !== "#panel") {
          location.hash = "panel";
        } else {
          render();
        }
        toast("Yedek yüklendi.");
      } catch (error) {
        toast("Yükleme başarısız: " + error.message);
      }
    };
    reader.onerror = function () { toast("Dosya okunamadı."); };
    reader.readAsText(file);
  }

  async function deleteVehicle(id) {
    const v = vehicleOf(id);
    if (!v) return;
    const ok = await askConfirm("Aracı sil", L.vehicleName(v) + " ve bu araca ait tüm yakıt, bakım, masraf, belge ve hatırlatmalar silinecek. Emin misin?", "Sil", true);
    if (!ok) return;
    state.vehicles = state.vehicles.filter(function (item) { return item.id !== id; });
    state.fuelLogs = state.fuelLogs.filter(function (item) { return item.vehicleId !== id; });
    state.services = state.services.filter(function (item) { return item.vehicleId !== id; });
    state.expenses = state.expenses.filter(function (item) { return item.vehicleId !== id; });
    state.documents = state.documents.filter(function (item) { return item.vehicleId !== id; });
    state.reminders = state.reminders.filter(function (item) { return item.vehicleId !== id; });
    if (state.settings.activeVehicleId === id) state.settings.activeVehicleId = state.vehicles.length ? state.vehicles[0].id : "";
    if (DB) DB.deleteForVehicle(id).catch(function () {});
    saveState();
    render();
    toast("Araç silindi.");
  }

  async function deleteRecord(kind, id) {
    const labels = { fuel: "Yakıt kaydı", service: "Bakım kaydı", expense: "Masraf kaydı", document: "Belge", reminder: "Hatırlatma" };
    const ok = await askConfirm(labels[kind] + " sil", "Bu kayıt kalıcı olarak silinecek. Emin misin?", "Sil", true);
    if (!ok) return;
    if (kind === "fuel") state.fuelLogs = state.fuelLogs.filter(function (item) { return item.id !== id; });
    if (kind === "service") state.services = state.services.filter(function (item) { return item.id !== id; });
    if (kind === "expense") state.expenses = state.expenses.filter(function (item) { return item.id !== id; });
    if (kind === "document") {
      state.documents = state.documents.filter(function (item) { return item.id !== id; });
      if (DB) DB.deletePhoto(id).catch(function () {});
    }
    if (kind === "reminder") state.reminders = state.reminders.filter(function (item) { return item.id !== id; });
    saveState();
    render();
    toast("Kayıt silindi.");
  }

  function runAction(action, id, value) {
    const v = activeVehicle();
    if (action === "add-vehicle") return openVehicleForm(null);
    if (!v && ["add-fuel", "add-service", "add-expense", "add-doc", "add-reminder"].indexOf(action) >= 0) return openVehicleForm(null);
    if (action === "add-fuel") return openFuelForm(null);
    if (action === "add-service") return openServiceForm(null);
    if (action === "add-expense") return openExpenseForm(null);
    if (action === "add-doc") return openDocumentForm(null);
    if (action === "add-reminder") return openReminderForm(null);
    if (action === "edit-fuel") return openFuelForm(findById(state.fuelLogs, id));
    if (action === "edit-service") return openServiceForm(findById(state.services, id));
    if (action === "edit-expense") return openExpenseForm(findById(state.expenses, id));
    if (action === "edit-doc") return openDocumentForm(findById(state.documents, id));
    if (action === "edit-reminder") return openReminderForm(findById(state.reminders, id));
    if (action === "edit-vehicle") return openVehicleForm(vehicleOf(id));
    if (action === "delete-fuel") return deleteRecord("fuel", id);
    if (action === "delete-service") return deleteRecord("service", id);
    if (action === "delete-expense") return deleteRecord("expense", id);
    if (action === "delete-doc") return deleteRecord("document", id);
    if (action === "delete-reminder") return deleteRecord("reminder", id);
    if (action === "delete-vehicle") return deleteVehicle(id);
    if (action === "select-vehicle") {
      state.settings.activeVehicleId = id;
      saveState();
      render();
      toast("Aktif araç değişti.");
      return;
    }
    if (action === "view-doc") return openPhoto(id);
    if (action === "done-reminder") {
      const reminder = findById(state.reminders, id);
      if (reminder) {
        reminder.done = true;
        saveState();
        render();
        toast("Hatırlatma tamamlandı.");
      }
      return;
    }
    if (action === "period") {
      expenseMonths = Number(value) || 6;
      render();
      return;
    }
    if (action === "set-theme") {
      state.settings.theme = value === "light" || value === "dark" ? value : "auto";
      saveState();
      applyTheme();
      render();
      return;
    }
    if (action === "export") return exportBackup();
    if (action === "import") return document.getElementById("importFile").click();
    if (action === "clear") return clearAll();
    if (action === "go-bakim") { location.hash = "bakim"; return; }
    if (action === "go-docs") { location.hash = "belgeler"; return; }
  }

  async function clearAll() {
    const ok = await askConfirm("Tüm verileri sil", "Bu cihazdaki tüm araçlar, kayıtlar ve fotoğraflar silinecek. Bu işlem geri alınamaz.", "Tümünü sil", true);
    if (!ok) return;
    state = L.defaultState();
    saveState();
    if (DB) DB.clearPhotos().catch(function () {});
    render();
    toast("Tüm veriler silindi.");
  }

  function handleViewClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || !document.getElementById("view").contains(target)) return;
    event.preventDefault();
    runAction(target.getAttribute("data-action"), target.getAttribute("data-id"), target.getAttribute("data-value"));
  }

  document.getElementById("view").addEventListener("change", function (event) {
    if (event.target.id === "currencySelect") {
      state.settings.currency = L.CURRENCIES[event.target.value] ? event.target.value : "TRY";
      saveState();
      render();
      toast("Para birimi güncellendi.");
    }
  });

  if (!location.hash || ROUTES.indexOf(location.hash.replace(/^#/, "")) < 0) {
    history.replaceState(null, "", "#panel");
  }
  render();
})();
