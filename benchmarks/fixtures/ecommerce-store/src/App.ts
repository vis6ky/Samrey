import { template, bindText, on, For, Show } from '@samrey/runtime';
import { createCartStore, Product } from './stores/CartStore.js';
import { ProductCard } from './components/ProductCard.js';

const _appTmpl = template(`
  <div class="storefront-app">
    <header>
      <h1>Samrey Developer Gear</h1>
      <div class="cart-trigger">
        <button ref="cartToggleBtn" aria-label="View Shopping Cart">Cart (<span ref="cartCount"></span>)</button>
      </div>
    </header>
    <nav class="category-filters">
      <button ref="btnAll">All</button>
      <button ref="btnHw">Hardware</button>
      <button ref="btnAcc">Accessories</button>
    </nav>
    <main class="products-grid" ref="productGrid"></main>
    <aside ref="cartDrawer" class="cart-drawer" role="dialog" aria-modal="true" aria-label="Cart Drawer"></aside>
  </div>
`);

const _drawerTmpl = template(`
  <div class="drawer-content">
    <h3>Shopping Cart</h3>
    <ul ref="cartItems" class="cart-items"></ul>
    <div class="cart-summary">
      <strong>Total: $<span ref="total"></span></strong>
      <button ref="checkoutBtn" class="btn-checkout">Checkout</button>
    </div>
  </div>
`);

const _cartItemTmpl = template('<li><span ref="name"></span> x<span ref="qty"></span> ($<span ref="price"></span>)<button ref="delBtn">Remove</button></li>');

export function EcommerceApp() {
  const store = createCartStore();
  const root = _appTmpl.clone();
  const { cartToggleBtn, cartCount, btnAll, btnHw, btnAcc, productGrid, cartDrawer } = root.refs;

  bindText(cartCount, () => store.cartCount.value.toString());

  on(btnAll, 'click', () => { store.selectedCategory.value = 'All'; });
  on(btnHw, 'click', () => { store.selectedCategory.value = 'Hardware'; });
  on(btnAcc, 'click', () => { store.selectedCategory.value = 'Accessories'; });
  on(cartToggleBtn, 'click', () => store.isCartOpen.update(v => !v));

  // Render product grid
  productGrid.appendChild(
    For({
      each: () => store.filteredProducts.value,
      key: (p) => p.id,
      children: (p) => ProductCard({ product: p, onAdd: (prod) => store.addToCart(prod) })
    })
  );

  // Render cart drawer with Show
  cartDrawer.appendChild(
    Show({
      when: () => store.isCartOpen.value,
      children: () => {
        const drawer = _drawerTmpl.clone();
        const { cartItems, total, checkoutBtn } = drawer.refs;

        bindText(total, () => store.cartSubtotal.value.toFixed(2));
        on(checkoutBtn, 'click', () => {
          store.clearCart();
          store.isCartOpen.value = false;
        });

        cartItems.appendChild(
          For({
            each: () => store.cart.value,
            key: (item) => item.product.id,
            children: (item) => {
              const row = _cartItemTmpl.clone();
              const { name, qty, price, delBtn } = row.refs;
              bindText(name, () => item.product.name);
              bindText(qty, () => item.quantity.toString());
              bindText(price, () => (item.product.price * item.quantity).toFixed(2));
              on(delBtn, 'click', () => store.removeFromCart(item.product.id));
              return row;
            }
          })
        );

        return drawer;
      },
      fallback: () => template('<div></div>')()
    })
  );

  return { root, store };
}
