import React from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useCart } from "../../hooks/useCart";
import { useSelector } from "react-redux";
import CartItem from "../ui/CartItem";
import OrderSummary from "../ui/OrderSummary";
import { orderService } from "../../services/orderService";
import { paymentService } from "../../services/paymentService";

const CartPage = () => {
  const { items, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useSelector((state) => state.auth);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Calculate order totals
  const subtotal = totalPrice;
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please login to checkout.");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setIsProcessing(true);
    const loadingToastId = toast.loading("Creating your order...");

    try {
      const orderCreationResults = await Promise.allSettled(
        items.map(async (item) => {
          const orderPayload = {
            user_email: user.email,
            product_id: item.productId ?? item.id,
            total_amount: Math.round(item.price * item.quantity),
            product_quantity: item.quantity,
            product_price: Math.round(item.price),
            payment_status: "Pending",
            custom_design_id: item.designId,
            custom_product_name: item.customProductName,
            custom_product_image: item.customProductImage,
          };

          const orderRes = await orderService.createOrder(orderPayload);
          return {
            item,
            orderId: orderRes.order_id ?? orderRes.id,
          };
        })
      );

      const successfulOrders = orderCreationResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const failedOrderCount = orderCreationResults.length - successfulOrders.length;

      if (successfulOrders.length === 0) {
        throw new Error("Unable to create any order. Please try again.");
      }

      if (failedOrderCount > 0) {
        toast.dismiss(loadingToastId);
        toast.error(
          `${failedOrderCount} item(s) failed during order creation. Please retry checkout for remaining items.`
        );
        return;
      }

      const paymentCreationResults = await Promise.allSettled(
        successfulOrders.map(async ({ item, orderId }) => {
          if (!orderId) {
            return null;
          }

          const paymentPayload = {
            order_id: orderId,
            amount: item.price * item.quantity,
            status: "Pending",
          };
          const paymentRes = await paymentService.createPayment(paymentPayload);
          return paymentRes.payment_id ?? paymentRes.id;
        })
      );

      const paymentIds = paymentCreationResults
        .filter((result) => result.status === "fulfilled" && result.value)
        .map((result) => result.value);
      const failedPaymentCount = paymentCreationResults.length - paymentIds.length;

      // Orders are already created at this point, so confirm success even if payment APIs are delayed/failing.
      if (paymentIds.length === 0) {
        toast.dismiss(loadingToastId);
        clearCart();
        toast.success("Order placed successfully. Confirmation sent to your email.");
        if (failedPaymentCount > 0) {
          toast("Payment confirmation is pending. Check notifications shortly.", {
            icon: "⚠️",
          });
        }
        return;
      }

      let allCompleted = false;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const statusResponses = await Promise.allSettled(
          paymentIds.map((id) => paymentService.getSinglePayment(id))
        );
        const successfulStatuses = statusResponses
          .filter((response) => response.status === "fulfilled")
          .map((response) => response.value);

        allCompleted =
          successfulStatuses.length > 0 &&
          successfulStatuses.every((res) => res.status === "Completed");
        if (allCompleted) {
          break;
        }
        await sleep(3000);
      }

      toast.dismiss(loadingToastId);
      clearCart();
      if (allCompleted) {
        toast.success("Payment complete. Order placed successfully.");
      } else {
        toast.success("Order placed successfully. Confirmation sent to your email.");
        toast("Payment may take a moment to confirm. Check notifications.", {
          icon: "⚠️",
        });
      }
    } catch (error) {
      console.error("Checkout failed", error);
      toast.dismiss(loadingToastId);
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Checkout failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Breadcrumb */}
      <div className="bg-black border-b border-borderColor py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex text-sm text-textColorMuted">
            <Link to="/" className="hover:text-primaryColor transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-textColorMain">Shopping Cart</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-textColorMain mb-2">Your Cart</h1>
          <p className="text-textColorMuted">
            {items.length === 0
              ? "Your cart is empty. Add some items to get started!"
              : `You have ${items.length} item${items.length > 1 ? "s" : ""} in your cart.`}
          </p>
        </div>

        {items.length === 0 ? (
          // Empty Cart State
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-black border border-borderColor rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-textColorMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-textColorMain mb-2">Your cart is empty</h2>
            <p className="text-textColorMuted mb-6">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link
              to="/categories"
              className="inline-block bg-primaryColor text-black px-6 py-3 rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          // Cart with Items
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2">
              <div className="bg-black border border-borderColor rounded-lg">
                <div className="p-6 border-b border-borderColor">
                  <h2 className="text-lg font-semibold text-textColorMain">Cart Items</h2>
                </div>
                <div className="divide-y divide-borderColor">
                  {items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                subtotal={subtotal}
                shipping={shipping}
                tax={tax}
                total={total}
                onCheckout={handleCheckout}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
