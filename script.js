/* ====== RÉGLAGES À MODIFIER ====== */
const WHATSAPP = "212600000000";   // votre numéro WhatsApp, format international sans le +
const ADMIN_PIN = "1234";          // code pour activer le mode gestion (à changer !)
const CURRENCY = "MAD";
/* ================================= */

const KEYS = { products: "sou9i_products", cart: "sou9i_cart" };

const DEFAULTS = [
  { id: 1, name: "Théière marocaine", price: 180, category: "Maison", emoji: "🫖", desc: "Inox et laiton, 1 litre." },
  { id: 2, name: "Babouches en cuir", price: 120, category: "Mode", emoji: "👞", desc: "Cuir véritable, fait main à Fès." },
  { id: 3, name: "Huile d'argan", price: 95, category: "Beauté", emoji: "🧴", desc: "100 % pure, flacon de 100 ml." },
  { id: 4, name: "Tapis berbère", price: 650, category: "Maison", emoji: "🧶", desc: "Laine tissée, 120 × 80 cm." },
  { id: 5, name: "Savon noir beldi", price: 35, category: "Beauté", emoji: "🧼", desc: "Pour le hammam, pot de 200 g." },
  { id: 6, name: "Sac à dos antivol", price: 249, category: "Mode", emoji: "🎒", desc: "Fermetures cachées, port USB." }
];

const $ = (s) => document.querySelector(s);
const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch { toast("Stockage plein : utilisez une photo plus légère."); }
};
const money = (n) => `${n.toLocaleString("fr-FR")} ${CURRENCY}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let products = load(KEYS.products, DEFAULTS);
let cart = load(KEYS.cart, {});          // { productId: quantité }
let filter = "Tout";
let query = "";
let admin = false;

/* ---------- Produits ---------- */
function renderFilters() {
  const cats = ["Tout", ...new Set(products.map((p) => p.category))];
  if (!cats.includes(filter)) filter = "Tout";
  $("#filters").innerHTML = cats
    .map((c) => `<button class="chip" type="button" aria-pressed="${c === filter}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join("");
  $("#cats").innerHTML = cats.slice(1).map((c) => `<option value="${esc(c)}">`).join("");
}

function renderGrid() {
  const q = query.trim().toLowerCase();
  const list = products.filter(
    (p) => (filter === "Tout" || p.category === filter) && (!q || (p.name + " " + p.desc).toLowerCase().includes(q))
  );
  $("#grid").innerHTML = list.length
    ? list.map((p) => `
      <article class="card">
        <div class="thumb">${p.image ? `<img src="${p.image}" alt="${esc(p.name)}" loading="lazy">` : esc(p.emoji || "🛍️")}</div>
        ${admin ? `<button class="del" type="button" data-del="${p.id}">Supprimer</button>` : ""}
        <div class="info">
          <span class="cat">${esc(p.category)}</span>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.desc || "")}</p>
          <div class="buy"><span class="price">${money(p.price)}</span>
            <button type="button" data-add="${p.id}">Ajouter</button></div>
        </div>
      </article>`).join("")
    : `<p class="empty">${products.length ? "Aucun produit ne correspond à votre recherche." : "La boutique est vide. Activez le mode gestion pour ajouter un produit."}</p>`;
}

function renderAll() { renderFilters(); renderGrid(); renderCart(); }

/* ---------- Panier ---------- */
function renderCart() {
  const rows = Object.entries(cart)
    .map(([id, qty]) => ({ p: products.find((x) => x.id == id), qty }))
    .filter((r) => r.p);
  const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
  const count = rows.reduce((s, r) => s + r.qty, 0);
  $("#cartCount").textContent = count;
  $("#cartTotal").textContent = money(total);
  $("#cartItems").innerHTML = rows.length
    ? rows.map(({ p, qty }) => `
      <div class="line">
        <b>${esc(p.name)}</b><b>${money(p.price * qty)}</b>
        <div class="qty">
          <button type="button" data-dec="${p.id}" aria-label="Moins">−</button>${qty}
          <button type="button" data-inc="${p.id}" aria-label="Plus">+</button>
        </div>
        <button class="rm" type="button" data-rm="${p.id}">Retirer</button>
      </div>`).join("")
    : `<p class="empty">Votre panier est vide.</p>`;
  $("#checkout button").disabled = !rows.length;
}

function setQty(id, qty) {
  if (qty <= 0) delete cart[id]; else cart[id] = qty;
  save(KEYS.cart, cart);
  renderCart();
}

function openCart(open) {
  $("#cart").classList.toggle("open", open);
  $("#cart").setAttribute("aria-hidden", !open);
  $("#overlay").hidden = !open;
}

/* ---------- Gestion ---------- */
function setAdmin(on) {
  admin = on;
  $("#adminBar").hidden = !on;
  $("#adminBtn").hidden = on;
  renderGrid();
}

function resizeImage(file, max = 500) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

/* ---------- Événements ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.cat) { filter = d.cat; renderFilters(); renderGrid(); }
  if (d.add) { setQty(d.add, (cart[d.add] || 0) + 1); toast("Ajouté au panier"); }
  if (d.inc) setQty(d.inc, cart[d.inc] + 1);
  if (d.dec) setQty(d.dec, cart[d.dec] - 1);
  if (d.rm) setQty(d.rm, 0);
  if (d.del) {
    const p = products.find((x) => x.id == d.del);
    if (p && confirm(`Supprimer « ${p.name} » de la boutique ?`)) {
      products = products.filter((x) => x.id != d.del);
      delete cart[d.del];
      save(KEYS.products, products); save(KEYS.cart, cart);
      renderAll(); toast("Produit supprimé");
    }
  }
});

$("#search").addEventListener("input", (e) => { query = e.target.value; renderGrid(); });
$("#cartBtn").addEventListener("click", () => openCart(true));
$("#closeCart").addEventListener("click", () => openCart(false));
$("#overlay").addEventListener("click", () => openCart(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") openCart(false); });

$("#adminBtn").addEventListener("click", () => {
  const pin = prompt("Code de gestion :");
  if (pin === null) return;
  pin === ADMIN_PIN ? setAdmin(true) : toast("Code incorrect");
});
$("#exitAdmin").addEventListener("click", () => setAdmin(false));
$("#addBtn").addEventListener("click", () => { $("#addForm").reset(); $("#addDialog").showModal(); });
$("#cancelAdd").addEventListener("click", () => $("#addDialog").close());
$("#resetBtn").addEventListener("click", () => {
  if (confirm("Remplacer tous les produits par ceux d'origine ?")) {
    products = structuredClone(DEFAULTS); cart = {};
    save(KEYS.products, products); save(KEYS.cart, cart); renderAll();
  }
});

$("#addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const product = {
    id: Date.now(),
    name: f.get("name").trim(),
    price: Math.round(Number(f.get("price"))),
    category: f.get("category").trim(),
    desc: f.get("desc").trim(),
    emoji: "🛍️"
  };
  const file = f.get("image");
  if (file && file.size) {
    try { product.image = await resizeImage(file); } catch { toast("Image illisible, produit ajouté sans photo."); }
  }
  products.unshift(product);
  save(KEYS.products, products);
  $("#addDialog").close();
  renderAll(); toast("Produit ajouté");
});

$("#checkout").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const rows = Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id == id), qty })).filter((r) => r.p);
  if (!rows.length) return;
  const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
  const msg = [
    "Nouvelle commande SOU9I.ma",
    ...rows.map((r) => `• ${r.qty} × ${r.p.name} : ${money(r.p.price * r.qty)}`),
    `Total : ${money(total)} (paiement à la livraison)`,
    "",
    `Nom : ${f.name}`, `Téléphone : ${f.phone}`, `Ville : ${f.city}`, `Adresse : ${f.address}`
  ].join("\n");
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  cart = {}; save(KEYS.cart, cart);
  e.target.reset(); renderCart(); openCart(false);
  toast("Commande envoyée sur WhatsApp");
});

$("#year").textContent = new Date().getFullYear();
renderAll();
