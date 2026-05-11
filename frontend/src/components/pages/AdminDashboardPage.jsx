import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { productService } from "../../services/productService";
import { orderService } from "../../services/orderService";

const PRODUCTS_BASE_URL =
  import.meta.env.VITE_PRODUCTS_API_URL || "http://localhost:8000";

const getProductImageUrl = (product) => {
  if (product?.product_image) {
    return `data:image/png;base64,${product.product_image}`;
  }
  if (product?.product_id) {
    return `${PRODUCTS_BASE_URL}/product/${product.product_id}/image`;
  }
  return "";
};

const getOrderCustomImageUrl = (order) => {
  if (!order?.custom_product_image) return "";
  if (order.custom_product_image.startsWith("data:")) {
    return order.custom_product_image;
  }
  return `data:image/png;base64,${order.custom_product_image}`;
};

const StatCard = ({ label, value }) => (
  <div className="rounded-borderRadiusLg border border-borderColor bg-surfaceColor p-4">
    <p className="text-textColorMuted text-sm">{label}</p>
    <p className="text-3xl font-semibold text-textColorMain mt-2">{value}</p>
  </div>
);

const ServiceBadge = ({ name, healthy }) => (
  <span
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
      healthy
        ? "bg-green-500/10 text-green-400 border-green-500/30"
        : "bg-red-500/10 text-red-400 border-red-500/30"
    }`}
  >
    <span
      className={`w-2 h-2 rounded-full ${healthy ? "bg-green-400" : "bg-red-400"}`}
    />
    {name}
  </span>
);

const AdminDashboardPage = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState({
    Product_name: "",
    Product_details: "",
    product_quantity: 0,
    price: 1,
    category: "",
  });
  const [newProduct, setNewProduct] = useState({
    Product_name: "",
    Product_details: "",
    product_quantity: 1,
    price: 1,
    category: "",
    file: null,
  });
  const [createImageInputKey, setCreateImageInputKey] = useState(0);
  const [orderStatusEdits, setOrderStatusEdits] = useState({});
  const [health, setHealth] = useState({
    users: false,
    products: false,
    orders: false,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const [usersData, productsData, ordersData, productsHealth] =
        await Promise.all([
          authService.getAllUsers(),
          productService.getAllProducts(),
          orderService.getAllOrders(),
          productService.checkHealth(),
        ]);

      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      setUsers(Array.isArray(usersData) ? usersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setOrders(safeOrders);
      setOrderStatusEdits(
        safeOrders.reduce((acc, order) => {
          if (order?.order_id) {
            acc[order.order_id] = order.payment_status || "Pending";
          }
          return acc;
        }, {})
      );
      setHealth({
        users: true,
        products: !!productsHealth?.status,
        orders: true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to load admin dashboard data. Check backend services."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== "seller") return;
    loadDashboardData();
  }, [currentUser?.id, currentUser?.role]);

  const totalInventory = useMemo(
    () =>
      products.reduce(
        (sum, item) => sum + Number(item?.product_quantity || 0),
        0
      ),
    [products]
  );

  const productsById = useMemo(
    () =>
      products.reduce((acc, product) => {
        if (product?.product_id) {
          acc[product.product_id] = product;
        }
        return acc;
      }, {}),
    [products]
  );

  const setActionFeedback = (message = "", err = "") => {
    setActionMessage(message);
    setActionError(err);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    setBusyKey(`user-${userId}`);
    setActionFeedback();
    try {
      await authService.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setActionFeedback("User deleted successfully.");
    } catch (err) {
      setActionFeedback(
        "",
        err?.response?.data?.detail || "Failed to delete user."
      );
    } finally {
      setBusyKey("");
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product.product_id);
    setEditingProduct({
      Product_name: product.Product_name || "",
      Product_details: product.Product_details || "",
      product_quantity: Number(product.product_quantity || 0),
      price: Number(product.price || 1),
      category: product.category || "",
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setBusyKey("product-create");
    setActionFeedback();
    try {
      await productService.createProduct({
        ...newProduct,
        Product_id: 0,
      });
      setNewProduct({
        Product_name: "",
        Product_details: "",
        product_quantity: 1,
        price: 1,
        category: "",
        file: null,
      });
      setCreateImageInputKey((prev) => prev + 1);
      await loadDashboardData();
      setActionFeedback("Product created successfully.");
    } catch (err) {
      setActionFeedback(
        "",
        err?.response?.data?.detail || "Failed to create product."
      );
    } finally {
      setBusyKey("");
    }
  };

  const handleUpdateProduct = async (productId) => {
    setBusyKey(`product-update-${productId}`);
    setActionFeedback();
    try {
      const original = products.find((p) => p.product_id === productId);
      if (!original) return;
      const payload = {
        ...original,
        ...editingProduct,
      };
      await productService.updateProduct(productId, payload);
      setEditingProductId(null);
      await loadDashboardData();
      setActionFeedback("Product updated successfully.");
    } catch (err) {
      setActionFeedback(
        "",
        err?.response?.data?.detail || "Failed to update product."
      );
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    setBusyKey(`product-delete-${productId}`);
    setActionFeedback();
    try {
      await productService.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.product_id !== productId));
      setActionFeedback("Product deleted successfully.");
    } catch (err) {
      setActionFeedback(
        "",
        err?.response?.data?.detail || "Failed to delete product."
      );
    } finally {
      setBusyKey("");
    }
  };

  const handleUpdateOrderStatus = async (order) => {
    const status = orderStatusEdits[order.order_id] || order.payment_status;
    setBusyKey(`order-update-${order.order_id}`);
    setActionFeedback();
    try {
      const payload = {
        ...order,
        payment_status: status,
      };
      await orderService.updateOrder(order.order_id, payload);
      await loadDashboardData();
      setActionFeedback("Order update request sent successfully.");
    } catch (err) {
      setActionFeedback(
        "",
        err?.response?.data?.detail || "Failed to update order."
      );
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Delete this order?")) return;
    setBusyKey(`order-delete-${orderId}`);
    setActionFeedback();
    try {
      await orderService.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setActionFeedback("Order deleted successfully.");
    } catch (err) {
      setActionFeedback(
        "",
        err?.response?.data?.detail || "Failed to delete order."
      );
    } finally {
      setBusyKey("");
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== "seller") {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="max-w-4xl mx-auto rounded-borderRadiusLg border border-borderColor bg-surfaceColor p-6">
          <h1 className="text-2xl text-textColorMain">Seller Dashboard</h1>
          <p className="text-textColorMuted mt-2">
            You do not have permission to view this page. Seller accounts only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-textColorMain">
          Seller Dashboard
        </h1>
        <p className="text-textColorMuted mt-2">
          Operational overview powered by live backend data.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <ServiceBadge name="Users Service" healthy={health.users} />
          <ServiceBadge name="Products Service" healthy={health.products} />
          <ServiceBadge name="Orders Service" healthy={health.orders} />
        </div>

        {error && (
          <div className="mt-4 rounded-borderRadiusMd border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="mt-4 rounded-borderRadiusMd border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-400 text-sm">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div className="mt-4 rounded-borderRadiusMd border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-textColorMuted">Loading dashboard...</div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={users.length} />
              <StatCard label="Total Products" value={products.length} />
              <StatCard label="Total Orders" value={orders.length} />
              <StatCard label="Inventory Units" value={totalInventory} />
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="rounded-borderRadiusLg border border-borderColor bg-surfaceColor p-4">
                <h2 className="text-lg text-textColorMain mb-3">
                  Users (Delete)
                </h2>
                <div className="space-y-2">
                  {users.slice(0, 6).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between border border-borderColor/60 rounded-borderRadiusMd px-3 py-2"
                    >
                      <div>
                        <p className="text-textColorMain text-sm">
                          {user.username || "Unknown"}
                        </p>
                        <p className="text-textColorMuted text-xs">{user.email}</p>
                      </div>
                      <span className="text-xs text-primaryColor uppercase">
                        {user.role || "buyer"}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={busyKey === `user-${user.id}`}
                        className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {!users.length && (
                    <p className="text-textColorMuted text-sm">No users found.</p>
                  )}
                </div>
              </section>

              <section className="rounded-borderRadiusLg border border-borderColor bg-surfaceColor p-4">
                <h2 className="text-lg text-textColorMain mb-3">
                  Orders (Update/Delete)
                </h2>
                <div className="space-y-2">
                  {orders.slice(0, 6).map((order, idx) => {
                    const product = productsById[order.product_id];
                    const productName =
                      order.custom_product_name ||
                      product?.Product_name ||
                      `Product ${order.product_id || "N/A"}`;
                    const orderImage = getOrderCustomImageUrl(order);

                    return (
                      <div
                        key={order.order_id || idx}
                        className="flex flex-wrap items-center justify-between gap-3 border border-borderColor/60 rounded-borderRadiusMd px-3 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {orderImage || product ? (
                            <img
                              src={orderImage || getProductImageUrl(product)}
                              alt={productName}
                              className="h-12 w-12 rounded-md object-cover border border-borderColor bg-backgroundColor shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md border border-borderColor bg-backgroundColor shrink-0" />
                          )}
                          <div>
                            <p className="text-textColorMain text-sm">
                              Order #{order.order_id || "N/A"}
                            </p>
                            <p className="text-textColorMuted text-xs">
                              {productName} | Qty: {order.product_quantity || 0}
                            </p>
                            {order.custom_design_id && (
                              <p className="text-primaryColor text-xs">
                                Custom design #{order.custom_design_id}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={
                              orderStatusEdits[order.order_id] ||
                              order.payment_status ||
                              "Pending"
                            }
                            onChange={(e) =>
                              setOrderStatusEdits((prev) => ({
                                ...prev,
                                [order.order_id]: e.target.value,
                              }))
                            }
                            className="text-xs bg-backgroundColor border border-borderColor rounded px-2 py-1"
                          >
                            <option>Pending</option>
                            <option>Completed</option>
                            <option>Failed</option>
                          </select>
                          <button
                            onClick={() => handleUpdateOrderStatus(order)}
                            disabled={busyKey === `order-update-${order.order_id}`}
                            className="text-xs px-2 py-1 rounded border border-primaryColor/50 text-primaryColor hover:bg-primaryColor/10 disabled:opacity-50"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.order_id)}
                            disabled={busyKey === `order-delete-${order.order_id}`}
                            className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!orders.length && (
                    <p className="text-textColorMuted text-sm">No orders found.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-borderRadiusLg border border-borderColor bg-surfaceColor p-4">
              <h2 className="text-lg text-textColorMain mb-3">Create Product</h2>
              <form
                onSubmit={handleCreateProduct}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3"
              >
                <input
                  value={newProduct.Product_name}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      Product_name: e.target.value,
                    }))
                  }
                  placeholder="Product name"
                  className="bg-backgroundColor border border-borderColor rounded px-3 py-2 text-sm"
                  required
                />
                <input
                  value={newProduct.Product_details}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      Product_details: e.target.value,
                    }))
                  }
                  placeholder="Details"
                  className="bg-backgroundColor border border-borderColor rounded px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  min={0}
                  value={newProduct.product_quantity}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      product_quantity: Number(e.target.value),
                    }))
                  }
                  placeholder="Quantity"
                  className="bg-backgroundColor border border-borderColor rounded px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      price: Number(e.target.value),
                    }))
                  }
                  placeholder="Price"
                  className="bg-backgroundColor border border-borderColor rounded px-3 py-2 text-sm"
                  required
                />
                <input
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="Category"
                  className="bg-backgroundColor border border-borderColor rounded px-3 py-2 text-sm"
                />
                <input
                  key={createImageInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      file: e.target.files?.[0] || null,
                    }))
                  }
                  className="bg-backgroundColor border border-borderColor rounded px-3 py-2 text-sm"
                />
                <div className="md:col-span-2 lg:col-span-6">
                  <button
                    type="submit"
                    disabled={busyKey === "product-create"}
                    className="px-4 py-2 rounded border border-primaryColor/50 text-primaryColor hover:bg-primaryColor/10 disabled:opacity-50 text-sm"
                  >
                    Create Product
                  </button>
                </div>
              </form>
            </section>

            <section className="mt-6 rounded-borderRadiusLg border border-borderColor bg-surfaceColor p-4">
              <h2 className="text-lg text-textColorMain mb-3">
                Products (Update/Delete)
              </h2>
              <div className="space-y-2">
                {products.slice(0, 8).map((product) => (
                  <div
                    key={product.product_id}
                    className="border border-borderColor/60 rounded-borderRadiusMd p-3"
                  >
                    {editingProductId === product.product_id ? (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input
                          value={editingProduct.Product_name}
                          onChange={(e) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              Product_name: e.target.value,
                            }))
                          }
                          className="bg-backgroundColor border border-borderColor rounded px-2 py-1 text-sm"
                        />
                        <input
                          value={editingProduct.Product_details}
                          onChange={(e) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              Product_details: e.target.value,
                            }))
                          }
                          className="bg-backgroundColor border border-borderColor rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          value={editingProduct.product_quantity}
                          onChange={(e) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              product_quantity: Number(e.target.value),
                            }))
                          }
                          className="bg-backgroundColor border border-borderColor rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          min={1}
                          step="0.01"
                          value={editingProduct.price}
                          onChange={(e) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              price: Number(e.target.value),
                            }))
                          }
                          className="bg-backgroundColor border border-borderColor rounded px-2 py-1 text-sm"
                        />
                        <input
                          value={editingProduct.category}
                          onChange={(e) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          className="bg-backgroundColor border border-borderColor rounded px-2 py-1 text-sm"
                        />
                        <div className="md:col-span-5 flex gap-2">
                          <button
                            onClick={() => handleUpdateProduct(product.product_id)}
                            disabled={
                              busyKey === `product-update-${product.product_id}`
                            }
                            className="text-xs px-3 py-1.5 rounded border border-primaryColor/50 text-primaryColor hover:bg-primaryColor/10 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingProductId(null)}
                            className="text-xs px-3 py-1.5 rounded border border-borderColor text-textColorMuted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.Product_name}
                            className="h-12 w-12 rounded-md object-cover border border-borderColor"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <div>
                          <p className="text-textColorMain text-sm">
                            {product.Product_name}
                          </p>
                          <p className="text-textColorMuted text-xs">
                            Qty: {product.product_quantity || 0} | Price:{" "}
                            {Number(product.price || 0).toFixed(2)} | Category:{" "}
                            {product.category || "N/A"}
                          </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditProduct(product)}
                            className="text-xs px-2 py-1 rounded border border-primaryColor/50 text-primaryColor hover:bg-primaryColor/10"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.product_id)}
                            disabled={
                              busyKey === `product-delete-${product.product_id}`
                            }
                            className="text-xs px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!products.length && (
                  <p className="text-textColorMuted text-sm">No products found.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
