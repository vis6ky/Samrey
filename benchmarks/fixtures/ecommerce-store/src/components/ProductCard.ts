import { template, bindText, on } from '@samrey/runtime';
import { Product } from '../stores/CartStore.js';

const _tmpl = template(`
  <div class="product-card" role="article">
    <h3 ref="name"></h3>
    <span class="category" ref="cat"></span>
    <p class="desc" ref="desc"></p>
    <div class="price-row">
      <span class="price">$<span ref="price"></span></span>
      <button ref="addBtn" aria-label="Add to cart">Add to Cart</button>
    </div>
  </div>
`);

export function ProductCard(props: { product: Product; onAdd: (p: Product) => void }) {
  const root = _tmpl.clone();
  const { name, cat, desc, price, addBtn } = root.refs;

  bindText(name, () => props.product.name);
  bindText(cat, () => props.product.category);
  bindText(desc, () => props.product.description);
  bindText(price, () => props.product.price.toFixed(2));

  on(addBtn, 'click', () => props.onAdd(props.product));

  return root;
}
