let products = [];
let cart = [];
let userBalance = parseFloat(localStorage.getItem('userBalance')) || 1000;


const reviews = [
  { name: "Nobin", comment: "Great product", rating: 5, date: "2025-10-15" },
  { name: "Jabir", comment: "Good quality.", rating: 4, date: "2025-10-20" },
  { name: "Rashid", comment: "Excellent!", rating: 5, date: "2025-10-25" },
  { name: "Nitul", comment: "Avarage", rating: 3, date: "2025-10-28" },
  { name: "Rakib", comment: "Not impressed.", rating: 2, date: "2025-11-01" }
];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userBalance').textContent = Math.round(userBalance);
  document.getElementById('cartCount').textContent = 0;

  // wire up inputs
  const search = document.getElementById('searchInput');
  const category = document.getElementById('categoryFilter');
  const sort = document.getElementById('sortSelect');

  if (search) search.addEventListener('input', filterProducts);
  if (category) category.addEventListener('change', filterProducts);
  if (sort) sort.addEventListener('change', filterProducts);

  document.getElementById('cartBtn').addEventListener('click', () => showCart(true));
  document.getElementById('closeCart').addEventListener('click', () => showCart(false));

  if (document.getElementById('applyCoupon'))
    document.getElementById('applyCoupon').addEventListener('click', applyCoupon);
  if (document.getElementById('addMoney'))
    document.getElementById('addMoney').addEventListener('click', addMoney);
  if (document.getElementById('checkout'))
    document.getElementById('checkout').addEventListener('click', checkout);

  fetchProducts();
  displayReviews();
});

function displayReviews() {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;
  if (!reviews || reviews.length === 0) { container.innerHTML = '<div class="col-span-full text-center">No reviews yet</div>'; return; }
  container.innerHTML = reviews.map(r => `
    <div class="bg-gray-900 text-green-200 p-4 rounded">
      <div class="flex justify-between items-start">
        <div>
          <div class="font-semibold">${r.name}</div>
          <div class="text-sm text-green-300">${r.date}</div>
        </div>
        <div class="text-right">
          <div class="font-bold">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
        </div>
      </div>
      <p class="mt-2 text-green-200">${r.comment}</p>
    </div>
  `).join('');
}

async function fetchProducts() {
  try {
    const res = await fetch('https://fakestoreapi.com/products');
    products = await res.json();
    // normalize price to integer BDT
    products = products.map(p => ({ id: p.id, title: p.title, price: Math.round(p.price * 100), image: p.image, category: p.category }));
    populateCategories();
    displayProducts(products);
  } catch (e) {
    const container = document.getElementById('productsContainer');
    if (container) container.innerHTML = '<div class="text-center col-span-full text-red-400">Failed to load products</div>';
  }
}

function populateCategories() {
  const sel = document.getElementById('categoryFilter');
  if (!sel) return;
  const cats = Array.from(new Set(products.map(p => p.category)));
  cats.forEach(c => {
    const opt = document.createElement('option'); opt.value = c; opt.textContent = c; sel.appendChild(opt);
  });
}

function displayProducts(list) {
  const container = document.getElementById('productsContainer');
  if (!container) return;
  container.innerHTML = '';
  if (!list || list.length === 0) { container.innerHTML = '<div class="text-center col-span-full">No products</div>'; return; }

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-gray-900 p-4 rounded';
    card.innerHTML = `
      <div class="flex items-start gap-4">
        <img src="${p.image}" alt="" class="w-16 h-16 object-contain">
        <div class="flex-1">
          <div class="font-semibold text-green-200">${p.title.substring(0,60)}</div>
          <div class="text-green-300">${p.price} BDT</div>
        </div>
        <button class="ml-2 bg-green-400 text-black px-3 py-1 rounded" data-id="${p.id}">Add</button>
      </div>
    `;
    container.appendChild(card);
  });

  // attach add buttons
  container.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(parseInt(btn.getAttribute('data-id'))));
  });
}

function filterProducts() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const cat = (document.getElementById('categoryFilter')?.value || 'all');
  const sort = document.getElementById('sortSelect')?.value || '';
  let res = products.filter(p => p.title.toLowerCase().includes(q));
  if (cat !== 'all') res = res.filter(p => p.category === cat);
  if (sort === 'low-high') res.sort((a,b) => a.price - b.price);
  if (sort === 'high-low') res.sort((a,b) => b.price - a.price);
  displayProducts(res);
}

function addToCart(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const it = cart.find(i => i.id === id);
  if (it) it.q++; else cart.push({ id: p.id, title: p.title, price: p.price, q: 1 });
  document.getElementById('cartCount').textContent = cart.reduce((s,i)=>s+i.q,0);
  showNotification('Added');
}

function showCart(open) {
  const modal = document.getElementById('cartModal'); if (!modal) return;
  modal.classList.toggle('hidden', !open);
  if (open) renderCart();
}

function renderCart() {
  const el = document.getElementById('cartItems'); if (!el) return;
  if (cart.length === 0) { el.innerHTML = '<div>Empty</div>'; updateTotals(0); return; }
  el.innerHTML = cart.map(i => `<div class="flex justify-between"><div>${i.title} x${i.q}</div><div>${i.price*i.q} BDT</div></div>`).join('');
  const subtotal = cart.reduce((s,i)=>s+i.price*i.q,0);
  updateTotals(subtotal);
}

function updateTotals(subtotal) {
  const delivery = subtotal>0?50:0; const shipping = subtotal>0?30:0; const discount = parseFloat(document.getElementById('discount')?.textContent) || 0;
  const total = subtotal + delivery + shipping - discount;
  if (document.getElementById('subtotal')) document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  if (document.getElementById('delivery')) document.getElementById('delivery').textContent = delivery;
  if (document.getElementById('shipping')) document.getElementById('shipping').textContent = shipping;
  if (document.getElementById('total')) document.getElementById('total').textContent = total.toFixed(2);
}

function applyCoupon() {
  const code = (document.getElementById('couponInput')?.value || '').trim().toUpperCase();
  const sub = parseFloat(document.getElementById('subtotal')?.textContent) || 0;
  if (code === 'NOOB10' && sub>0) {
    const d = sub*0.1; document.getElementById('discount').textContent = d.toFixed(2); updateTotals(sub); showNotification('Coupon -10%');
  } else showNotification('Bad coupon','error');
}

function addMoney() { userBalance += 1000; localStorage.setItem('userBalance', userBalance); document.getElementById('userBalance').textContent = Math.round(userBalance); showNotification('+1000'); }

function checkout() {
  const total = parseFloat(document.getElementById('total')?.textContent) || 0;
  if (cart.length === 0) { showNotification('Cart empty','warning'); return; }
  if (total > userBalance) { showNotification('Insufficient','error'); return; }
  userBalance -= total; localStorage.setItem('userBalance', userBalance); document.getElementById('userBalance').textContent = Math.round(userBalance);
  cart = []; document.getElementById('cartCount').textContent = 0; renderCart(); showCart(false); showNotification('Order placed');
}

function showNotification(msg, type='ok'){
  const n = document.createElement('div');
  n.textContent = msg;
  // base positioning + shadow
  const base = 'fixed top-4 right-4 px-3 py-1 rounded shadow z-50';
  let colorCls = '';
  switch ((type || '').toLowerCase()) {
    case 'error':
      colorCls = 'bg-red-600 text-white';
      break;
    case 'warning':
      colorCls = 'bg-yellow-400 text-black';
      break;
    case 'ok':
    default:
      colorCls = 'bg-blue-600 text-white';
      break;
  }
  n.className = `${base} ${colorCls}`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1500);
}