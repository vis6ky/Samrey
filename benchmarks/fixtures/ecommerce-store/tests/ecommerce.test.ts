import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { EcommerceApp } from '../src/App.js';

describe('E-Commerce Storefront Benchmark Application', () => {
  it('filters product catalog, adds to cart, and calculates subtotal reactively', async () => {
    let store: any;
    const { container } = renderTest(() => {
      const app = EcommerceApp();
      store = app.store;
      return app.root;
    });

    // 1. Initial product list
    const cards = container.querySelectorAll('.product-card');
    assert.equal(cards.length, 3, 'Should render 3 products initially');
    assert.equal(container.querySelector('.cart-trigger span')?.textContent, '0');

    // 2. Add product to cart
    const addButtons = container.querySelectorAll('.product-card button');
    fireEvent(addButtons[0], 'click'); // Add Keyboard ($149.99)
    await flushReactivity();

    assert.equal(container.querySelector('.cart-trigger span')?.textContent, '1');

    // Add again to test quantity increment
    fireEvent(addButtons[0], 'click');
    await flushReactivity();
    assert.equal(container.querySelector('.cart-trigger span')?.textContent, '2');

    // 3. Open Cart Drawer
    const toggleBtn = container.querySelector('.cart-trigger button')!;
    fireEvent(toggleBtn, 'click');
    await flushReactivity();

    assert.ok(container.textContent?.includes('Shopping Cart'));
    assert.ok(container.textContent?.includes('299.98')); // 149.99 * 2

    // 4. Category Filter
    const hwFilterBtn = container.querySelectorAll('.category-filters button')[1];
    fireEvent(hwFilterBtn, 'click');
    await flushReactivity();

    const filteredCards = container.querySelectorAll('.product-card');
    assert.equal(filteredCards.length, 2, 'Should only show 2 hardware products');
  });
});
