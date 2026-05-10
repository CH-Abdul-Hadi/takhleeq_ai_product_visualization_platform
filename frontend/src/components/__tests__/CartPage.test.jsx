import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/authSlice';
import cartReducer from '../../store/cartSlice';
import CartPage from '../pages/CartPage';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';

vi.mock('../../services/orderService');
vi.mock('../../services/paymentService');
vi.mock('../../services/inventoryService', () => ({
  inventoryService: { checkInventory: vi.fn().mockResolvedValue({ available: true }) },
}));

const cartItem = { id: 1, name: 'T-Shirt', price: 29.99, quantity: 2 };

const makeStore = (authUser = null, cartItems = []) =>
  configureStore({
    reducer: { auth: authReducer, cart: cartReducer },
    preloadedState: {
      auth: {
        isAuthenticated: !!authUser,
        user: authUser,
        status: 'succeeded',
        error: null,
      },
      cart: {
        items: cartItems,
        totalItems: cartItems.reduce((s, i) => s + i.quantity, 0),
        totalPrice: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
        isOpen: false,
      },
    },
  });

const renderPage = (store) =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </Provider>
  );

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty cart state', () => {
    it('renders empty cart message', () => {
      const store = makeStore(null, []);
      renderPage(store);
      expect(screen.getByText('Your cart is empty')).toBeTruthy();
    });

    it('shows Start Shopping link', () => {
      const store = makeStore(null, []);
      renderPage(store);
      expect(screen.getByText('Start Shopping')).toBeTruthy();
    });
  });

  describe('cart with items', () => {
    it('renders cart items and order summary', () => {
      const store = makeStore({ username: 'test', email: 'test@test.com' }, [cartItem]);
      renderPage(store);
      expect(screen.getByText('Cart Items')).toBeTruthy();
    });

    it('shows the correct item count in header', () => {
      const store = makeStore({ username: 'test', email: 'test@test.com' }, [cartItem]);
      renderPage(store);
      expect(screen.getByText(/you have 1 item/i)).toBeTruthy();
    });
  });

  describe('checkout flow', () => {
    const user = { username: 'test', email: 'test@test.com', id: 42 };

    it('creates an order and payment on checkout', async () => {
      orderService.createOrder.mockResolvedValue({ order_id: 100 });
      paymentService.createPayment.mockResolvedValue({ payment_id: 200 });
      paymentService.getSinglePayment.mockResolvedValue({ status: 'Completed' });

      const store = makeStore(user, [cartItem]);
      renderPage(store);

      const checkoutBtn = screen.getByRole('button', { name: /proceed to checkout/i });
      fireEvent.click(checkoutBtn);

      await waitFor(() => {
        expect(orderService.createOrder).toHaveBeenCalledTimes(1);
        const callArg = orderService.createOrder.mock.calls[0][0];
        // Should NOT send order_id or user_id — server sets those
        expect(callArg.order_id).toBeUndefined();
        expect(callArg.user_id).toBeUndefined();
        expect(callArg.user_email).toBe('test@test.com');
        expect(callArg.product_id).toBe(1);
      });

      await waitFor(() => {
        expect(paymentService.createPayment).toHaveBeenCalledTimes(1);
        const payArg = paymentService.createPayment.mock.calls[0][0];
        // Should NOT send payment_id
        expect(payArg.payment_id).toBeUndefined();
        expect(payArg.order_id).toBe(100);
      });
    });

    it('does not checkout if user is not logged in', () => {
      const store = makeStore(null, [cartItem]); // no user
      renderPage(store);
      fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
      expect(orderService.createOrder).not.toHaveBeenCalled();
    });
  });
});
