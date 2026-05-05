// ============================================================
// data.js — Restaurant menu data (trilingual)
// ============================================================

const menuData = [
  // ── PIZZA ─────────────────────────────────────────────────
  {
    id: 1,
    cat: "pizza",
    price: 3200,
    featured: true,
    img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop",
    name: { kz: "Маргарита", ru: "Маргарита", en: "Margherita" },
    desc: {
      kz: "Үй стилінде пісірілген тесто, помидор соусы, моцарелла және базилик",
      ru: "Тесто домашнего стиля, томатный соус, моцарелла и базилик",
      en: "Homestyle dough, tomato sauce, mozzarella and basil",
    },
  },
  {
    id: 2,
    cat: "pizza",
    price: 3900,
    featured: false,
    img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop",
    name: { kz: "Пепперони", ru: "Пепперони", en: "Pepperoni" },
    desc: {
      kz: "Пепперони шұжығы, моцарелла, помидор соусы",
      ru: "Колбаса пепперони, моцарелла, томатный соус",
      en: "Pepperoni sausage, mozzarella, tomato sauce",
    },
  },
  {
    id: 3,
    cat: "pizza",
    price: 4200,
    featured: false,
    img: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600&auto=format&fit=crop",
    name: { kz: "Төрт ірімшік", ru: "Четыре сыра", en: "Four Cheese" },
    desc: {
      kz: "Моцарелла, горгонзола, пармезан және рикотта",
      ru: "Моцарелла, горгонзола, пармезан и рикотта",
      en: "Mozzarella, gorgonzola, parmesan and ricotta",
    },
  },

  // ── PASTA ─────────────────────────────────────────────────
  {
    id: 4,
    cat: "pasta",
    price: 2800,
    featured: true,
    img: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&auto=format&fit=crop",
    name: { kz: "Карбонара", ru: "Карбонара", en: "Carbonara" },
    desc: {
      kz: "Спагетти, бекон, жұмыртқа сарысы, пармезан",
      ru: "Спагетти, бекон, яичный желток, пармезан",
      en: "Spaghetti, bacon, egg yolk, parmesan",
    },
  },
  {
    id: 5,
    cat: "pasta",
    price: 2600,
    featured: false,
    img: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&auto=format&fit=crop",
    name: { kz: "Болоньезе", ru: "Болоньезе", en: "Bolognese" },
    desc: {
      kz: "Тагиателле, ет соусы, помидор, базилик",
      ru: "Тальятелле, мясной соус, помидор, базилик",
      en: "Tagliatelle, meat sauce, tomato, basil",
    },
  },
  {
    id: 6,
    cat: "pasta",
    price: 3100,
    featured: false,
    img: "https://images.unsplash.com/photo-1461009683693-342af2f2d6ce?w=600&auto=format&fit=crop",
    name: { kz: "Ризотто Арборио", ru: "Ризотто Арборио", en: "Risotto Arborio" },
    desc: {
      kz: "Арборио күріші, пармезан, ак шарап, сарымсақ",
      ru: "Рис арборио, пармезан, белое вино, чеснок",
      en: "Arborio rice, parmesan, white wine, garlic",
    },
  },

  // ── STEAK ─────────────────────────────────────────────────
  {
    id: 7,
    cat: "steak",
    price: 7500,
    featured: true,
    img: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop",
    name: { kz: "Рибай стейк", ru: "Рибай стейк", en: "Ribeye Steak" },
    desc: {
      kz: "300г, шөппен қоректенген сиыр еті, розмарин майы",
      ru: "300г, говядина травяного откорма, масло с розмарином",
      en: "300g grass-fed beef, rosemary butter",
    },
  },
  {
    id: 8,
    cat: "steak",
    price: 8900,
    featured: false,
    img: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&auto=format&fit=crop",
    name: { kz: "Тендерлойн", ru: "Тендерлойн", en: "Tenderloin" },
    desc: {
      kz: "250г, вырезка, трюфель соусы, картоп пюресі",
      ru: "250г, вырезка, соус трюфель, картофельное пюре",
      en: "250g, tenderloin, truffle sauce, mashed potato",
    },
  },
  {
    id: 9,
    cat: "steak",
    price: 6800,
    featured: false,
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop",
    name: { kz: "Стриплойн", ru: "Стриплойн", en: "Striploin" },
    desc: {
      kz: "280г, Нью-Йорк стейк, перец соусы, гриль көкөністер",
      ru: "280г, Нью-Йорк стейк, соус перец, гриль овощи",
      en: "280g, New York strip, pepper sauce, grilled vegetables",
    },
  },

  // ── SALAD ─────────────────────────────────────────────────
  {
    id: 10,
    cat: "salad",
    price: 1800,
    featured: true,
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop",
    name: { kz: "Цезарь", ru: "Цезарь", en: "Caesar" },
    desc: {
      kz: "Ромэн салаты, гренки, пармезан, цезарь тұздығы",
      ru: "Салат ромэн, гренки, пармезан, соус цезарь",
      en: "Romaine lettuce, croutons, parmesan, caesar dressing",
    },
  },
  {
    id: 11,
    cat: "salad",
    price: 2100,
    featured: false,
    img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop",
    name: { kz: "Грек салаты", ru: "Греческий салат", en: "Greek Salad" },
    desc: {
      kz: "Қияр, помидор, зәйтүн, фета ірімшігі, зәйтүн майы",
      ru: "Огурец, томат, маслины, сыр фета, оливковое масло",
      en: "Cucumber, tomato, olives, feta cheese, olive oil",
    },
  },

  // ── DESSERT ───────────────────────────────────────────────
  {
    id: 12,
    cat: "dessert",
    price: 1500,
    featured: true,
    img: "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600&auto=format&fit=crop",
    name: { kz: "Тирамису", ru: "Тирамису", en: "Tiramisu" },
    desc: {
      kz: "Маскарпоне, саусақ печенье, эспрессо, какао",
      ru: "Маскарпоне, савоярди, эспрессо, какао",
      en: "Mascarpone, ladyfingers, espresso, cocoa",
    },
  },
  {
    id: 13,
    cat: "dessert",
    price: 1300,
    featured: false,
    img: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop",
    name: { kz: "Шоколад фонданы", ru: "Шоколадный фондан", en: "Chocolate Fondant" },
    desc: {
      kz: "Іші сұйық шоколадты кекс, ваниль балмұздақ",
      ru: "Кекс с жидкой начинкой, ванильное мороженое",
      en: "Lava cake with liquid chocolate, vanilla ice cream",
    },
  },
  {
    id: 14,
    cat: "dessert",
    price: 1100,
    featured: false,
    img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop",
    name: { kz: "Панна котта", ru: "Панна котта", en: "Panna Cotta" },
    desc: {
      kz: "Кілегей, ваниль, жидек соусы",
      ru: "Сливки, ваниль, ягодный соус",
      en: "Cream, vanilla, berry sauce",
    },
  },

  // ── DRINKS ────────────────────────────────────────────────
  {
    id: 15,
    cat: "drink",
    price: 900,
    featured: false,
    img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&auto=format&fit=crop",
    name: { kz: "Свежесоктар", ru: "Свежевыжатые соки", en: "Fresh Juices" },
    desc: {
      kz: "Апельсин, жасыл алма, сәбіз немесе қызылша",
      ru: "Апельсин, зелёное яблоко, морковь или свёкла",
      en: "Orange, green apple, carrot or beetroot",
    },
  },
  {
    id: 16,
    cat: "drink",
    price: 1200,
    featured: false,
    img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop",
    name: { kz: "Коктейлдер", ru: "Коктейли", en: "Cocktails" },
    desc: {
      kz: "Mojito, Aperol Spritz, Pina Colada немесе Virgin Colada",
      ru: "Mojito, Aperol Spritz, Pina Colada или Virgin Colada",
      en: "Mojito, Aperol Spritz, Pina Colada or Virgin Colada",
    },
  },
  {
    id: 17,
    cat: "drink",
    price: 700,
    featured: false,
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop",
    name: { kz: "Эспрессо / Капучино", ru: "Эспрессо / Капучино", en: "Espresso / Cappuccino" },
    desc: {
      kz: "Сингл немесе дубль эспрессо, капучино, латте",
      ru: "Сингл или дубль эспрессо, капучино, латте",
      en: "Single or double espresso, cappuccino, latte",
    },
  },
];

// Expose globally
window.menuData = menuData;
