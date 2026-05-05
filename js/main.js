// ============================================================
// main.js — Core interactions, rendering, forms, search, voice
// ============================================================

/* ── Helpers ─────────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function formatPrice(n) {
  return n.toLocaleString("kk-KZ") + " ₸";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function safeCssUrl(value) {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url) && !/^\.?\//.test(url)) return "";
  return url.replace(/['"\\()]/g, encodeURIComponent);
}

function getMenuData() {
  return Array.isArray(window.menuData) ? window.menuData : [];
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

/* ── Theme (dark / light) ─────────────────────────────────── */
const THEME_STORAGE = "dastarkhan-theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE) === "light" ? "light" : "dark";
  } catch (e) {
    return "dark";
  }
}

function refreshThemeButton() {
  const btn = document.getElementById("themeToggle");
  if (!btn || typeof translations === "undefined") return;
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "kz";
  const tr = translations[lang];
  if (tr && tr.themeSwitchToLight) {
    btn.setAttribute(
      "aria-label",
      cur === "light" ? tr.themeSwitchToDark : tr.themeSwitchToLight
    );
  }
  btn.setAttribute("aria-pressed", cur === "light" ? "true" : "false");
}
window.refreshThemeButton = refreshThemeButton;

function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.style.colorScheme = t === "light" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_STORAGE, t);
  } catch (e) {}
  refreshThemeButton();
}

const themeToggleEl = document.getElementById("themeToggle");
if (themeToggleEl) {
  themeToggleEl.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "light" ? "dark" : "light");
  });
}

/* ── Modals (register / login / reservation) ─────────────── */
const MODAL_IDS = {
  register: "modalRegister",
  login: "modalLogin",
  reservation: "modalReservation",
  cart: "modalCart",
  profile: "modalProfile",
  chat: "modalChat",
  quiz: "modalQuiz",
};

const CART_STORAGE = "dastarkhan-cart";
const DISCOUNT_STORAGE = "dastarkhan-quiz-discount";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_STORAGE, JSON.stringify(items));
  } catch (e) {}
  updateCartBadge();
  if (typeof window.renderCartModal === "function") window.renderCartModal();
}

function getQuizDiscount() {
  try {
    const raw = localStorage.getItem(DISCOUNT_STORAGE);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || ![5, 10, 15].includes(Number(data.percent))) return null;
    return { percent: Number(data.percent), dice: Number(data.dice) || 0 };
  } catch (e) {
    return null;
  }
}

function saveQuizDiscount(discount) {
  try {
    if (discount) localStorage.setItem(DISCOUNT_STORAGE, JSON.stringify(discount));
    else localStorage.removeItem(DISCOUNT_STORAGE);
  } catch (e) {}
  if (typeof window.renderCartModal === "function") window.renderCartModal();
}

function cartSubtotal(cart) {
  return cart.reduce((sum, row) => sum + row.price * row.qty, 0);
}

function cartDiscountAmount(subtotal) {
  const discount = getQuizDiscount();
  return discount ? Math.floor(subtotal * discount.percent / 100) : 0;
}

function dishById(id) {
  return getMenuData().find((d) => d.id === id);
}

function updateCartBadge() {
  const badge = $("#cartBadge");
  if (!badge) return;
  const n = getCart().reduce((s, x) => s + x.qty, 0);
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n === 0);
}

function addToCartFromDish(item) {
  const lang = getCurrentLang();
  const cart = getCart();
  const row = cart.find((c) => c.id === item.id);
  if (row) row.qty += 1;
  else
    cart.push({
      id: item.id,
      name: item.name[lang],
      price: item.price,
      qty: 1,
    });
  saveCart(cart);
}

function orderStatusLabel(status) {
  const lang = getCurrentLang();
  const t = translations[lang];
  const key = "orderStatus_" + status;
  return t[key] !== undefined ? t[key] : status;
}

function paymentMethodLabel(method) {
  const lang = getCurrentLang();
  const t = translations[lang];
  const key = "payment_" + method;
  return t[key] !== undefined ? t[key] : method;
}

function getModalEl(name) {
  const id = MODAL_IDS[name];
  return id ? document.getElementById(id) : null;
}

function closeAllModals() {
  $$(".modal.is-open").forEach((m) => {
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
}

function openModal(name) {
  const modal = getModalEl(name);
  if (!modal) return;
  closeAllModals();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const navLinks = $("#navLinks");
  const burger = $("#burger");
  if (navLinks) navLinks.classList.remove("open");
  if (burger) burger.classList.remove("active");
  let firstField = null;
  if (modal.id === "modalRegister") firstField = $("#regName");
  else if (modal.id === "modalLogin") firstField = $("#loginEmail");
  else if (modal.id === "modalReservation") firstField = $("#resName");
  else if (modal.id === "modalProfile") firstField = $("#profileName");
  else if (modal.id === "modalChat") firstField = $("#chatInput");
  if (firstField) requestAnimationFrame(() => firstField.focus());

  if (name === "cart" && typeof window.renderCartModal === "function") window.renderCartModal();
  if (name === "profile" && window.DastarkhanAPI && DastarkhanAPI.isLoggedIn() && typeof window.loadProfileData === "function") {
    window.loadProfileData();
  }
  if (name === "reservation") {
    renderReservationMenu();
    prefillReservationProfile();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("modal-open")) {
    closeAllModals();
  }
});

/* ── Navbar scroll effect ─────────────────────────────────── */
window.addEventListener("scroll", () => {
  $("#navbar").classList.toggle("scrolled", window.scrollY > 60);
});

/* ── Mobile burger menu ───────────────────────────────────── */
$("#burger").addEventListener("click", () => {
  $("#navLinks").classList.toggle("open");
  $("#burger").classList.toggle("active");
});

// Close on link click
$$("#navLinks a").forEach((a) => {
  a.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
    $("#burger").classList.remove("active");
  });
});

/* ── Modals + smooth scroll (data-scroll) ─────────────────── */
document.addEventListener("click", (e) => {
  const openEl = e.target.closest("[data-open-modal]");
  if (openEl) {
    e.preventDefault();
    openModal(openEl.dataset.openModal);
    return;
  }
  const switchEl = e.target.closest("[data-switch-modal]");
  if (switchEl) {
    e.preventDefault();
    openModal(switchEl.dataset.switchModal);
    return;
  }
  if (e.target.closest("[data-close-modal]")) {
    e.preventDefault();
    closeAllModals();
    return;
  }
  if (e.target.closest(".forgot-link")) {
    e.preventDefault();
    return;
  }
  const el = e.target.closest("[data-scroll]");
  if (!el) return;
  e.preventDefault();
  const target = document.getElementById(el.dataset.scroll);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ── Language switcher ────────────────────────────────────── */
const langSwitcher = $("#langSwitcher");
const langTrigger = $("#langTrigger");

if (langSwitcher && langTrigger) {
  langTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !langSwitcher.classList.contains("open");
    langSwitcher.classList.toggle("open", open);
    langTrigger.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (e) => {
    if (!langSwitcher.contains(e.target)) {
      langSwitcher.classList.remove("open");
      langTrigger.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      langSwitcher.classList.remove("open");
      langTrigger.setAttribute("aria-expanded", "false");
    }
  });
}

$$(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyTranslations(btn.dataset.lang);
    if (langSwitcher && langTrigger) {
      langSwitcher.classList.remove("open");
      langTrigger.setAttribute("aria-expanded", "false");
    }
  });
});

/* ── Menu rendering ───────────────────────────────────────── */
/* ── Discount quiz game ───────────────────────────────────── */
const quizQuestions = [
  {
    q: { kz: "DASTARKHAN мейрамханасының мекенжайы қайда?", ru: "Где находится ресторан DASTARKHAN?", en: "Where is DASTARKHAN located?" },
    options: { kz: ["Абай даңғылы, 150", "Сейфуллин көшесі, 10", "Достық даңғылы, 1"], ru: ["проспект Абая, 150", "улица Сейфуллина, 10", "проспект Достык, 1"], en: ["150 Abay Ave", "10 Seifullin St", "1 Dostyk Ave"] },
    answer: 0,
  },
  {
    q: { kz: "Қай бөлімде пепперони бар?", ru: "В каком разделе находится пепперони?", en: "Which section has pepperoni?" },
    options: { kz: ["Пицца", "Десерт", "Сусын"], ru: ["Пицца", "Десерт", "Напитки"], en: ["Pizza", "Dessert", "Drinks"] },
    answer: 0,
  },
  {
    q: { kz: "Мейрамхана күн сайын қай уақытта ашылады?", ru: "Во сколько ресторан открывается каждый день?", en: "What time does the restaurant open every day?" },
    options: { kz: ["10:00", "12:00", "18:00"], ru: ["10:00", "12:00", "18:00"], en: ["10:00", "12:00", "18:00"] },
    answer: 0,
  },
  {
    q: { kz: "Тирамису қай бөлімге жатады?", ru: "К какому разделу относится тирамису?", en: "Which section is tiramisu in?" },
    options: { kz: ["Десерт", "Стейк", "Салат"], ru: ["Десерт", "Стейк", "Салат"], en: ["Dessert", "Steak", "Salad"] },
    answer: 0,
  },
  {
    q: { kz: "Үстелді брондау үшін сайтта қай батырманы басасыз?", ru: "Какую кнопку нужно нажать для бронирования стола?", en: "Which button do you press to reserve a table?" },
    options: { kz: ["Үстел брондау", "Мәзірді жүктеу", "Іздеу"], ru: ["Забронировать стол", "Скачать меню", "Поиск"], en: ["Reserve a table", "Download menu", "Search"] },
    answer: 0,
  },
  {
    q: { kz: "Дұрыс жауап берсеңіз жеңілдік қайда қолданылады?", ru: "Где применяется скидка после правильного ответа?", en: "Where is the discount applied after a correct answer?" },
    options: { kz: ["Себетте", "Профильде ғана", "Галереяда"], ru: ["В корзине", "Только в профиле", "В галерее"], en: ["In the cart", "Only in profile", "In the gallery"] },
    answer: 0,
  },
];

let activeQuizQuestion = null;
let activeQuizPrize = 0;
let activeQuizDice = 0;
let quizRound = {
  active: false,
  questions: [],
  index: 0,
  correct: 0,
  answered: false,
};
const QUIZ_ROUND_SIZE = 3;

function quizPrizeFromDice(dice) {
  if (dice >= 6) return 15;
  if (dice >= 4) return 10;
  return 5;
}

function setQuizRollDisabled(disabled) {
  [$("#quizRollBtn"), $("#quizRollAction")].forEach((btn) => {
    if (btn) btn.disabled = disabled;
  });
}

function quizProgressText(current, total) {
  const lang = getCurrentLang();
  const t = translations[lang];
  return (t.quizProgress || "{current}/{total}")
    .replace("{current}", current)
    .replace("{total}", total);
}

function quizRoundQuestions(seed) {
  const start = Math.max(0, seed - 1);
  return Array.from({ length: QUIZ_ROUND_SIZE }, (_, i) => quizQuestions[(start + i) % quizQuestions.length]);
}

function finishQuizRound() {
  const lang = getCurrentLang();
  const t = translations[lang];
  const resultEl = $("#quizResult");
  quizRound.active = false;
  setQuizRollDisabled(false);
  if (quizRound.correct === quizRound.questions.length) {
    const current = getQuizDiscount();
    const percent = current ? Math.max(current.percent, activeQuizPrize) : activeQuizPrize;
    saveQuizDiscount({ percent, dice: activeQuizDice, created_at: Date.now() });
    if (resultEl) resultEl.textContent = (t.quizRoundWin || t.quizWin || "").replace("{percent}", percent);
  } else if (resultEl) {
    resultEl.textContent = t.quizLose || "Wrong answer. Roll again.";
  }
}

function renderQuizQuestion(question, prize, dice) {
  const lang = getCurrentLang();
  const t = translations[lang];
  const card = $("#quizQuestionCard");
  const prizeEl = $("#quizPrizeText");
  const progressEl = $("#quizProgress");
  const questionEl = $("#quizQuestionText");
  const optionsEl = $("#quizOptions");
  const resultEl = $("#quizResult");
  const nextBtn = $("#quizNextBtn");
  if (!card || !prizeEl || !questionEl || !optionsEl || !resultEl) return;
  activeQuizQuestion = question;
  activeQuizPrize = prize;
  activeQuizDice = dice;
  quizRound.answered = false;
  prizeEl.textContent = `-${prize}%`;
  if (progressEl) progressEl.textContent = quizProgressText(quizRound.index + 1, quizRound.questions.length);
  questionEl.textContent = question.q[lang] || question.q.ru;
  optionsEl.innerHTML = (question.options[lang] || question.options.ru)
    .map((option, idx) => `<button type="button" class="quiz-option" data-quiz-answer="${idx}">${escapeHtml(option)}</button>`)
    .join("");
  resultEl.textContent = "";
  if (nextBtn) nextBtn.classList.add("hidden");
  card.classList.remove("hidden");
  optionsEl.querySelectorAll("[data-quiz-answer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (quizRound.answered) return;
      quizRound.answered = true;
      const picked = Number(btn.dataset.quizAnswer);
      const ok = picked === activeQuizQuestion.answer;
      optionsEl.querySelectorAll(".quiz-option").forEach((optionBtn) => {
        optionBtn.disabled = true;
      });
      btn.classList.add(ok ? "is-correct" : "is-wrong");
      if (ok) {
        quizRound.correct += 1;
        resultEl.textContent = t.quizCorrect || "Correct!";
      } else {
        resultEl.textContent = t.quizWrong || "Wrong answer.";
      }
      if (nextBtn) {
        const last = quizRound.index >= quizRound.questions.length - 1;
        nextBtn.textContent = last ? (t.quizFinish || t.quizNext || "Finish") : (t.quizNext || "Next question");
        nextBtn.classList.remove("hidden");
      }
    });
  });
}

function rollQuizDice() {
  const diceEl = $("#quizDiceFace");
  const card = $("#quizQuestionCard");
  const resultEl = $("#quizResult");
  if (!diceEl || quizRound.active) return;
  const dice = Math.floor(Math.random() * 6) + 1;
  const prize = quizPrizeFromDice(dice);
  quizRound = {
    active: true,
    questions: quizRoundQuestions(dice),
    index: 0,
    correct: 0,
    answered: false,
  };
  activeQuizPrize = prize;
  activeQuizDice = dice;
  setQuizRollDisabled(true);
  if (card) card.classList.add("hidden");
  if (resultEl) resultEl.textContent = "";
  diceEl.parentElement?.classList.add("rolling");
  let ticks = 0;
  const spin = setInterval(() => {
    ticks += 1;
    diceEl.textContent = String(Math.floor(Math.random() * 6) + 1);
    if (ticks >= 10) {
      clearInterval(spin);
      diceEl.textContent = String(dice);
      diceEl.parentElement?.classList.remove("rolling");
      renderQuizQuestion(quizRound.questions[quizRound.index], prize, dice);
    }
  }, 70);
}

const quizRollBtn = $("#quizRollBtn");
const quizRollAction = $("#quizRollAction");
const quizNextBtn = $("#quizNextBtn");
if (quizRollBtn) quizRollBtn.addEventListener("click", rollQuizDice);
if (quizRollAction) quizRollAction.addEventListener("click", rollQuizDice);
if (quizNextBtn) {
  quizNextBtn.addEventListener("click", () => {
    if (!quizRound.active || !quizRound.answered) return;
    quizRound.index += 1;
    if (quizRound.index >= quizRound.questions.length) {
      quizNextBtn.classList.add("hidden");
      finishQuizRound();
      return;
    }
    renderQuizQuestion(quizRound.questions[quizRound.index], activeQuizPrize, activeQuizDice);
  });
}

let activeCategory = "all";
let favoriteIds = new Set();

async function loadMenuData() {
  if (!window.DastarkhanAPI || typeof DastarkhanAPI.menuList !== "function") return;
  try {
    const res = await DastarkhanAPI.menuList();
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      window.menuData = data;
    }
  } catch (e) {
    // Keep static data.js as a fallback when Django is not running.
  }
}

function buildCard(item) {
  const lang = getCurrentLang();
  const t = translations[lang];
  const name = item.name && item.name[lang] ? item.name[lang] : "";
  const desc = item.desc && item.desc[lang] ? item.desc[lang] : "";
  const catKey = "cat" + item.cat.charAt(0).toUpperCase() + item.cat.slice(1);
  return `
    <div class="dish-card" data-id="${Number(item.id)}" data-cat="${escapeAttr(item.cat)}">
      <div class="dish-img" style="background-image:url('${safeCssUrl(item.img)}')">
        <span class="dish-cat-tag">${escapeHtml(t[catKey] || item.cat)}</span>
        <button type="button" class="fav-btn${favoriteIds.has(Number(item.id)) ? " active" : ""}" data-fav-id="${Number(item.id)}" aria-label="Favorite">
          <i class="fa-${favoriteIds.has(Number(item.id)) ? "solid" : "regular"} fa-heart"></i>
        </button>
      </div>
      <div class="dish-body">
        <h3 class="dish-name">${escapeHtml(name)}</h3>
        <p class="dish-desc">${escapeHtml(desc)}</p>
        <div class="dish-footer">
          <span class="dish-price">${formatPrice(item.price)}</span>
          <button class="btn btn-sm btn-gold add-btn" data-id="${Number(item.id)}">${escapeHtml(t.addToCart || "Себетке")}</button>
        </div>
      </div>
    </div>`;
}

function renderMenu() {
  const grid = $("#menuGrid");
  if (!grid) return;
  const q = searchQuery.trim();
  const items = getMenuData();
  let filtered = q ? searchResultsFor(q) : items;
  if (activeCategory !== "all") filtered = filtered.filter((i) => i.cat === activeCategory);
  grid.innerHTML = filtered.map(buildCard).join("");
  grid.querySelectorAll(".dish-card").forEach((c, i) => {
    c.style.animationDelay = `${i * 0.05}s`;
    c.classList.add("fade-in");
  });
  attachAddBtns();
  attachFavoriteBtns();
}
window.renderMenu = renderMenu;

function renderFeatured() {
  const grid = $("#featuredGrid");
  if (!grid) return;
  const featured = getMenuData().filter((i) => i.featured);
  grid.innerHTML = featured.map(buildCard).join("");
  grid.querySelectorAll(".dish-card").forEach((c, i) => {
    c.style.animationDelay = `${i * 0.05}s`;
    c.classList.add("fade-in");
  });
  grid.querySelectorAll(".dish-card").forEach((card) => revealOnIntersect(card));
  attachAddBtns();
  attachFavoriteBtns();
}
window.renderFeatured = renderFeatured;

function attachAddBtns() {
  $$(".add-btn").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  $$(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const item = dishById(id);
      const lang = getCurrentLang();
      const t = translations[lang];
      if (!item) return;
      addToCartFromDish(item);
      showToast(t.toastSuccess || "✓");
    });
  });
}

function attachFavoriteBtns() {
  $$(".fav-btn").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
  });
  $$(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.favId);
      const lang = getCurrentLang();
      const t = translations[lang];
      if (!window.DastarkhanAPI || !DastarkhanAPI.isLoggedIn()) {
        showToast(t.loginRequired || "Login required");
        openModal("login");
        return;
      }
      const active = favoriteIds.has(id);
      const res = active
        ? await DastarkhanAPI.favoriteRemove(id)
        : await DastarkhanAPI.favoriteAdd(id);
      if (!res.ok) {
        showToast(t.apiError || "Error");
        return;
      }
      if (active) favoriteIds.delete(id);
      else favoriteIds.add(id);
      renderMenu();
      renderFeatured();
      updateSearchResults();
      if (document.getElementById("modalProfile")?.classList.contains("is-open")) {
        loadFavoritesData();
      }
    });
  });
}

async function loadFavoritesState() {
  favoriteIds = new Set();
  if (!window.DastarkhanAPI || !DastarkhanAPI.isLoggedIn()) return;
  try {
    const res = await DastarkhanAPI.favoritesList();
    if (!res.ok) return;
    const data = await res.json();
    favoriteIds = new Set((Array.isArray(data) ? data : []).map((item) => Number(item.id)));
  } catch (e) {}
}

/* ── Menu tabs ────────────────────────────────────────────── */
$$("#menuTabs .tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$("#menuTabs .tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.cat;
    renderMenu();
  });
});

/* ── Search ───────────────────────────────────────────────── */
let searchQuery = "";

const categorySearchWords = {
  pizza: "pizza pitsa пицца пица пицалар пицца бәліш",
  pasta: "pasta spaghetti tagliatelle risotto макарон паста спагетти ризотто кеспе лапша",
  steak: "steak beef meat стейк мясо говядина ет сиыр еті қуырылған ет",
  salad: "salad salads салат салаты көкөніс көкініс жеңіл тағам",
  dessert: "dessert cake sweet десерт сладкое торт пирожное тәтті тәттілер бәліш",
  drink: "drink drinks juice tea coffee напиток напитки сок чай кофе сусын сусындар шай шырын",
};

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ә]/g, "а")
    .replace(/[ғ]/g, "г")
    .replace(/[қ]/g, "к")
    .replace(/[ң]/g, "н")
    .replace(/[ө]/g, "о")
    .replace(/[ұү]/g, "у")
    .replace(/[і]/g, "и")
    .replace(/[һ]/g, "х")
    .replace(/[ё]/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTokens(value) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function itemSearchText(item) {
  const parts = [item.cat, categorySearchWords[item.cat] || ""];
  ["kz", "ru", "en"].forEach((lang) => {
    if (item.name) parts.push(item.name[lang]);
    if (item.desc) parts.push(item.desc[lang]);
  });
  return normalizeSearchText(parts.join(" "));
}

function editDistanceLimited(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + cost
      );
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

function looseTokenMatch(token, word) {
  if (!token || !word) return false;
  if (word.includes(token)) return true;
  if (token.length >= 4 && word.length >= 4 && token.includes(word)) return true;
  const minLen = Math.min(token.length, word.length);
  if (minLen < 4) return false;
  const limit = minLen >= 7 ? 2 : 1;
  return editDistanceLimited(token, word, limit) <= limit;
}

function itemMatchesSearch(item, query) {
  const tokens = searchTokens(query);
  if (!tokens.length) return false;
  const haystack = itemSearchText(item);
  const words = haystack.split(" ");
  return tokens.every((token) =>
    (token.length < 3 ? words.includes(token) : haystack.includes(token)) ||
    words.some((word) => looseTokenMatch(token, word))
  );
}

function searchResultsFor(query) {
  return getMenuData().filter((item) => itemMatchesSearch(item, query));
}

function scoreSearchQuery(query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return 0;
  const results = searchResultsFor(normalized);
  return results.length * 100 - normalized.length;
}

function updateSearchResults() {
  const lang = getCurrentLang();
  const t = translations[lang];
  const q = searchQuery.trim();
  const container = $("#searchResults");
  if (!container) return;

  if (!q) {
    container.innerHTML = "";
    renderMenu();
    return;
  }

  const results = searchResultsFor(q);

  if (results.length === 0) {
    container.innerHTML = `<p class="no-results">${escapeHtml(t.noResults)}</p>`;
  } else {
    container.innerHTML = "";
  }
  renderMenu();
}
window.updateSearchResults = updateSearchResults;

const searchInputEl = $("#searchInput");
if (searchInputEl) {
  searchInputEl.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    updateSearchResults();
  });
}

/* ── Voice search ─────────────────────────────────────────── */
(function initVoice() {
  const micBtn = $("#micBtn");
  const micStatus = $("#micStatus");
  const searchInput = $("#searchInput");

  if (!micBtn) return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.style.display = "none";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;
  let isListening = false;

  function getLang(code) {
    return code === "en" ? "en-US" : "ru-RU";
  }

  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.lang = getLang(getCurrentLang());
      recognition.start();
    }
  });

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    const t = translations[getCurrentLang()];
    micStatus.textContent = t.micListening || "Тыңдауда...";
  };

  function speechCandidates(e) {
    const firstPass = [];
    const alternatives = [];
    Array.from(e.results).forEach((result) => {
      if (result[0] && result[0].transcript) firstPass.push(result[0].transcript);
      Array.from(result).forEach((alt) => {
        if (alt && alt.transcript) alternatives.push(alt.transcript);
      });
    });
    const joinedFirst = firstPass.join(" ").trim();
    const candidates = [joinedFirst, ...alternatives]
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set(candidates));
  }

  function bestSpeechQuery(e) {
    const candidates = speechCandidates(e);
    if (!candidates.length) return "";
    return candidates.reduce((best, candidate) =>
      scoreSearchQuery(candidate) > scoreSearchQuery(best) ? candidate : best
    );
  }

  recognition.onresult = (e) => {
    const transcript = bestSpeechQuery(e);
    searchInput.value = transcript;
    searchQuery = transcript;
    updateSearchResults();
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    micStatus.textContent = "";
  };

  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    const t = translations[getCurrentLang()];
    micStatus.textContent = t.micError || "";
    setTimeout(() => {
      micStatus.textContent = "";
    }, 4000);
  };
})();

/* ── Reservation form ─────────────────────────────────────── */
let reservationItems = [];

function reservationItemPayload() {
  return reservationItems.map((row) => ({
    dish_id: row.id,
    quantity: row.qty,
  }));
}

function renderReservationMenu() {
  const select = $("#reservationDishSelect");
  if (!select) return;
  const lang = getCurrentLang();
  const items = getMenuData();
  select.innerHTML = items
    .map((item) => {
      const name = item.name && item.name[lang] ? item.name[lang] : item.name.ru || "";
      return `<option value="${item.id}">${escapeHtml(name)} - ${formatPrice(item.price)}</option>`;
    })
    .join("");
  renderReservationFoodList();
}

function renderReservationFoodList() {
  const list = $("#reservationFoodList");
  const empty = $("#reservationFoodEmpty");
  const totalEl = $("#reservationFoodTotal");
  if (!list || !empty || !totalEl) return;
  const lang = getCurrentLang();
  let total = 0;

  if (!reservationItems.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    totalEl.textContent = formatPrice(0);
    return;
  }

  empty.classList.add("hidden");
  list.innerHTML = reservationItems
    .map((row, idx) => {
      const name = row.name && row.name[lang] ? row.name[lang] : row.name.ru || "";
      total += row.price * row.qty;
      return `
        <div class="reservation-food-row">
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${formatPrice(row.price)} x ${row.qty}</span>
          </div>
          <button type="button" class="reservation-food-remove" data-res-food-remove="${idx}" aria-label="Remove">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>`;
    })
    .join("");
  totalEl.textContent = formatPrice(total);

  list.querySelectorAll("[data-res-food-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.resFoodRemove);
      reservationItems.splice(idx, 1);
      renderReservationFoodList();
    });
  });
}

function addReservationDish() {
  const select = $("#reservationDishSelect");
  const qtyInput = $("#reservationDishQty");
  if (!select || !qtyInput) return;
  const dishId = Number(select.value);
  const qty = Math.max(1, Math.min(20, Number(qtyInput.value) || 1));
  const dish = getMenuData().find((item) => Number(item.id) === dishId);
  if (!dish) return;
  const existing = reservationItems.find((row) => Number(row.id) === dishId);
  if (existing) {
    existing.qty = Math.min(20, existing.qty + qty);
  } else {
    reservationItems.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      qty,
    });
  }
  qtyInput.value = "1";
  renderReservationFoodList();
}

async function prefillReservationProfile() {
  if (!window.DastarkhanAPI || !DastarkhanAPI.isLoggedIn()) return;
  const nameEl = $("#resName");
  const phoneEl = $("#resPhone");
  if (!nameEl || !phoneEl) return;
  try {
    const res = await DastarkhanAPI.profileGet();
    if (!res.ok) return;
    const data = await res.json();
    if (!nameEl.value && data.full_name) nameEl.value = data.full_name;
    if (!phoneEl.value && data.phone) phoneEl.value = data.phone;
  } catch (e) {}
}

window.renderReservationMenu = renderReservationMenu;

const reservationDishAdd = $("#reservationDishAdd");
if (reservationDishAdd) reservationDishAdd.addEventListener("click", addReservationDish);

const reservationForm = $("#reservationForm");
if (reservationForm) {
  reservationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lang = getCurrentLang();
    const t = translations[lang];
    const success = $("#reserveSuccess");
    if (!window.DastarkhanAPI) return;
    const res = await DastarkhanAPI.reservationCreate({
      full_name: ($("#resName") && $("#resName").value.trim()) || "",
      phone: ($("#resPhone") && $("#resPhone").value.trim()) || "",
      date: ($("#resDate") && $("#resDate").value) || "",
      time: ($("#resTime") && $("#resTime").value) || "",
      guests: ($("#resGuests") && $("#resGuests").value) || "2",
      notes: ($("#resNotes") && $("#resNotes").value.trim()) || "",
      items: reservationItemPayload(),
    });
    if (!res.ok) {
      let msg = t.apiError;
      try {
        const data = await res.json();
        if (data && data.detail) msg = data.detail;
      } catch (x) {}
      showToast(msg);
      return;
    }
    success.classList.remove("hidden");
    showToast(t.reserveSuccess || t.toastSuccess || "✓");
    setTimeout(() => success.classList.add("hidden"), 4000);
    e.target.reset();
    reservationItems = [];
    renderReservationFoodList();
    closeAllModals();
  });
}

/* ── Password logic ───────────────────────────────────────── */
(function initPassword() {
  const passInput = $("#regPassword");
  const confirmInput = $("#regConfirm");
  const strengthBar = $("#strengthBar");
  const strengthLabel = $("#strengthLabel");
  const confirmMsg = $("#confirmMsg");
  const generateBtn = $("#generatePassBtn");
  const togglePass = $("#toggleRegPass");
  const toggleConfirm = $("#toggleConfirmPass");
  const toggleLogin = $("#toggleLoginPass");

  const rules = {
    "rule-len": (p) => p.length >= 8,
    "rule-upper": (p) => /[A-Z]/.test(p),
    "rule-lower": (p) => /[a-z]/.test(p),
    "rule-num": (p) => /[0-9]/.test(p),
    "rule-spec": (p) => /[!@#$%^&*]/.test(p),
  };

  function checkPassword(pw) {
    const lang = getCurrentLang();
    const t = translations[lang];
    let score = 0;

    Object.entries(rules).forEach(([id, fn]) => {
      const li = document.getElementById(id);
      if (!li) return;
      const pass = fn(pw);
      li.classList.toggle("pass", pass);
      const icon = li.querySelector("i");
      icon.className = pass
        ? "fa-solid fa-circle-check"
        : "fa-solid fa-circle-xmark";
      if (pass) score++;
    });

    strengthBar.className = "strength-bar";
    strengthBar.style.removeProperty("width");
    if (pw.length === 0) {
      strengthLabel.textContent = "";
      strengthLabel.className = "strength-label";
    } else if (score <= 2) {
      strengthBar.classList.add("weak");
      strengthLabel.textContent = t.strengthWeak || "Weak";
      strengthLabel.className = "strength-label weak";
    } else if (score <= 4) {
      strengthBar.classList.add("medium");
      strengthLabel.textContent = t.strengthMedium || "Medium";
      strengthLabel.className = "strength-label medium";
    } else {
      strengthBar.classList.add("strong");
      strengthLabel.textContent = t.strengthStrong || "Strong";
      strengthLabel.className = "strength-label strong";
    }
  }

  passInput.addEventListener("input", () => {
    checkPassword(passInput.value);
    checkConfirm();
  });

  function checkConfirm() {
    if (!confirmInput.value) {
      confirmMsg.classList.add("hidden");
      return;
    }
    const lang = getCurrentLang();
    const t = translations[lang];
    const match = passInput.value === confirmInput.value;
    confirmMsg.classList.remove("hidden");
    confirmMsg.textContent = match ? t.passwordsMatch : t.passwordsMismatch;
    confirmMsg.className = "confirm-msg " + (match ? "match" : "mismatch");
  }

  confirmInput.addEventListener("input", checkConfirm);

  // Generate password
  generateBtn.addEventListener("click", () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const ensure = [
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "abcdefghijklmnopqrstuvwxyz",
      "0123456789",
      "!@#$%^&*",
    ];
    let pw = ensure.map((s) => s[Math.floor(Math.random() * s.length)]).join("");
    for (let i = pw.length; i < 12; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    const arr = pw.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    pw = arr.join("");
    passInput.value = pw;
    passInput.type = "text";
    setTimeout(() => (passInput.type = "password"), 2000);
    checkPassword(pw);
  });

  // Toggle visibility helpers
  function makeToggle(toggleBtn, input) {
    if (!toggleBtn || !input) return;
    toggleBtn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggleBtn.querySelector("i").className = show
        ? "fa-regular fa-eye-slash"
        : "fa-regular fa-eye";
    });
  }

  makeToggle(togglePass, passInput);
  makeToggle(toggleConfirm, confirmInput);
  makeToggle(toggleLogin, $("#loginPassword"));
})();

/* ── Register form submit ─────────────────────────────────── */
$("#registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const lang = getCurrentLang();
  const t = translations[lang];
  const email = ($("#regEmail") && $("#regEmail").value.trim().toLowerCase()) || "";
  const password = $("#regPassword") ? $("#regPassword").value : "";
  const confirm = $("#regConfirm") ? $("#regConfirm").value : "";
  const full_name = ($("#regName") && $("#regName").value.trim()) || "";

  if (password !== confirm) {
    showToast(t.passwordsMismatch || "✗");
    return;
  }
  if (!window.DastarkhanAPI) {
    showToast(t.apiError);
    return;
  }

  const res = await DastarkhanAPI.register({
    email,
    password,
    full_name,
  });
  if (!res.ok) {
    let msg = t.apiError;
    try {
      const err = await res.json();
      if (typeof err === "object") {
        const first = Object.values(err).flat()[0];
        if (typeof first === "string") msg = first;
      }
    } catch (x) {}
    showToast(msg);
    return;
  }

  showToast(t.registerOk || t.toastSuccess);
  e.target.reset();
  closeAllModals();
  const strengthEl = $("#strengthBar");
  if (strengthEl) {
    strengthEl.className = "strength-bar";
    strengthEl.style.removeProperty("width");
  }
  $("#strengthLabel").textContent = "";
  $("#strengthLabel").className = "strength-label";
  document.querySelectorAll(".pw-rules li").forEach((li) => {
    li.classList.remove("pass");
    const ic = li.querySelector("i");
    if (ic) ic.className = "fa-solid fa-circle-xmark";
  });
  openModal("login");
});

/* ── Login form submit ────────────────────────────────────── */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const lang = getCurrentLang();
  const t = translations[lang];
  const email = ($("#loginEmail") && $("#loginEmail").value.trim().toLowerCase()) || "";
  const password = $("#loginPassword") ? $("#loginPassword").value : "";
  if (!window.DastarkhanAPI) {
    showToast(t.apiError);
    return;
  }
  const res = await DastarkhanAPI.login(email, password);
  if (!res.ok) {
    showToast(t.loginFail || t.apiError);
    return;
  }
  showToast(t.toastSuccess || "✓");
  e.target.reset();
  closeAllModals();
  refreshAuthUI();
});

/* ── Auth UI + cart modal ───────────────────────────────── */
function refreshAuthUI() {
  const guest = $("#navGuestWrap");
  const user = $("#navUserWrap");
  if (!guest || !user || !window.DastarkhanAPI) return;
  const logged = DastarkhanAPI.isLoggedIn();
  guest.classList.toggle("hidden", logged);
  user.classList.toggle("hidden", !logged);
}

window.refreshAuthUI = refreshAuthUI;

function renderCartModal() {
  const linesEl = $("#cartLines");
  const emptyEl = $("#cartEmptyMsg");
  const totalEl = $("#cartTotalVal");
  const discountRow = $("#cartDiscountRow");
  const discountVal = $("#cartDiscountVal");
  if (!linesEl || !emptyEl || !totalEl) return;
  const lang = getCurrentLang();
  const t = translations[lang];
  const cart = getCart();
  if (cart.length === 0) {
    linesEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    totalEl.textContent = formatPrice(0);
    if (discountRow) discountRow.classList.add("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  let sum = cartSubtotal(cart);
  linesEl.innerHTML = cart
    .map((row, idx) => {
      return `
      <div class="cart-line" data-cart-idx="${idx}">
        <span class="cart-line-name">${escapeHtml(row.name)}</span>
        <span class="cart-line-price">${formatPrice(row.price * row.qty)}</span>
        <div class="cart-line-meta">
          <div class="cart-qty">
            <button type="button" data-cart-dec="${idx}" aria-label="-">−</button>
            <span>${row.qty}</span>
            <button type="button" data-cart-inc="${idx}" aria-label="+">+</button>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-cart-remove="${idx}">${escapeHtml(t.removeLine)}</button>
        </div>
      </div>`;
    })
    .join("");
  const discount = getQuizDiscount();
  const discountAmount = cartDiscountAmount(sum);
  if (discountRow && discountVal && discountAmount > 0 && discount) {
    discountRow.classList.remove("hidden");
    discountRow.querySelector("span").textContent = `${t.cartDiscount || "Discount"} -${discount.percent}%`;
    discountVal.textContent = "-" + formatPrice(discountAmount);
  } else if (discountRow) {
    discountRow.classList.add("hidden");
  }
  totalEl.textContent = formatPrice(Math.max(0, sum - discountAmount));

  linesEl.querySelectorAll("[data-cart-inc]").forEach((b) => {
    b.addEventListener("click", () => {
      const i = Number(b.dataset.cartInc);
      const c = getCart();
      if (c[i]) {
        c[i].qty += 1;
        saveCart(c);
        renderCartModal();
      }
    });
  });
  linesEl.querySelectorAll("[data-cart-dec]").forEach((b) => {
    b.addEventListener("click", () => {
      const i = Number(b.dataset.cartDec);
      const c = getCart();
      if (c[i]) {
        c[i].qty -= 1;
        if (c[i].qty <= 0) c.splice(i, 1);
        saveCart(c);
        renderCartModal();
      }
    });
  });
  linesEl.querySelectorAll("[data-cart-remove]").forEach((b) => {
    b.addEventListener("click", () => {
      const i = Number(b.dataset.cartRemove);
      const c = getCart();
      c.splice(i, 1);
      saveCart(c);
      renderCartModal();
    });
  });
}

window.renderCartModal = renderCartModal;

const cartClearBtn = $("#cartClearBtn");
if (cartClearBtn) {
  cartClearBtn.addEventListener("click", () => {
    saveCart([]);
    renderCartModal();
  });
}

const cartCheckoutBtn = $("#cartCheckoutBtn");
if (cartCheckoutBtn) {
  cartCheckoutBtn.addEventListener("click", async () => {
  const lang = getCurrentLang();
  const t = translations[lang];
  if (!window.DastarkhanAPI || !DastarkhanAPI.isLoggedIn()) {
    showToast(t.loginRequired);
    closeAllModals();
    openModal("login");
    return;
  }
  const cart = getCart();
  if (!cart.length) {
    showToast(t.cartEmpty);
    return;
  }
  const notes = ($("#cartNotes") && $("#cartNotes").value.trim()) || "";
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "cash";
  const items = cart.map((c) => ({ dish_id: c.id, quantity: c.qty }));
  const discount = getQuizDiscount();
  const res = await DastarkhanAPI.orderCreate({
    items,
    notes,
    payment_method: paymentMethod,
    discount_percent: discount ? discount.percent : 0,
  });
  if (!res.ok) {
    showToast(t.checkoutFail);
    return;
  }
  showToast(t.orderPlaced);
  saveCart([]);
  saveQuizDiscount(null);
  renderCartModal();
  closeAllModals();
  });
}

function logoutUser() {
  if (window.DastarkhanAPI) DastarkhanAPI.clearTokens();
  favoriteIds = new Set();
  refreshAuthUI();
  renderMenu();
  renderFeatured();
  closeAllModals();
  const lang = getCurrentLang();
  showToast(translations[lang].navLogout + " ✓");
}

const profileLogoutBtn = $("#profileLogoutBtn");
if (profileLogoutBtn) {
  profileLogoutBtn.addEventListener("click", logoutUser);
}

async function loadFavoritesData() {
  const wrap = $("#profileFavorites");
  const empty = $("#profileFavoritesEmpty");
  if (!wrap || !window.DastarkhanAPI || !DastarkhanAPI.isLoggedIn()) return;
  const lang = getCurrentLang();
  const res = await DastarkhanAPI.favoritesList();
  if (!res.ok) return;
  const items = await res.json();
  favoriteIds = new Set((Array.isArray(items) ? items : []).map((item) => Number(item.id)));
  renderMenu();
  renderFeatured();
  updateSearchResults();

  if (!items.length) {
    wrap.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  wrap.innerHTML = items
    .map((item) => {
      const name = item.name && item.name[lang] ? item.name[lang] : item.name.ru || "";
      return `<div class="favorite-row">
        <div class="favorite-thumb" style="background-image:url('${safeCssUrl(item.img)}')"></div>
        <div class="favorite-info">
          <strong>${escapeHtml(name)}</strong>
          <span>${formatPrice(Number(item.price))}</span>
        </div>
        <button type="button" class="favorite-remove" data-fav-remove="${Number(item.id)}" aria-label="Remove favorite">
          <i class="fa-solid fa-heart"></i>
        </button>
      </div>`;
    })
    .join("");
  wrap.querySelectorAll("[data-fav-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.favRemove);
      const res = await DastarkhanAPI.favoriteRemove(id);
      if (!res.ok) return;
      favoriteIds.delete(id);
      await loadFavoritesData();
    });
  });
}

function defaultReviews() {
  const lang = getCurrentLang();
  const t = translations[lang];
  return [
    { full_name: "Айгерім Бекова", rating: 5, text: t.test1Text || "", role: t.test1Role || "" },
    { full_name: "Нурлан Сейтов", rating: 5, text: t.test2Text || "", role: t.test2Role || "" },
    { full_name: "Сауле Жанова", rating: 5, text: t.test3Text || "", role: t.test3Role || "" },
  ];
}

function renderReviewCard(review, idx) {
  const name = review.full_name || "Guest";
  const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
  const role = review.role || new Date(review.created_at || Date.now()).toLocaleDateString(
    getCurrentLang() === "kz" ? "kk-KZ" : getCurrentLang() === "ru" ? "ru-RU" : "en-US"
  );
  const colors = ["#c9a96e", "#7c9e8a", "#c0866a", "#8c7ac0", "#6a9ec0"];
  return `<div class="test-card${idx === 1 ? " test-card--featured" : ""}">
    <div class="test-stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
    <p class="test-text">${escapeHtml(review.text)}</p>
    <div class="test-author">
      <div class="test-avatar" style="background:${colors[idx % colors.length]}">${escapeHtml(name.trim().charAt(0).toUpperCase() || "D")}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(role)}</span>
      </div>
    </div>
  </div>`;
}

async function loadReviewsData() {
  const grid = $("#testimonialsGrid");
  if (!grid) return;
  let reviews = [];
  if (window.DastarkhanAPI && typeof DastarkhanAPI.reviewsList === "function") {
    try {
      const res = await DastarkhanAPI.reviewsList();
      if (res.ok) reviews = await res.json();
    } catch (e) {}
  }
  const items = Array.isArray(reviews) && reviews.length ? reviews : defaultReviews();
  grid.innerHTML = items.map(renderReviewCard).join("");
  grid.querySelectorAll(".test-card").forEach((card) => revealOnIntersect(card));
}

window.loadReviewsData = loadReviewsData;

const reviewForm = $("#reviewForm");
if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lang = getCurrentLang();
    const t = translations[lang];
    if (!window.DastarkhanAPI || !DastarkhanAPI.isLoggedIn()) {
      showToast(t.reviewLoginRequired || t.loginRequired);
      openModal("login");
      return;
    }
    const rating = Number($("#reviewRating")?.value || 5);
    const text = ($("#reviewText")?.value || "").trim();
    const res = await DastarkhanAPI.reviewCreate({ rating, text });
    if (!res.ok) {
      let msg = t.apiError;
      try {
        const data = await res.json();
        if (data && data.detail) msg = data.detail;
      } catch (x) {}
      showToast(msg);
      return;
    }
    $("#reviewText").value = "";
    showToast(t.reviewSaved || "Review saved");
    await loadReviewsData();
  });
}

async function loadProfileData() {
  const lang = getCurrentLang();
  const t = translations[lang];
  if (!window.DastarkhanAPI) return;
  const res = await DastarkhanAPI.profileGet();
  if (!res.ok) {
    showToast(t.apiError);
    return;
  }
  const p = await res.json();
  const nameEl = $("#profileName");
  const phoneEl = $("#profilePhone");
  const emailEl = $("#profileEmailDisplay");
  const avatarEl = $("#profileAvatar");
  if (nameEl) nameEl.value = p.full_name || "";
  if (phoneEl) phoneEl.value = p.phone || "";
  if (emailEl) emailEl.textContent = p.email || "";
  if (avatarEl) avatarEl.textContent = (p.full_name || p.email || "D").trim().charAt(0).toUpperCase();
  await loadFavoritesData();

  const ordersEl = $("#profileOrders");
  const emptyOrders = $("#profileOrdersEmpty");
  const ores = await DastarkhanAPI.ordersList();
  if (!ores.ok || !ordersEl) return;
  const orders = await ores.json();
  if (!orders.length) {
    ordersEl.innerHTML = "";
    if (emptyOrders) emptyOrders.classList.remove("hidden");
    return;
  }
  if (emptyOrders) emptyOrders.classList.add("hidden");
  const loc = lang === "kz" ? "kk-KZ" : lang === "ru" ? "ru-RU" : "en-US";
  ordersEl.innerHTML = orders
    .map((o) => {
      const when = new Date(o.created_at).toLocaleString(loc);
      const lines = (o.items || [])
        .map((it) => `${escapeHtml(it.name)} × ${Number(it.quantity)} — ${formatPrice(Number(it.unit_price) * Number(it.quantity))}`)
        .join("<br/>");
      return `<div class="order-card">
        <div class="order-card-head">
          <strong>${escapeHtml(t.orderNum)}${Number(o.id)}</strong>
          <span class="order-card-status">${escapeHtml(orderStatusLabel(o.status))}</span>
        </div>
        <div class="muted" style="font-size:0.85rem;margin-bottom:8px">${escapeHtml(when)}</div>
        <div class="muted" style="font-size:0.85rem;margin-bottom:8px">${escapeHtml(t.paymentTitle)}: ${escapeHtml(paymentMethodLabel(o.payment_method || "cash"))}</div>
        <div class="order-card-items">${lines}</div>
        <div style="margin-top:8px;font-weight:600">${escapeHtml(t.orderTotal)} ${formatPrice(Number(o.total_amount))}</div>
      </div>`;
    })
    .join("");
}

window.loadProfileData = loadProfileData;

const profileForm = $("#profileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lang = getCurrentLang();
    const t = translations[lang];
    if (!window.DastarkhanAPI) return;
    const res = await DastarkhanAPI.profilePatch({
      full_name: ($("#profileName") && $("#profileName").value.trim()) || "",
      phone: ($("#profilePhone") && $("#profilePhone").value.trim()) || "",
    });
    if (!res.ok) {
      showToast(t.apiError);
      return;
    }
    showToast(t.profileSaved);
  });
}

function appendChatBubble(text, who) {
  const box = $("#chatMessages");
  if (!box) return;
  const div = document.createElement("div");
  div.className = "chat-bubble chat-bubble--" + (who === "user" ? "user" : "bot");
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage() {
  const input = $("#chatInput");
  const lang = getCurrentLang();
  const t = translations[lang];
  if (!input || !window.DastarkhanAPI) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  appendChatBubble(msg, "user");
  const thinking = t.chatThinking || "...";
  appendChatBubble(thinking, "bot");
  const botEl = $("#chatMessages").lastElementChild;
  if (botEl) botEl.classList.add("chat-bubble--typing");
  const res = await DastarkhanAPI.chatSend(msg, lang);
  let reply = t.apiError;
  try {
    const data = await res.json();
    if (data && data.reply) reply = data.reply;
  } catch (x) {}
  if (botEl) {
    botEl.classList.remove("chat-bubble--typing");
    botEl.textContent = reply;
  }
}

const chatSendBtn = $("#chatSendBtn");
if (chatSendBtn) chatSendBtn.addEventListener("click", sendChatMessage);
const chatInput = $("#chatInput");
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

/* ── Intersection Observer – fade-in on scroll ────────────── */
const scrollRevealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        scrollRevealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

/** Observe one node; if already in view, show immediately (fixes re-render after language change). */
function revealOnIntersect(el) {
  scrollRevealObserver.observe(el);
  const pending = scrollRevealObserver.takeRecords();
  pending.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      scrollRevealObserver.unobserve(entry.target);
    }
  });
}

function observeAll() {
  $$(
    ".section-header, .special-card, .test-card, .gallery-item, .about-inner, .dl-card, .stat, .featured .dish-card"
  ).forEach((el) => revealOnIntersect(el));
}

/* ── Init ─────────────────────────────────────────────────── */
(async function init() {
  applyTheme(getStoredTheme());
  applyTranslations("kz");
  await loadMenuData();
  await loadFavoritesState();
  updateCartBadge();
  refreshAuthUI();
  renderFeatured();
  renderMenu();
  renderReservationMenu();
  await loadReviewsData();
  observeAll();
})();
