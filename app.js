(function () {
  "use strict";

  var grads = ["linear-gradient(135deg,#0ea5e9,#0369a1)", "linear-gradient(135deg,#f59e0b,#b45309)", "linear-gradient(135deg,#ec4899,#9d174d)", "linear-gradient(135deg,#34d399,#047857)", "linear-gradient(135deg,#a78bfa,#6d28d9)", "linear-gradient(135deg,#fb923c,#9a3412)", "linear-gradient(135deg,#22d3ee,#0e7490)", "linear-gradient(135deg,#f43f5e,#9f1239)"];
  var userColors = ["#38bdf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb7185", "#22d3ee", "#4ade80", "#c084fc", "#facc15"];
  var denoms = [{ v: 1000, l: "₱1000" }, { v: 500, l: "₱500" }, { v: 200, l: "₱200" }, { v: 100, l: "₱100" }, { v: 50, l: "₱50" }, { v: 20, l: "₱20" }, { v: 10, l: "₱10" }, { v: 5, l: "₱5" }, { v: 1, l: "₱1" }];
  var defaultProds = [
    { name: "Sardines", price: 22, photo: null, grad: 0 }, { name: "Egg", price: 8, photo: null, grad: 1 },
    { name: "Lollipop", price: 5, photo: null, grad: 2 }, { name: "Cup Noodles", price: 25, photo: null, grad: 5 },
    { name: "Juice", price: 12, photo: null, grad: 3 }, { name: "Water", price: 10, photo: null, grad: 6 },
    { name: "Rice 1kg", price: 58, photo: null, grad: 7 }, { name: "Bread", price: 65, photo: null, grad: 4 },
    { name: "Cream Silk", price: 15, photo: null, grad: 1 }, { name:"Bear Brand", price: 20, photo: null, grad: 4 }
  ];

  var products = [], transactions = [], utang = [];
  var currentUser = null, currentView = "store", searchQuery = "";
  var cart = {}, utangCart = {}, cashInput = "";
  var view = document.getElementById("view"), modal = document.getElementById("modal"), coBar = document.getElementById("checkoutBar");

  function money(n) { return "₱" + Number(n).toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }
  function ucolor(name) { if (avMap[name] && typeof avMap[name].i === "number" && AV[avMap[name].i]) return AV[avMap[name].i].bg; var h = 0; for (var i = 0; i < name.length; i++)h = (h * 31 + name.charCodeAt(i)) >>> 0; return userColors[h % userColors.length]; }
  function displayName(n) { return n || "Staff"; }
  function cartCount() { var n = 0; for (var k in cart) n += cart[k]; return n; }
  function cartTotal() { var t = 0; for (var k in cart) { var p = products.find(function (x) { return String(x.id) === String(k) }); t += p ? Number(p.price) * cart[k] : 0; } return Math.round(t * 100) / 100; }
  function utangCount() { var n = 0; for (var k in utangCart) n += utangCart[k]; return n; }
  function utangTotal() { var t = 0; for (var k in utangCart) { var p = products.find(function (x) { return String(x.id) === String(k) }); t += p ? Number(p.price) * utangCart[k] : 0; } return Math.round(t * 100) / 100; }
  function prodThumb(p, size) {
    if (p.photo) return '<img src="' + p.photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" onerror="this.style.display=\'none\'">';
    return '<div style="width:100%;height:100%;background:' + grads[p.grad || 0] + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:' + (size || 22) + 'px;border-radius:inherit;">' + p.name.charAt(0).toUpperCase() + '</div>';
  }
  function updateCoBar() {
    var c = cartCount();
    coBar.style.display = (currentView === "store" && c > 0) ? "block" : "none";
    document.getElementById("coCount").textContent = c + " item" + (c === 1 ? "" : "s");
    document.getElementById("coTotal").textContent = money(cartTotal()) + " → Checkout";
  }
  function updateUserChip() {
    var av = document.getElementById("userAvatar"), nm = document.getElementById("userName");
    var dn = displayName(currentUser);
    av.style.background = ucolor(dn); av.innerHTML = avTxt(dn);
    nm.textContent = dn;
    document.getElementById("userChip").setAttribute("aria-label", "Settings for " + dn);
  }

  // ---------- local storage (no server, works offline) ----------
  var K = { p: "orca_products", t: "orca_transactions", u: "orca_utang", n: "orca_users", c: "orca_current", th: "orca_theme", sd: "orca_skipdel" };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast("Storage full — export a backup"); return false; } }
  function getL(t) { return t === "products" ? products : t === "transactions" ? transactions : utang; }
  function setL(t, l) { if (t === "products") products = l; else if (t === "transactions") transactions = l; else utang = l; }
  function save(t) { lsSet(t === "products" ? K.p : t === "transactions" ? K.t : K.u, getL(t)); }
  function addRow(t, row) {
    var l = getL(t);
    row.id = l.reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, 0) + 1;
    row.created_at = new Date().toISOString();
    if (t === "products") l.push(row); else l.unshift(row);
    save(t); return row;
  }
  function updRow(t, id, patch) { getL(t).forEach(function (r) { if (String(r.id) === String(id)) Object.assign(r, patch); }); save(t); }
  function delRow(t, id) { setL(t, getL(t).filter(function (r) { return String(r.id) !== String(id); })); save(t); }
  function purgeOld() {
    var n = transactions.length;
    transactions = transactions.filter(function (t) { return !t.created_at || Date.now() - new Date(t.created_at).getTime() < 864e5; });
    if (transactions.length !== n) save("transactions");
  }
  function refreshData() {
    products = lsGet(K.p, null);
    if (!products || !products.length) {
      products = defaultProds.map(function (p, i) { return Object.assign({ id: i + 1 }, p); });
      lsSet(K.p, products);
    }
    products.sort(function (a, b) { return a.name.localeCompare(b.name); });
    transactions = lsGet(K.t, []); utang = lsGet(K.u, []); purgeOld();
    return Promise.resolve();
  }

  // ---------- profiles: just a typed name, no sign-in ----------
  var deferredInstall = null;
  var THEMES = [["abyss", "Abyss", "Deep-sea navy", "#0b1120"], ["orca", "Orca", "Black & white", "#050505"], ["arctic", "Arctic", "Light ice", "#e8f1f9"]];
  function toast(msg, kind) {
    var t = document.getElementById("toast"); if (!t) return;
    t.textContent = msg; t.classList.toggle("ok", kind === "ok"); t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function cleanName(s) {
    s = (s || "").replace(/[<>"'&\\`]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }
  function applyTheme(t) {
    var th = THEMES.find(function (x) { return x[0] === t; }) || THEMES[0];
    document.documentElement.setAttribute("data-theme", th[0]); lsSet(K.th, th[0]);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", th[3]);
  }
  function showWelcome() {
    document.getElementById("app").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    var users = lsGet(K.n, []), nl = document.getElementById("nameList");
    var trash = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
    nl.innerHTML = users.length ? '<p class="field-label">Choose your account</p><div class="acct-list">' + users.map(function (n) {
      return '<div class="acct-row"><button class="acct-pick bigbtn" data-n="' + n + '"><span class="ua lg" style="background:' + ucolor(n) + '">' + avTxt(n) + '</span><span class="acct-name">' + n + '</span></button>' +
        '<button class="acct-del bigbtn" data-n="' + n + '" aria-label="Delete account ' + n + '" title="Delete account">' + trash + '</button></div>';
    }).join("") + '</div><p class="or-line">or create a new account</p>' : "";
    Array.prototype.forEach.call(nl.querySelectorAll(".acct-pick"), function (b) { b.onclick = function () { startSession(b.getAttribute("data-n")); }; });
    Array.prototype.forEach.call(nl.querySelectorAll(".acct-del"), function (b) { b.onclick = function () { askDeleteAccount(b.getAttribute("data-n")); }; });
    document.getElementById("nameInput").value = ""; document.getElementById("nameErr").style.display = "none";
  }
  function startSession(name) {
    name = cleanName(name);
    if (!name) { document.getElementById("nameErr").style.display = "block"; return; }
    var users = lsGet(K.n, []);
    var hit = users.find(function (u) { return u.toLowerCase() === name.toLowerCase(); });
    if (hit) name = hit; else { users.push(name); lsSet(K.n, users); }
    lsSet(K.c, name);
    currentUser = name; if (!avMap[name]) avSet(name, { i: 0 });
    currentView = "store"; searchQuery = ""; cart = {}; utangCart = {};
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    Array.prototype.forEach.call(document.querySelectorAll(".navbtn"), function (x) { x.classList.toggle("active", x.getAttribute("data-view") === "store"); });
    updateUserChip();
    refreshData().then(function () { render(); });
  }
  document.getElementById("nameGo").onclick = function () { startSession(document.getElementById("nameInput").value); };
  document.getElementById("nameInput").onkeydown = function (e) { if (e.key === "Enter") startSession(this.value); };
  document.getElementById("logoutBtn").onclick = function () { closeModal(); lsSet(K.c, null); showWelcome(); };
  document.getElementById("userChip").onclick = openSettings;

  // ---------- profile picture: 5 icon avatars ----------
  var avMap = lsGet("orca_avatars", {});
  var AV = [
    { n: "Orca", bg: "#0ea5e9", s: '<path d="M8 24 C12 16 20 13 28 15 L30 10 L32 16 C34 18 35 21 34 23 C32 26 24 29 16 28 L14 31 L11 27 C9 26 8 25 8 24 Z" fill="#fff"/><ellipse cx="15" cy="25" rx="5" ry="2.5" fill="#0b1120"/><circle cx="16" cy="19" r="1.5" fill="#0b1120"/>' },
    { n: "Wave", bg: "#14b8a6", s: '<path d="M4 23 C8 13 14 13 18 20 C21 25 25 25 28 19 C30 15 34 14 36 17 L36 31 L4 31 Z" fill="#fff"/><path d="M5 16 C9 8 15 8 19 14" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' },
    { n: "Anchor", bg: "#6366f1", s: '<g fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="9" r="3.2"/><path d="M20 12.5V32M13 17h14M8 24c1 7 8 9 12 9s11-2 12-9M6 26l2-3 3 3M29 26l3-3 2 3"/></g>' },
    { n: "Fish", bg: "#f59e0b", s: '<ellipse cx="18" cy="20" rx="11" ry="7.5" fill="#fff"/><path d="M27 20L36 12V28Z" fill="#fff"/><circle cx="12" cy="18" r="1.7" fill="#0b1120"/>' },
    { n: "Starfish", bg: "#ec4899", s: '<polygon points="20,6 23.5,16 34,16.5 25.7,23 28.5,33 20,27.3 11.5,33 14.3,23 6,16.5 16.5,16" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>' }
  ];
  function avSvg(i) { return '<svg viewBox="0 0 40 40" width="64%" height="64%" aria-hidden="true">' + AV[i].s + '</svg>'; }
  function avTxt(n) { var a = avMap[n]; return a && typeof a.i === "number" && AV[a.i] ? avSvg(a.i) : String(n || "S").charAt(0).toUpperCase(); }
  function avSet(name, v) { if (v) avMap[name] = v; else delete avMap[name]; lsSet("orca_avatars", avMap); }

  // ---------- one reusable confirmation dialog ----------
  function confirmDialog(o) {
    openModal('<div class="dlg"><div class="dlg-ic' + (o.danger ? ' danger' : '') + '" aria-hidden="true">!</div><h3>' + o.title + '</h3>' +
      (o.note ? '<p class="dlg-note">' + o.note + '</p>' : '') +
      (o.checkbox ? '<label class="chk-row"><input type="checkbox" id="dlgChk"><span>' + o.checkbox + '</span></label>' : '') +
      '<div class="dlg-actions"><button id="dlgNo" class="btn-ghost bigbtn">' + (o.no || "Cancel") + '</button><button id="dlgYes" class="' + (o.danger ? 'btn-danger' : 'btn-primary') + ' bigbtn">' + o.yes + '</button></div></div>', true);
    document.getElementById("dlgNo").onclick = closeModal;
    document.getElementById("dlgYes").onclick = function () {
      var c = document.getElementById("dlgChk"), chk = !!(c && c.checked);
      closeModal(); if (o.onYes) o.onYes(chk);
    };
    document.getElementById("dlgNo").focus();
  }

  // ---------- delete an account + its sales history ----------
  function askDeleteAccount(name) {
    confirmDialog({
      title: "ARE YOU SURE YOU WANT TO DELETE THIS ACCOUNT?",
      note: "“" + esc(name) + "” and all of its sales history will be erased. Unpaid utang records are kept.",
      yes: "Delete account", danger: true, onYes: function () { deleteAccount(name); }
    });
  }
  function deleteAccount(name) {
    lsSet(K.n, lsGet(K.n, []).filter(function (u) { return u !== name; }));
    avSet(name, null);
    transactions = lsGet(K.t, []).filter(function (t) { return t.user_name !== name && t.user_email !== name; });
    lsSet(K.t, transactions);
    if (lsGet(K.c, null) === name) lsSet(K.c, null);
    showWelcome(); toast("✓ Account “" + name + "” was deleted", "ok");
  }

  // ---------- fix a wrong name: updates all past sales + utang ----------
  function renameUser(raw) {
    var nn = cleanName(raw), old = currentUser;
    if (!nn) { toast("Type a name first"); return; }
    if (nn === old) { closeModal(); return; }
    var users = lsGet(K.n, []);
    var other = users.find(function (u) { return u.toLowerCase() === nn.toLowerCase() && u !== old; });
    if (other) { if (!confirm('"' + other + '" already exists. Merge your sales into that name?')) return; nn = other; }
    if (avMap[old]) { avMap[nn] = avMap[nn] || avMap[old]; delete avMap[old]; lsSet("orca_avatars", avMap); }
    transactions.forEach(function (t) { if (t.user_name === old) { t.user_name = nn; t.user_email = nn; } });
    utang.forEach(function (u) { if (u.accepted_name === old) { u.accepted_name = nn; u.accepted_by = nn; } });
    save("transactions"); save("utang");
    users = users.filter(function (u) { return u !== old && u !== nn; }); users.push(nn); lsSet(K.n, users);
    lsSet(K.c, nn); currentUser = nn;
    updateUserChip(); closeModal(); render(); toast("Name changed to " + nn);
  }

  // ---------- settings: interface, install, backup ----------
  function openSettings() {
    var cur = document.documentElement.getAttribute("data-theme");
    var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    var inst = standalone ? '<p class="m-note">✓ Installed — running as an app.</p>'
      : deferredInstall ? '<button id="installBtn" class="btn-primary bigbtn" style="font-size:15px;">Install ORCA POS</button>'
        : '<p class="m-note">iPhone: tap Share → Add to Home Screen.<br>Android / Chrome: menu → Install app.</p>';
    openModal(
      '<div class="m-head"><h3>Settings</h3><button id="xSet" class="bigbtn x-btn" aria-label="Close settings">×</button></div>' +
      '<p class="m-label" style="margin-top:2px;">Your name</p><div class="row-gap"><input id="renameInput" type="text" class="text-input" style="margin:0;flex:1;" maxlength="16" autocomplete="off" aria-label="Your name" value="' + esc(currentUser) + '"><button id="renameBtn" class="btn-primary bigbtn inline-btn">Save</button></div>' +
      '<p class="m-label">Profile picture</p><div class="av-row"><span id="avPrev" class="av-prev"></span><div id="avGrid" class="av-grid" role="radiogroup" aria-label="Profile picture"></div></div>' +
      '<p class="m-label">Look</p><div class="theme-grid">' + THEMES.map(function (t) {
        return '<button class="theme-opt bigbtn' + (t[0] === cur ? " on" : "") + '" data-t="' + t[0] + '"><span class="theme-prev tp-' + t[0] + '"><i></i><i></i></span><b>' + t[1] + '</b><small>' + t[2] + '</small></button>';
      }).join("") + '</div>' +
      '<p class="m-label">Items</p><label class="chk-row" style="margin-bottom:0;"><input type="checkbox" id="askDel"' + (lsGet(K.sd, false) ? "" : " checked") + '><span>Ask before deleting an item</span></label>' +
      '<p class="m-label">Install as app</p>' + inst +
      '<p class="m-label">Backup · data lives only on this device</p>' +
      '<div class="row-gap"><button id="expBtn" class="btn-ghost bigbtn" style="margin:0;flex:1;">Export backup</button>' +
      '<label class="btn-ghost bigbtn" style="margin:0;flex:1;text-align:center;display:flex;align-items:center;justify-content:center;">Restore<input id="impInput" type="file" accept="application/json,.json" style="display:none;"></label></div>' +
      '<p class="m-label">Account</p>' +
      '<button id="swBtn" class="btn-ghost bigbtn" style="margin-top:0;">Switch user</button>' +
      '<button id="exitBtn" class="btn-ghost bigbtn">Exit app</button>' +
      '<button id="delAcc" class="btn-danger bigbtn">Delete this account</button>'
    );
    document.getElementById("xSet").onclick = closeModal;
    function avDraw() {
      var pv = document.getElementById("avPrev"); pv.style.background = ucolor(currentUser); pv.innerHTML = avTxt(currentUser);
      var a = avMap[currentUser] || {};
      Array.prototype.forEach.call(modal.querySelectorAll(".av-opt"), function (b, i) { var on = a.i === i; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
      updateUserChip();
    }
    AV.forEach(function (v, i) {
      var b = document.createElement("button"); b.className = "av-opt bigbtn"; b.setAttribute("role", "radio"); b.setAttribute("aria-label", v.n); b.title = v.n;
      b.innerHTML = '<span style="background:' + v.bg + '">' + avSvg(i) + '</span>';
      b.onclick = function () { avSet(currentUser, { i: i }); avDraw(); }; document.getElementById("avGrid").appendChild(b);
    });
    avDraw();
    document.getElementById("renameBtn").onclick = function () { renameUser(document.getElementById("renameInput").value); };
    document.getElementById("renameInput").onkeydown = function (e) { if (e.key === "Enter") renameUser(this.value); };
    document.getElementById("askDel").onchange = function () { lsSet(K.sd, !this.checked); toast(this.checked ? "Item deletion will ask first" : "Item deletion won’t ask again"); };
    Array.prototype.forEach.call(modal.querySelectorAll(".theme-opt"), function (b) {
      b.onclick = function () { applyTheme(b.getAttribute("data-t")); Array.prototype.forEach.call(modal.querySelectorAll(".theme-opt"), function (x) { x.classList.toggle("on", x === b); }); };
    });
    var ib = document.getElementById("installBtn");
    if (ib) ib.onclick = function () { deferredInstall.prompt(); deferredInstall.userChoice.then(function () { deferredInstall = null; closeModal(); }); };
    document.getElementById("swBtn").onclick = function () { closeModal(); lsSet(K.c, null); showWelcome(); };
    document.getElementById("exitBtn").onclick = askExit;
    document.getElementById("delAcc").onclick = function () { var n = currentUser; closeModal(); askDeleteAccount(n); };
    document.getElementById("expBtn").onclick = function () {
      var data = { app: "orca-pos", v: 1, exported: new Date().toISOString(), products: products, transactions: transactions, utang: utang, users: lsGet(K.n, []), avatars: avMap };
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
      a.download = "orca-pos-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove(); toast("✓ Backup saved", "ok");
    };
    document.getElementById("impInput").onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result);
          if (d.app !== "orca-pos" || !Array.isArray(d.products)) throw 0;
          if (!confirm("Replace ALL data on this device with this backup?")) return;
          lsSet(K.p, d.products); lsSet(K.t, d.transactions || []); lsSet(K.u, d.utang || []); lsSet(K.n, d.users || []); avMap = d.avatars || {}; lsSet("orca_avatars", avMap);
          closeModal(); refreshData().then(function () { render(); toast("✓ Backup restored", "ok"); });
        } catch (x) { toast("That file isn’t an ORCA backup"); }
      };
      r.readAsText(f);
    };
  }

  // ---------- nav ----------
  Array.prototype.forEach.call(document.querySelectorAll(".navbtn"), function (b) {
    b.onclick = function () {
      currentView = b.getAttribute("data-view"); searchQuery = "";
      Array.prototype.forEach.call(document.querySelectorAll(".navbtn"), function (x) { x.classList.remove("active") });
      b.classList.add("active");
      refreshData().then(function () { render(); });
    };
  });
  function render() {
    if (currentView === "store") renderStore();
    else if (currentView === "add") renderAdd();
    else if (currentView === "utang") renderUtang();
    else if (currentView === "history") renderHistory();
    else renderCalc();
    updateCoBar(); updateUserChip();
  }

  // ---------- STORE ----------
  function renderStore() {
    view.innerHTML = '<div class="fadein">' +
      '<section class="welcome"><div class="welcome-txt"><h2>Welcome, ' + displayName(currentUser) + '!</h2><p>Tap an item to add it to your basket.</p></div><svg class="welcome-orca bob" viewBox="0 0 120 90" role="img" aria-label="A friendly orca"><use href="#orcaCute"/></svg></section>' +
      '<div style="position:relative;margin-bottom:14px;">' +
      '<svg style="color:var(--muted);position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input id="searchInput" type="text" aria-label="Search items" placeholder="Search items..." value="' + searchQuery + '" style="width:100%;box-sizing:border-box;padding:13px 14px 13px 42px;font-size:15px;border:2px solid var(--border);border-radius:14px;background:var(--card);color:var(--text);">' +
      (searchQuery ? '<button id="clearSearch" class="bigbtn" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.08);border:none;color:var(--muted);width:28px;height:28px;border-radius:50%;font-size:14px;font-weight:800;cursor:pointer;">×</button>' : '') +
      '</div>' +
      '<div id="pg" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;"></div>' +
      '<div id="noMatch" style="display:none;text-align:center;padding:40px 20px;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:16px;">No items match "' + searchQuery + '"</div></div>';
    var si = document.getElementById("searchInput");
    si.oninput = function () { searchQuery = si.value; fillGrid(); };
    var cs = document.getElementById("clearSearch"); if (cs) cs.onclick = function () { searchQuery = ""; si.value = ""; fillGrid(); };
    fillGrid();
  }
  function fillGrid() {
    var grid = document.getElementById("pg"); if (!grid) return;
    grid.innerHTML = "";
    var q = searchQuery.trim().toLowerCase();
    var list = q ? products.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; }) : products;
    document.getElementById("noMatch").style.display = list.length ? "none" : "block";
    list.forEach(function (p) {
      var qty = cart[p.id] || 0;
      var card = document.createElement("div");
      card.className = "pcard";
      card.style.cssText = "background:var(--card);border:2px solid " + (qty ? "var(--accent)" : "var(--border)") + ";border-radius:16px;padding:10px;text-align:center;position:relative;";
      card.innerHTML = (qty ? '<span style="position:absolute;top:-8px;right:-8px;background:var(--accent);color:#0b1120;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;box-shadow:0 0 12px rgba(56,189,248,.5);">' + qty + '</span>' : '') +
        '<div style="height:64px;border-radius:12px;overflow:hidden;margin-bottom:8px;border:1px solid rgba(255,255,255,.08);">' + prodThumb(p, 22) + '</div>' +
        '<div style="font-size:12px;font-weight:700;line-height:1.2;margin-bottom:5px;min-height:30px;display:flex;align-items:center;justify-content:center;">' + p.name + '</div>' +
        '<div style="font-size:15px;font-weight:800;color:var(--accent-t);">' + money(Number(p.price)) + '</div>';
      card.onclick = function () { cart[p.id] = (cart[p.id] || 0) + 1; fillGrid(); updateCoBar(); };
      grid.appendChild(card);
    });
  }

  // ---------- CHECKOUT ----------
  document.getElementById("checkoutBtn").onclick = openCheckout;
  function openCheckout() {
    cashInput = "";
    openModal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><h3 style="margin:0;font-size:19px;font-weight:800;">Checkout · ' + displayName(currentUser) + '</h3><button id="xClose" class="bigbtn" style="background:rgba(56,189,248,.14);border:none;color:var(--accent-t);width:34px;height:34px;border-radius:50%;font-size:17px;font-weight:800;cursor:pointer;">×</button></div>' +
      '<p style="margin:0 0 6px;font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Your basket · − to reduce · × to remove</p>' +
      '<div id="coRows" style="max-height:22vh;overflow-y:auto;margin-bottom:8px;"></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid var(--border);margin-bottom:12px;"><span style="font-size:16px;font-weight:700;">TOTAL</span><span id="coTotalAmt" style="font-size:24px;font-weight:800;color:var(--accent-t);">' + money(cartTotal()) + '</span></div>' +
      '<p style="margin:0 0 6px;font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Cash received (₱):</p>' +
      '<div id="cashDisplay" style="background:var(--card2);border:2px solid var(--accent);border-radius:14px;padding:12px;font-size:26px;font-weight:800;text-align:center;margin-bottom:10px;color:var(--accent-t);">₱0.00</div>' +
      '<div id="changeBox" style="display:none;background:rgba(16,185,129,.1);border:2px solid #10b981;border-radius:14px;padding:10px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-weight:700;font-size:14px;color:#6ee7b7;">Change (Sukli)</span><span id="changeAmt" style="font-weight:800;font-size:18px;color:#34d399;">₱0.00</span></div><div id="denomBreak" style="font-size:12px;color:#6ee7b7;line-height:1.5;"></div></div>' +
      '<div id="shortMsg" style="display:none;background:rgba(239,68,68,.12);border:2px solid #ef4444;color:#fca5a5;border-radius:14px;padding:8px;text-align:center;font-weight:700;font-size:13px;margin-bottom:10px;">Cash is short!</div>' +
      '<div id="numpad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;"></div>' +
      '<button id="completeSale" class="bigbtn" style="width:100%;padding:14px;border-radius:16px;border:none;background:#10b981;color:#052e16;font-size:17px;font-weight:800;cursor:pointer;opacity:.5;pointer-events:none;">Complete Sale</button>'
    );
    function renderRows() {
      var cr = document.getElementById("coRows"); if (!cr) return;
      cr.innerHTML = "";
      Object.keys(cart).forEach(function (id) {
        var p = products.find(function (x) { return String(x.id) === String(id) }); if (!p) return; var q = cart[id];
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;padding:7px 0;font-size:14px;";
        row.innerHTML = '<span style="flex:1;">' + p.name + '</span>' +
          '<button class="minusItem bigbtn" data-id="' + id + '" style="width:26px;height:26px;border-radius:8px;border:none;background:rgba(56,189,248,.15);color:var(--accent-t);font-size:16px;font-weight:800;cursor:pointer;line-height:1;">−</button>' +
          '<span style="font-weight:700;min-width:20px;text-align:center;">' + q + '</span>' +
          '<button class="plusItem bigbtn" data-id="' + id + '" style="width:26px;height:26px;border-radius:8px;border:none;background:rgba(52,211,153,.15);color:#34d399;font-size:16px;font-weight:800;cursor:pointer;line-height:1;">+</button>' +
          '<span style="font-weight:700;min-width:62px;text-align:right;">' + money(Number(p.price) * q) + '</span>' +
          '<button class="delItem bigbtn" data-id="' + id + '" style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(239,68,68,.15);color:#f87171;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0;">×</button>';
        cr.appendChild(row);
      });
      document.getElementById("coTotalAmt").textContent = money(cartTotal());
      Array.prototype.forEach.call(cr.querySelectorAll(".minusItem"), function (b) { b.onclick = function () { var id = b.getAttribute("data-id"); cart[id]--; if (cart[id] <= 0) delete cart[id]; afterCartChange(); }; });
      Array.prototype.forEach.call(cr.querySelectorAll(".plusItem"), function (b) { b.onclick = function () { var id = b.getAttribute("data-id"); cart[id] = (cart[id] || 0) + 1; afterCartChange(); }; });
      Array.prototype.forEach.call(cr.querySelectorAll(".delItem"), function (b) { b.onclick = function () { delete cart[b.getAttribute("data-id")]; afterCartChange(); }; });
    }
    function afterCartChange() {
      fillGrid();
      if (cartCount() === 0) { closeModal(); updateCoBar(); return; }
      renderRows(); updateCash(); updateCoBar();
    }
    renderRows();
    var np = document.getElementById("numpad");
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].forEach(function (k) {
      var b = document.createElement("button"); b.className = "numpad"; b.textContent = k;
      b.style.cssText = "padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--card2);font-size:19px;font-weight:800;color:var(--text);";
      if (k === "C") b.style.color = "#f87171";
      b.onclick = function () { buzz(10); if (k === "C") cashInput = ""; else if (k === "⌫") cashInput = cashInput.slice(0, -1); else if (cashInput.length < 7) cashInput += k; updateCash(); };
      np.appendChild(b);
    });
    document.getElementById("xClose").onclick = closeModal;
    document.getElementById("completeSale").onclick = completeSale;
    updateCash();
  }
  function updateCash() {
    var cash = parseFloat(cashInput || "0") / 100;
    var cd = document.getElementById("cashDisplay"); if (cd) cd.textContent = money(cash);
    var total = cartTotal(), change = cash - total;
    var cb = document.getElementById("changeBox"), sm = document.getElementById("shortMsg"), cs = document.getElementById("completeSale");
    if (!cb) return;
    if (!cashInput || cash === 0) { cb.style.display = "none"; sm.style.display = "none"; cs.style.opacity = ".5"; cs.style.pointerEvents = "none"; return; }
    if (change < 0) { cb.style.display = "none"; sm.style.display = "block"; cs.style.opacity = ".5"; cs.style.pointerEvents = "none"; return; }
    sm.style.display = "none"; cb.style.display = "block";
    document.getElementById("changeAmt").textContent = money(change);
    var cents = Math.round(change * 100), parts = [];
    denoms.forEach(function (d) { var c = Math.floor(cents / (d.v * 100)); cents = cents % (d.v * 100); if (c > 0) parts.push(c + "× " + d.l); });
    document.getElementById("denomBreak").textContent = parts.join(" · ") || "Exact amount";
    cs.style.opacity = "1"; cs.style.pointerEvents = "auto";
  }
  async function completeSale() {
    var cash = parseFloat(cashInput || "0") / 100;
    var items = Object.keys(cart).map(function (id) { var p = products.find(function (x) { return String(x.id) === String(id) }); return { name: p.name, qty: cart[id], price: Number(p.price) }; });
    var btn = document.getElementById("completeSale"); btn.textContent = "Saving..."; btn.style.pointerEvents = "none";
    addRow("transactions", {
      user_email: currentUser, user_name: displayName(currentUser),
      items: items, total: cartTotal(), cash: cash, change: cash - cartTotal()
    });
    cart = {}; closeModal(); updateCoBar();
    openModal('<div class="pop" style="text-align:center;padding:20px 0;"><div style="width:66px;height:66px;border-radius:50%;background:#10b981;color:#052e16;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;margin:0 auto 12px;">✓</div><h3 style="margin:0 0 4px;font-size:21px;font-weight:800;">Sale Complete!</h3><p style="margin:0 0 16px;color:var(--muted);font-size:14px;">Saved under ' + displayName(currentUser) + ' · kept in History for 24 hours</p><button id="okSale" class="bigbtn" style="width:100%;padding:14px;border-radius:14px;border:none;background:var(--accent);color:#0b1120;font-size:16px;font-weight:800;cursor:pointer;">OK</button></div>');
    document.getElementById("okSale").onclick = function () { closeModal(); refreshData().then(function () { renderStore(); }); };
  }

  // ---------- UTANG ----------
  function renderUtang() {
    var totalUtang = utang.reduce(function (s, u) { return s + Number(u.total); }, 0);
    var uc = utangCount();
    var selChips = "";
    if (uc > 0) {
      selChips = '<div style="margin:10px 0 12px;"><p style="margin:0 0 6px;font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Selected items:</p>' +
        Object.keys(utangCart).map(function (id) { var p = products.find(function (x) { return String(x.id) === String(id) }); if (!p) return ""; return '<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.4);color:#fbbf24;border-radius:20px;padding:5px 6px 5px 10px;margin:0 6px 6px 0;font-size:12px;font-weight:700;">' + utangCart[id] + '× ' + p.name + ' <button class="rmUtangItem bigbtn" data-id="' + id + '" style="width:18px;height:18px;border-radius:50%;border:none;background:rgba(239,68,68,.2);color:#f87171;font-size:11px;font-weight:800;cursor:pointer;line-height:1;padding:0;">×</button></span>'; }).join("") +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><span style="font-size:13px;color:var(--muted);font-weight:700;">Total utang:</span><span style="font-size:20px;font-weight:800;color:#fbbf24;">' + money(utangTotal()) + '</span></div></div>';
    }
    view.innerHTML = '<div class="fadein">' +
      '<h2 style="margin:0 0 4px;font-size:21px;font-weight:800;">Utang (Credit)</h2>' +
      '<p style="margin:0 0 14px;color:var(--muted);font-size:13px;">Record who owes, pick multiple items, mark paid later.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">' +
      '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;padding:16px;text-align:center;color:#0b1120;box-shadow:0 6px 18px rgba(245,158,11,.3);"><div style="font-size:22px;font-weight:800;">' + money(totalUtang) + '</div><div style="font-size:11px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.08em;">Total Utang</div></div>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;text-align:center;"><div style="font-size:22px;font-weight:800;">' + utang.length + '</div><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Records</div></div></div>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:16px;margin-bottom:16px;">' +
      '<p style="margin:0 0 8px;font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Record new utang · accepted by ' + displayName(currentUser) + '</p>' +
      '<input id="utangName" type="text" placeholder="Who owes? (e.g. Aling Nena)" maxlength="16" style="width:100%;box-sizing:border-box;padding:13px;font-size:15px;border:2px solid var(--border);border-radius:12px;margin-bottom:9px;background:var(--card2);color:var(--text);">' +
      '<button id="pickProductsBtn" class="bigbtn" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-radius:12px;border:2px dashed rgba(245,158,11,.5);background:rgba(245,158,11,.08);color:#fbbf24;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:9px;"><span>Tap to pick products</span><span style="background:#f59e0b;color:#0b1120;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:800;">' + (uc ? uc + " item" + (uc === 1 ? "" : "s") : "none") + '</span></button>' +
      selChips +
      '<button id="addUtangBtn" class="bigbtn" style="width:100%;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0b1120;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(245,158,11,.35);">+ Record Utang</button>' +
      '<p id="utangErr" style="display:none;color:#f87171;font-size:12px;margin:7px 0 0;text-align:center;font-weight:700;">Enter a name and pick at least one product</p></div>' +
      '<h3 style="margin:0 0 10px;font-size:15px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);">Unpaid utang · tap ✓ when paid</h3>' +
      '<div id="utangList"></div></div>';
    document.getElementById("pickProductsBtn").onclick = openUtangPicker;
    Array.prototype.forEach.call(view.querySelectorAll(".rmUtangItem"), function (b) { b.onclick = function () { delete utangCart[b.getAttribute("data-id")]; renderUtang(); }; });
    document.getElementById("addUtangBtn").onclick = async function () {
      var nm = document.getElementById("utangName").value.trim();
      if (!nm || utangCount() === 0) { document.getElementById("utangErr").style.display = "block"; return; }
      var items = Object.keys(utangCart).map(function (id) { var p = products.find(function (x) { return String(x.id) === String(id) }); return { name: p.name, qty: utangCart[id], price: Number(p.price) }; });
      var btn = document.getElementById("addUtangBtn"); btn.textContent = "Saving..."; btn.style.pointerEvents = "none";
      addRow("utang", {
        debtor_name: nm.charAt(0).toUpperCase() + nm.slice(1).toLowerCase(),
        items: items, total: utangTotal(),
        accepted_by: currentUser, accepted_name: displayName(currentUser)
      });
      utangCart = {};
      await refreshData(); renderUtang();
    };
    var ul = document.getElementById("utangList");
    if (!utang.length) { ul.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:16px;">No utang recorded.</div>'; }
    utang.forEach(function (u) {
      var items = (u.items || []).map(function (i) { return i.qty + "× " + i.name; }).join(", ");
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:11px;margin-bottom:8px;";
      row.innerHTML = '<span style="width:38px;height:38px;border-radius:50%;background:' + ucolor(u.debtor_name) + ';color:#0b1120;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;">' + avTxt(u.debtor_name) + '</span>' +
        '<span style="flex:1;min-width:0;"><span style="display:block;font-weight:800;font-size:14px;">' + u.debtor_name + '</span><span style="display:block;font-size:12px;color:var(--text2);line-height:1.4;">' + items + '</span><span style="display:block;font-size:11px;color:var(--muted);margin-top:2px;">' + (u.created_at ? new Date(u.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "") + (u.accepted_name ? ' · by ' + u.accepted_name : '') + '</span></span>' +
        '<span style="font-weight:800;color:#fbbf24;font-size:16px;flex-shrink:0;">' + money(Number(u.total)) + '</span>' +
        '<button class="payUtang bigbtn" data-id="' + u.id + '" style="width:32px;height:32px;border-radius:50%;border:none;background:rgba(16,185,129,.18);color:#34d399;font-size:15px;font-weight:800;cursor:pointer;flex-shrink:0;">✓</button>';
      ul.appendChild(row);
    });
    Array.prototype.forEach.call(ul.querySelectorAll(".payUtang"), function (b) {
      b.setAttribute("aria-label", "Mark as paid");
      b.onclick = function () {
        var id = b.getAttribute("data-id"), u = utang.find(function (x) { return String(x.id) === String(id); }); if (!u) return;
        confirmDialog({ title: "Mark this utang as paid?", note: esc(u.debtor_name) + " · " + money(Number(u.total)) + ". The record will be removed.", yes: "Mark as paid", onYes: async function () { delRow("utang", id); await refreshData(); renderUtang(); toast("✓ Utang marked as paid", "ok"); } });
      };
    });
  }

  function openUtangPicker() {
    openModal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><h3 style="margin:0;font-size:19px;font-weight:800;">Pick products</h3><button id="pickClose" class="bigbtn" style="background:rgba(56,189,248,.14);border:none;color:var(--accent-t);width:34px;height:34px;border-radius:50%;font-size:17px;font-weight:800;cursor:pointer;">×</button></div>' +
      '<p style="margin:0 0 10px;font-size:12px;color:var(--muted);">Tap + to add, − to reduce. Pick as many as you want.</p>' +
      '<div id="pickRows" style="max-height:48vh;overflow-y:auto;margin-bottom:12px;"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:10px 14px;background:rgba(245,158,11,.1);border:1.5px solid rgba(245,158,11,.4);border-radius:14px;"><span style="font-weight:700;font-size:14px;color:#fbbf24;">Total</span><span id="pickTotal" style="font-weight:800;font-size:20px;color:#fbbf24;">₱0.00</span></div>' +
      '<button id="pickDone" class="bigbtn" style="width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0b1120;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(245,158,11,.35);">Done — Back to utang</button>'
    );
    function fillPicker() {
      var pr = document.getElementById("pickRows"); if (!pr) return;
      pr.innerHTML = "";
      products.forEach(function (p) {
        var q = utangCart[p.id] || 0;
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);";
        row.innerHTML = '<div style="width:40px;height:40px;border-radius:10px;overflow:hidden;flex-shrink:0;">' + prodThumb(p, 16) + '</div>' +
          '<span style="flex:1;font-weight:700;font-size:14px;">' + p.name + '</span>' +
          '<span style="font-weight:700;color:var(--muted);font-size:13px;min-width:52px;text-align:right;">' + money(Number(p.price)) + '</span>' +
          '<button class="pMinus bigbtn" data-id="' + p.id + '" style="width:30px;height:30px;border-radius:9px;border:none;background:rgba(56,189,248,.15);color:var(--accent-t);font-size:17px;font-weight:800;cursor:pointer;line-height:1;flex-shrink:0;">−</button>' +
          '<span style="font-weight:800;min-width:22px;text-align:center;font-size:15px;color:' + (q ? "#fbbf24" : "#475569") + ';">' + q + '</span>' +
          '<button class="pPlus bigbtn" data-id="' + p.id + '" style="width:30px;height:30px;border-radius:9px;border:none;background:rgba(52,211,153,.18);color:#34d399;font-size:17px;font-weight:800;cursor:pointer;line-height:1;flex-shrink:0;">+</button>';
        pr.appendChild(row);
      });
      document.getElementById("pickTotal").textContent = money(utangTotal());
      Array.prototype.forEach.call(pr.querySelectorAll(".pMinus"), function (b) { b.onclick = function () { var id = b.getAttribute("data-id"); if (utangCart[id]) { utangCart[id]--; if (utangCart[id] <= 0) delete utangCart[id]; } fillPicker(); }; });
      Array.prototype.forEach.call(pr.querySelectorAll(".pPlus"), function (b) { b.onclick = function () { var id = b.getAttribute("data-id"); utangCart[id] = (utangCart[id] || 0) + 1; fillPicker(); }; });
    }
    fillPicker();
    document.getElementById("pickClose").onclick = closeModal;
    document.getElementById("pickDone").onclick = function () { closeModal(); renderUtang(); };
  }

  // ---------- ADD / EDIT PRODUCTS ----------
  var selectedGrad = 0, selectedPhoto = null;
  function renderAdd() {
    selectedGrad = 0; selectedPhoto = null;
    view.innerHTML = '<div class="fadein"><h2 style="margin:0 0 4px;font-size:21px;font-weight:800;">Add item to sell</h2><p style="margin:0 0 14px;color:var(--muted);font-size:13px;">Add photo or pick a default color · saved on this device.</p>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;padding:16px;margin-bottom:16px;">' +
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">' +
      '<div id="photoPreview" style="width:68px;height:68px;border-radius:16px;overflow:hidden;flex-shrink:0;border:2px dashed var(--accent);display:flex;align-items:center;justify-content:center;color:var(--accent-t);font-size:26px;font-weight:800;background:var(--card2);">?</div>' +
      '<div style="flex:1;min-width:150px;"><label class="bigbtn" style="display:block;background:linear-gradient(135deg,var(--accent),var(--accent-d));color:#0b1120;padding:9px 14px;border-radius:12px;font-size:13px;font-weight:800;text-align:center;cursor:pointer;margin-bottom:6px;">Upload Photo<input id="photoInput" type="file" accept="image/*" style="display:none;"></label><button id="clearPhoto" class="bigbtn" style="width:100%;padding:7px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;">Use default</button></div></div>' +
      '<p style="margin:0 0 6px;font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Default color:</p><div id="swatches" style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px;"></div>' +
      '<input id="newName" type="text" placeholder="Item name" style="width:100%;box-sizing:border-box;padding:13px;font-size:15px;border:2px solid var(--border);border-radius:12px;margin-bottom:9px;background:var(--card2);color:var(--text);">' +
      '<input id="newPrice" type="number" inputmode="decimal" placeholder="Price in ₱" style="width:100%;box-sizing:border-box;padding:13px;font-size:15px;border:2px solid var(--border);border-radius:12px;margin-bottom:11px;background:var(--card2);color:var(--text);">' +
      '<button id="addBtn" class="bigbtn" style="width:100%;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent-d));color:#0b1120;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(56,189,248,.35);">+ Add Item</button>' +
      '<p id="addErr" style="display:none;color:#f87171;font-size:12px;margin:7px 0 0;text-align:center;font-weight:700;">Enter name and valid price</p></div>' +
      '<h3 style="margin:0 0 10px;font-size:15px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);">Your items · tap to edit, × to delete</h3><div id="prodList"></div></div>';
    var sw = document.getElementById("swatches");
    grads.forEach(function (g, i) {
      var d = document.createElement("div"); d.className = "swatch";
      d.style.cssText = "width:32px;height:32px;border-radius:50%;background:" + g + ";border:3px solid " + (i === 0 ? "#fff" : "transparent");
      d.onclick = function () { selectedGrad = i; selectedPhoto = null; refreshPP(); Array.prototype.forEach.call(sw.children, function (x) { x.style.border = "3px solid transparent" }); d.style.border = "3px solid #fff"; };
      sw.appendChild(d);
    });
    function refreshPP() {
      var pp = document.getElementById("photoPreview"); if (!pp) return;
      if (selectedPhoto) pp.innerHTML = '<img src="' + selectedPhoto + '" style="width:100%;height:100%;object-fit:cover;display:block;">';
      else { var nm = document.getElementById("newName"); pp.innerHTML = '<div style="width:100%;height:100%;background:' + grads[selectedGrad] + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:22px;">' + (nm && nm.value.trim() ? nm.value.trim().charAt(0).toUpperCase() : "?") + '</div>'; }
    }
    document.getElementById("newName").oninput = function () { if (!selectedPhoto) refreshPP(); };
    document.getElementById("photoInput").onchange = function (e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function (ev) { var img = new Image(); img.onload = function () { var c = document.createElement("canvas"); var sz = 120; var sc = Math.min(sz / img.width, sz / img.height); c.width = img.width * sc; c.height = img.height * sc; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); selectedPhoto = c.toDataURL("image/jpeg", .7); refreshPP(); }; img.src = ev.target.result; }; r.readAsDataURL(f); };
    document.getElementById("clearPhoto").onclick = function () { selectedPhoto = null; document.getElementById("photoInput").value = ""; refreshPP(); };
    document.getElementById("addBtn").onclick = async function () {
      var nm = document.getElementById("newName").value.trim(); var pr = parseFloat(document.getElementById("newPrice").value);
      if (!nm || !pr || pr <= 0) { document.getElementById("addErr").style.display = "block"; return; }
      var btn = document.getElementById("addBtn"); btn.textContent = "Saving..."; btn.style.pointerEvents = "none";
      addRow("products", { name: nm.charAt(0).toUpperCase() + nm.slice(1), price: Math.round(pr * 100) / 100, photo: selectedPhoto, grad: selectedGrad });
      await refreshData(); renderAdd();
    };
    var pl = document.getElementById("prodList");
    products.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "bigbtn editRow"; row.setAttribute("data-id", p.id);
      row.style.cssText = "display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:9px 11px;margin-bottom:8px;cursor:pointer;";
      row.innerHTML = '<div style="width:38px;height:38px;border-radius:10px;overflow:hidden;flex-shrink:0;">' + prodThumb(p, 15) + '</div><span style="flex:1;font-weight:700;font-size:14px;">' + p.name + '</span><span style="font-weight:800;color:var(--accent-t);font-size:15px;">' + money(Number(p.price)) + '</span><button class="delProd" data-id="' + p.id + '" style="width:26px;height:26px;border-radius:50%;border:none;background:rgba(239,68,68,.15);color:#f87171;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0;">×</button>';
      pl.appendChild(row);
    });
    Array.prototype.forEach.call(pl.querySelectorAll(".editRow"), function (r) {
      r.onclick = function (e) { if (e.target.classList.contains("delProd")) return; editProduct(r.getAttribute("data-id")); };
    });
    Array.prototype.forEach.call(pl.querySelectorAll(".delProd"), function (b) { b.setAttribute("aria-label", "Delete item"); b.onclick = function (e) { e.stopPropagation(); askDeleteItem(b.getAttribute("data-id")); }; });
  }

  function askDeleteItem(id) {
    var p = products.find(function (x) { return String(x.id) === String(id); }); if (!p) return;
    if (lsGet(K.sd, false)) return doDeleteItem(p);
    confirmDialog({
      title: "ARE YOU SURE YOU WANT TO DELETE THIS ITEM?", note: "“" + esc(p.name) + "” · " + money(Number(p.price)),
      checkbox: "DON’T ASK ME AGAIN", yes: "Delete item", danger: true,
      onYes: function (chk) { if (chk) lsSet(K.sd, true); doDeleteItem(p); }
    });
  }
  function doDeleteItem(p) {
    delRow("products", p.id); delete cart[p.id]; delete utangCart[p.id];
    refreshData().then(function () { renderAdd(); updateCoBar(); toast("✓ “" + p.name + "” was deleted", "ok"); });
  }

  function editProduct(id) {
    var p = products.find(function (x) { return String(x.id) === String(id) }); if (!p) return;
    var editPhoto = p.photo || null, editGrad = p.grad || 0;
    openModal(
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;font-size:20px;font-weight:800;">Edit Item</h3><button id="xCloseE" class="bigbtn" style="background:rgba(56,189,248,.14);border:none;color:var(--accent-t);width:34px;height:34px;border-radius:50%;font-size:17px;font-weight:800;cursor:pointer;">×</button></div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">' +
      '<div id="editPhotoPreview" style="width:68px;height:68px;border-radius:16px;overflow:hidden;flex-shrink:0;border:2px solid var(--accent);"></div>' +
      '<div style="flex:1;min-width:150px;"><label class="bigbtn" style="display:block;background:linear-gradient(135deg,var(--accent),var(--accent-d));color:#0b1120;padding:9px 14px;border-radius:12px;font-size:13px;font-weight:800;text-align:center;cursor:pointer;margin-bottom:6px;">Change Photo<input id="editPhotoInput" type="file" accept="image/*" style="display:none;"></label><button id="editClearPhoto" class="bigbtn" style="width:100%;padding:7px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;">Use default color</button></div></div>' +
      '<p style="margin:0 0 6px;font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Default color:</p><div id="editSwatches" style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px;"></div>' +
      '<p style="margin:0 0 6px;font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Item name:</p>' +
      '<input id="editName" type="text" value="' + p.name + '" style="width:100%;box-sizing:border-box;padding:13px;font-size:16px;border:2px solid var(--border);border-radius:12px;margin-bottom:12px;background:var(--card2);color:var(--text);">' +
      '<p style="margin:0 0 6px;font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.1em;">Price (₱):</p>' +
      '<input id="editPrice" type="number" inputmode="decimal" value="' + Number(p.price) + '" style="width:100%;box-sizing:border-box;padding:13px;font-size:16px;border:2px solid var(--border);border-radius:12px;margin-bottom:14px;background:var(--card2);color:var(--text);">' +
      '<p id="editErr" style="display:none;color:#f87171;font-size:13px;margin:0 0 10px;text-align:center;font-weight:700;">Enter a valid name and price</p>' +
      '<div style="display:flex;gap:10px;">' +
      '<button id="cancelEdit" class="bigbtn" style="flex:1;padding:14px;border-radius:14px;border:2px solid var(--border);background:var(--card2);color:var(--text);font-size:15px;font-weight:700;cursor:pointer;">Cancel</button>' +
      '<button id="saveEdit" class="bigbtn" style="flex:2;padding:14px;border-radius:14px;border:none;background:#10b981;color:#052e16;font-size:16px;font-weight:800;cursor:pointer;">Save Changes</button>' +
      '</div>'
    );
    function refreshEditPP() {
      var pp = document.getElementById("editPhotoPreview"); if (!pp) return;
      if (editPhoto) pp.innerHTML = '<img src="' + editPhoto + '" style="width:100%;height:100%;object-fit:cover;display:block;">';
      else pp.innerHTML = '<div style="width:100%;height:100%;background:' + grads[editGrad] + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:24px;">' + p.name.charAt(0).toUpperCase() + '</div>';
    }
    refreshEditPP();
    var esw = document.getElementById("editSwatches");
    grads.forEach(function (g, i) {
      var d = document.createElement("div"); d.className = "swatch";
      d.style.cssText = "width:30px;height:30px;border-radius:50%;background:" + g + ";border:3px solid " + (i === editGrad && !editPhoto ? "#fff" : "transparent");
      d.onclick = function () { editGrad = i; editPhoto = null; refreshEditPP(); Array.prototype.forEach.call(esw.children, function (x) { x.style.border = "3px solid transparent" }); d.style.border = "3px solid #fff"; };
      esw.appendChild(d);
    });
    document.getElementById("editPhotoInput").onchange = function (e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function (ev) { var img = new Image(); img.onload = function () { var c = document.createElement("canvas"); var sz = 120; var sc = Math.min(sz / img.width, sz / img.height); c.width = img.width * sc; c.height = img.height * sc; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); editPhoto = c.toDataURL("image/jpeg", .7); refreshEditPP(); Array.prototype.forEach.call(esw.children, function (x) { x.style.border = "3px solid transparent" }); }; img.src = ev.target.result; }; r.readAsDataURL(f); };
    document.getElementById("editClearPhoto").onclick = function () { editPhoto = null; document.getElementById("editPhotoInput").value = ""; refreshEditPP(); };
    document.getElementById("xCloseE").onclick = closeModal;
    document.getElementById("cancelEdit").onclick = closeModal;
    document.getElementById("saveEdit").onclick = async function () {
      var nm = document.getElementById("editName").value.trim();
      var pr = parseFloat(document.getElementById("editPrice").value);
      if (!nm || !pr || pr <= 0) { document.getElementById("editErr").style.display = "block"; return; }
      var btn = document.getElementById("saveEdit"); btn.textContent = "Saving..."; btn.style.pointerEvents = "none";
      updRow("products", p.id, { name: nm.charAt(0).toUpperCase() + nm.slice(1), price: Math.round(pr * 100) / 100, photo: editPhoto, grad: editGrad });
      await refreshData(); closeModal(); renderAdd();
    };
  }

  // ---------- HISTORY ----------
  function renderHistory() {
    var totalSales = transactions.reduce(function (s, t) { return s + Number(t.total); }, 0);
    view.innerHTML = '<div class="fadein"><h2 class="page-h">Sales history</h2><p class="note-bar">Sales are removed automatically after 24 hours. Utang records stay until they are paid.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">' +
      '<div style="background:linear-gradient(135deg,var(--accent),var(--accent-d));border-radius:16px;padding:16px;text-align:center;color:#0b1120;box-shadow:0 6px 18px rgba(56,189,248,.3);"><div style="font-size:22px;font-weight:800;">' + money(totalSales) + '</div><div style="font-size:11px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.08em;">Total Sales</div></div>' +
      '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;text-align:center;"><div style="font-size:22px;font-weight:800;">' + transactions.length + '</div><div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Transactions</div></div></div>' +
      '<div id="histList"></div></div>';
    var hl = document.getElementById("histList");
    if (!transactions.length) { hl.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:16px;">No sales in the last 24 hours. Complete a sale and it will show up here.</div>'; }
    transactions.forEach(function (t) {
      var items = t.items.map(function (i) { return i.qty + "× " + i.name; }).join(", ");
      var row = document.createElement("div");
      row.style.cssText = "background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:9px;";
      row.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;flex-wrap:wrap;gap:4px;"><span style="display:flex;align-items:center;gap:7px;font-weight:800;font-size:14px;"><span style="width:24px;height:24px;border-radius:50%;background:' + ucolor(t.user_name || t.user_email) + ';color:#0b1120;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;">' + avTxt((t.user_name || "S")) + '</span>' + (t.user_name || "Staff") + '</span><span style="font-weight:800;color:var(--accent-t);font-size:17px;">' + money(Number(t.total)) + '</span></div>' +
        '<div style="font-size:13px;line-height:1.5;margin-bottom:4px;color:var(--text2);">' + items + '</div>' +
        '<div style="font-size:11px;color:var(--muted);">' + (t.created_at ? new Date(t.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "") + ' · Cash ' + money(Number(t.cash)) + ' · Change ' + money(Number(t.change)) + '</div>';
      hl.appendChild(row);
    });
  }

  // ---------- CALC ----------
  var calcDisp = "0", calcPrev = null, calcOp = null, calcFresh = true;
  function renderCalc() {
    view.innerHTML = '<div class="fadein" style="max-width:420px;margin:0 auto;"><h2 style="margin:0 0 12px;font-size:21px;font-weight:800;">Calculator</h2>' +
      '<div id="calcScreen" style="background:var(--card);border:2px solid var(--accent);border-radius:18px;padding:20px 16px;font-size:36px;font-weight:800;text-align:right;margin-bottom:12px;min-height:54px;word-break:break-all;line-height:1.2;color:var(--accent-t);box-shadow:0 0 24px rgba(56,189,248,.15);">0</div>' +
      '<div id="calcPad" style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;"></div></div>';
    var pad = document.getElementById("calcPad");
    var keys = [["C", "#f87171"], ["⌫", "#fbbf24"], ["%", "var(--accent)"], ["÷", "var(--accent)"], ["7"], ["8"], ["9"], ["×", "var(--accent)"], ["4"], ["5"], ["6"], ["−", "var(--accent)"], ["1"], ["2"], ["3"], ["+", "var(--accent)"], ["0", "", "span2"], [".", ""], ["=", "#10b981"]];
    keys.forEach(function (k) {
      var b = document.createElement("button"); b.className = "numpad"; b.textContent = k[0];
      var span = k[2] === "span2" ? "grid-column:span 2;" : ""; var col = k[1] ? "color:" + k[1] + ";" : "color:var(--text);";
      b.style.cssText = "padding:16px;border-radius:13px;border:1px solid var(--border);background:var(--card);font-size:20px;font-weight:800;" + col + span;
      if (k[0] === "=") b.style.cssText += "background:#10b981;color:#052e16;border:none;";
      b.onclick = function () { buzz(k[0] === "=" ? 28 : 12); calcPress(k[0]); }; pad.appendChild(b);
    });
    updateCalc();
  }
  function updateCalc() { var el = document.getElementById("calcScreen"); if (el) el.textContent = calcDisp; }
  function calcPress(k) {
    if (k >= "0" && k <= "9") { if (calcFresh || calcDisp === "0") { calcDisp = k; calcFresh = false; } else calcDisp += k; }
    else if (k === ".") { if (calcFresh) { calcDisp = "0."; calcFresh = false; } else if (calcDisp.indexOf(".") < 0) calcDisp += "."; }
    else if (k === "C") { calcDisp = "0"; calcPrev = null; calcOp = null; calcFresh = true; }
    else if (k === "⌫") { calcDisp = calcDisp.length > 1 ? calcDisp.slice(0, -1) : "0"; }
    else if (k === "%") { calcDisp = String(parseFloat(calcDisp) / 100); }
    else if (k === "+" || k === "−" || k === "×" || k === "÷") { if (calcPrev !== null && !calcFresh) calcDisp = String(doCalc(calcPrev, parseFloat(calcDisp), calcOp)); calcPrev = parseFloat(calcDisp); calcOp = k; calcFresh = true; }
    else if (k === "=") { if (calcOp !== null && calcPrev !== null) { calcDisp = String(doCalc(calcPrev, parseFloat(calcDisp), calcOp)); calcPrev = null; calcOp = null; calcFresh = true; } }
    updateCalc();
  }
  function doCalc(a, b, op) { var r = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : b !== 0 ? a / b : 0; return Math.round(r * 100) / 100; }

  // ---------- modal ----------
  var leaving = false, exitOpen = false;
  function openModal(html, center) {
    modal.className = "modal" + (center ? " center" : "");
    modal.style.display = "flex";
    modal.innerHTML = '<div id="modalBg" style="position:absolute;inset:0;background:rgba(0,0,0,.7);"></div><div class="pop" role="dialog" aria-modal="true" style="position:relative;background:var(--card);border:1px solid var(--border);border-radius:24px 24px 0 0;padding:18px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;">' + html + '</div>';
    document.getElementById("modalBg").onclick = closeModal;
  }
  function closeModal() { modal.style.display = "none"; modal.innerHTML = ""; exitOpen = false; }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.style.display === "flex") closeModal(); });

  // ---------- leave-app confirmation ----------
  function onBU(e) { if (leaving) return; e.preventDefault(); e.returnValue = ""; return ""; }
  function askExit() {
    if (exitOpen) return;
    closeModal(); exitOpen = true;
    confirmDialog({
      title: "ARE YOU SURE YOU WANT TO LEAVE?", note: "Your items, utang and sales are saved on this device.", yes: "Leave", no: "Stay", danger: true,
      onYes: function () {
        leaving = true; window.removeEventListener("beforeunload", onBU);
        try { history.go(-2); } catch (x) { }
        setTimeout(function () { try { window.close(); } catch (x) { } }, 250);
        setTimeout(function () { leaving = false; window.addEventListener("beforeunload", onBU); toast("You can close this window now"); }, 900);
      }
    });
  }
  try { history.pushState({ orca: 1 }, ""); } catch (e) { }
  window.addEventListener("popstate", function () {
    if (leaving) return;
    try { history.pushState({ orca: 1 }, ""); } catch (e) { }
    if (modal.style.display === "flex") closeModal(); else askExit();
  });
  window.addEventListener("beforeunload", onBU);
  setInterval(function () { var n = transactions.length; purgeOld(); if (transactions.length !== n && currentView === "history" && modal.style.display !== "flex") renderHistory(); }, 60000);

  // ---------- boot ----------
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; });
  window.addEventListener("appinstalled", function () { deferredInstall = null; toast("ORCA POS installed"); });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { }); });
  }
  if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function () { }); }
  applyTheme(lsGet(K.th, "abyss"));
  var lastUser = lsGet(K.c, null);
  if (lastUser) startSession(lastUser); else showWelcome();
})();