import { signal, computed } from '@samrey/reactivity';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export function createCartStore() {
  const products = signal<Product[]>([
    { id: 'p1', name: 'Ergonomic Mechanical Keyboard', category: 'Hardware', price: 149.99, description: 'Hot-swappable switches' },
    { id: 'p2', name: '4K Ultra-Wide Monitor', category: 'Hardware', price: 499.00, description: '144Hz IPS display' },
    { id: 'p3', name: 'Developer Desk Mat', category: 'Accessories', price: 29.50, description: 'Stitched edges with waterproof fabric' }
  ]);

  const selectedCategory = signal<'All' | 'Hardware' | 'Accessories'>('All');
  const cart = signal<CartItem[]>([]);
  const isCartOpen = signal(false);

  const filteredProducts = computed(() => {
    if (selectedCategory.value === 'All') return products.value;
    return products.value.filter(p => p.category === selectedCategory.value);
  });

  const cartCount = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const cartSubtotal = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  });

  return {
    products,
    selectedCategory,
    cart,
    isCartOpen,
    filteredProducts,
    cartCount,
    cartSubtotal,
    addToCart: (product: Product) => {
      const existing = cart.value.find(i => i.product.id === product.id);
      if (existing) {
        cart.update(items =>
          items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        );
      } else {
        cart.value = [...cart.value, { product, quantity: 1 }];
      }
    },
    removeFromCart: (productId: string) => {
      cart.update(items => items.filter(i => i.product.id !== productId));
    },
    clearCart: () => {
      cart.value = [];
    }
  };
}
