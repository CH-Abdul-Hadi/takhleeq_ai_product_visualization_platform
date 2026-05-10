import { useSelector, useDispatch } from 'react-redux';
import {
  addToCart as addToCartAction,
  removeFromCart,
  updateQuantity as updateQuantityAction,
  clearCart as clearCartAction,
} from '../store/cartSlice';
import { inventoryService } from '../services/inventoryService';

export const useCart = () => {
  const items = useSelector((state) => state.cart.items);
  const totalItems = useSelector((state) => state.cart.totalItems);
  const totalPrice = useSelector((state) => state.cart.totalPrice);
  const isOpen = useSelector((state) => state.cart.isOpen);

  const dispatch = useDispatch();

  return {
    items,
    totalItems,
    totalPrice,
    isOpen,

    /**
     * Add a product to the cart.
     * Tries to check inventory first, but allows adding even if the
     * inventory service is unreachable (soft fallback).
     */
    addToCart: async (product, quantity = 1) => {
      try {
        const inventoryProductId = product.productId ?? product.id;
        const data = await inventoryService.checkInventory(inventoryProductId, quantity);
        if (data && data.available === false) {
          alert("This item is out of stock.");
          return false;
        }
      } catch (error) {
        // Inventory service may be down — allow add with a console warning
        console.warn(
          "Inventory service unavailable — adding to cart without stock check.",
          error
        );
      }
      dispatch(addToCartAction({ ...product, quantity }));
      return true;
    },

    removeFromCart: (productId) => {
      dispatch(removeFromCart(productId));
    },

    updateQuantity: async (productId, quantity) => {
      if (quantity <= 0) {
        dispatch(removeFromCart(productId));
        return true;
      }
      try {
        const item = items.find((cartItem) => cartItem.id === productId);
        const inventoryProductId = item?.productId ?? productId;
        const data = await inventoryService.checkInventory(inventoryProductId, quantity);
        if (data && data.available === false) {
          alert("Not enough inventory available for this quantity.");
          return false;
        }
      } catch (error) {
        console.warn("Inventory service unavailable — allowing quantity update.", error);
      }
      dispatch(updateQuantityAction({ id: productId, quantity }));
      return true;
    },

    clearCart: () => {
      dispatch(clearCartAction());
    },
  };
};
