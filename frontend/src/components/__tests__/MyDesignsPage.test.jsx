import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/authSlice';
import cartReducer from '../../store/cartSlice';
import MyDesignsPage from '../pages/MyDesignsPage';
import { aiDesignService } from '../../services/aiDesignService';
import { productService } from '../../services/productService';

vi.mock('../../services/aiDesignService');
vi.mock('../../services/productService');

const store = configureStore({
  reducer: { auth: authReducer, cart: cartReducer },
  preloadedState: {
    auth: { isAuthenticated: true, user: { id: 10, username: 'test' }, status: 'succeeded', error: null },
  },
});

const mockDesigns = [
  {
    id: 1,
    user_idea: 'Floral t-shirt design',
    design_from_gemini: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
    final_product: null,
    product_id: 1,
    status: 'pending',
  },
  {
    id: 2,
    user_idea: 'Approved minimalist design',
    design_from_gemini: null,
    final_product: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=',
    product_id: 2,
    status: 'approved',
  },
];

const renderPage = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <MyDesignsPage />
      </MemoryRouter>
    </Provider>
  );

describe('MyDesignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productService.getAllProducts.mockResolvedValue([]);
  });

  it('shows loading spinner initially', () => {
    aiDesignService.getAICenterRecordsByUser.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders design cards after successful fetch', async () => {
    aiDesignService.getAICenterRecordsByUser.mockResolvedValue(mockDesigns);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Floral t-shirt design')).toBeTruthy();
      expect(screen.getByText('Approved minimalist design')).toBeTruthy();
    });
  });

  it('uses design_from_gemini as image when final_product is null', async () => {
    aiDesignService.getAICenterRecordsByUser.mockResolvedValue([mockDesigns[0]]);
    renderPage();
    await waitFor(() => {
      const img = screen.getByAltText('Floral t-shirt design');
      expect(img.getAttribute('src')).toContain('data:image/png;base64,');
    });
  });

  it('uses final_product as image when available', async () => {
    aiDesignService.getAICenterRecordsByUser.mockResolvedValue([mockDesigns[1]]);
    renderPage();
    await waitFor(() => {
      const img = screen.getByAltText('Approved minimalist design');
      expect(img.getAttribute('src')).toContain('data:image/png;base64,');
    });
  });

  it('shows empty state when no designs', async () => {
    aiDesignService.getAICenterRecordsByUser.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No designs found in your Lab.')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    aiDesignService.getAICenterRecordsByUser.mockRejectedValue(new Error('Server Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Failed to load your designs/i)).toBeTruthy();
    });
  });

  it('handles non-array response gracefully', async () => {
    aiDesignService.getAICenterRecordsByUser.mockResolvedValue(null);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No designs found in your Lab.')).toBeTruthy();
    });
  });

  it('calls approveDesign when Approve button clicked on pending design', async () => {
    aiDesignService.getAICenterRecordsByUser.mockResolvedValue([mockDesigns[0]]);
    aiDesignService.approveDesign.mockResolvedValue({ ...mockDesigns[0], status: 'approved' });
    renderPage();
    await waitFor(() => screen.getByTitle('Approve'));
    fireEvent.click(screen.getByTitle('Approve'));
    await waitFor(() => {
      expect(aiDesignService.approveDesign).toHaveBeenCalledWith(1);
    });
  });
});
