import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/authSlice';
import cartReducer from '../../store/cartSlice';
import CategoriesPage from '../pages/CategoriesPage';
import { productService } from '../../services/productService';
import { aiDesignService } from '../../services/aiDesignService';

vi.mock('../../services/productService');
vi.mock('../../services/aiDesignService');
vi.mock('../../services/inventoryService', () => ({
  inventoryService: { checkInventory: vi.fn().mockResolvedValue({ available: true }) },
}));

const mockProducts = [
  { product_id: 1, Product_name: 'T-Shirt', Product_details: 'A cool tee', price: 29.99, category: 'Cotton', product_image: null },
  { product_id: 2, Product_name: 'Hoodie', Product_details: 'Warm hoodie', price: 54.99, category: 'Winter', product_image: null },
];

const store = configureStore({
  reducer: { auth: authReducer, cart: cartReducer },
  preloadedState: {
    auth: { isAuthenticated: true, user: { username: 'test', email: 'test@test.com' }, status: 'succeeded', error: null },
    cart: { items: [], totalItems: 0, totalPrice: 0, isOpen: false },
  },
});

const renderPage = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
    </Provider>
  );

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiDesignService.getAllAICenterRecords.mockResolvedValue([]);
  });

  it('shows a loading spinner initially', () => {
    productService.getAllProducts.mockImplementation(() => new Promise(() => {})); // never resolves
    aiDesignService.getAllAICenterRecords.mockResolvedValue([]);
    renderPage();
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders products after successful fetch', async () => {
    productService.getAllProducts.mockResolvedValue(mockProducts);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('T-Shirt')).toBeTruthy();
      expect(screen.getByText('Hoodie')).toBeTruthy();
    });
  });

  it('renders "No products found" when fetch returns empty array', async () => {
    productService.getAllProducts.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No products found/i)).toBeTruthy();
    });
  });

  it('renders an error message when fetch fails', async () => {
    productService.getAllProducts.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Failed to load products/i)).toBeTruthy();
    });
  });

  it('does not render static category cards (backend-driven mode)', async () => {
    productService.getAllProducts.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText('Abstract Art')).toBeNull();
      expect(screen.queryByText('Nature & Landscape')).toBeNull();
      expect(screen.getByText('Featured Products')).toBeTruthy();
    });
  });

  it('renders approved AI designs as category products', async () => {
    productService.getAllProducts.mockResolvedValue(mockProducts);
    aiDesignService.getAllAICenterRecords.mockResolvedValue([
      {
        id: 11,
        user_idea: 'Neon floral custom tee',
        product_id: 1,
        final_product: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
        status: 'approved',
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('T-Shirt - AI Design')).toBeTruthy();
      expect(screen.getAllByText('AI Designs').length).toBeGreaterThanOrEqual(1);
    });
  });
});
