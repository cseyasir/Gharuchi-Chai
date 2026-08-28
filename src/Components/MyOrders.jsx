import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getOrCreateUserId } from "./orderUtils";
import AlertModal from "./AlertModal";
import "./MyOrders.css";

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  dispatched: "Dispatched",
  completed: "Completed"
};

const badgeClasses = {
  pending: "bg-warning text-dark",
  in_progress: "bg-info text-dark",
  dispatched: "bg-primary",
  completed: "bg-success"
};

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId] = useState(getOrCreateUserId());

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    autoCloseTime: null
  });

  // Helper function to show alerts
  const showAlert = (type, title, message, autoCloseTime = null) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message,
      autoCloseTime
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  const formatMonthlyOrderPrefix = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    return `${month}${year}`;
  };

  const buildMonthlyOrderId = (prefix, sequence) => {
    return `${prefix}${String(sequence).padStart(2, "0")}`;
  };

  const getNextOrderSequence = async (prefix) => {
    const { data, error } = await supabase
      .from("orders")
      .select("order_id")
      .like("order_id", `${prefix}%`)
      .order("order_id", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Order ID lookup failed:", error);
      return 1;
    }

    if (!data || data.length === 0) {
      return 1;
    }

    const latest = data[0].order_id || "";
    const suffix = latest.slice(prefix.length);
    const parsed = parseInt(suffix, 10);
    return Number.isNaN(parsed) ? 1 : parsed + 1;
  };

  const getNextOrderId = async () => {
    const prefix = formatMonthlyOrderPrefix();
    const nextSequence = await getNextOrderSequence(prefix);
    return buildMonthlyOrderId(prefix, nextSequence);
  };

  const saveOrderWithRetry = async (payload, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      const { data: createdOrder, error } = await supabase
        .from("orders")
        .insert([payload])
        .select()
        .single();

      if (!error && createdOrder) {
        return createdOrder;
      }

      const duplicateError = error?.message?.toLowerCase()?.includes("duplicate") ||
        error?.details?.toLowerCase?.includes("duplicate") ||
        error?.message?.toLowerCase()?.includes("unique");

      if (!duplicateError || attempt === retries) {
        throw error || new Error("Order save failed");
      }

      payload.order_id = await getNextOrderId();
    }

    throw new Error("Unable to generate a unique order ID");
  };

  const getISTTimestamp = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const values = {};
    parts.forEach(({ type, value }) => {
      if (type !== "literal") values[type] = value;
    });

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}+05:30`;
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch user orders failed:", error);
      setError("Unable to load your orders. Please try again.");
      setOrders([]);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchOrders();
  }, [userId, fetchOrders]);

  const handleReorder = async (order) => {
    if (!order?.order_items?.length) {
      alert("This order has no items to reorder.");
      return;
    }

    if (!order.customer_name || !order.customer_phone) {
      alert("Cannot auto-reorder because customer name or phone is missing from the previous order.");
      return;
    }

    const orderItems = order.order_items.map(item => ({
      item_name: item.item_name || item.name,
      qty: item.qty || 1,
      price: item.price || 0
    }));

    const orderTotal = orderItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

    const orderPayload = {
      order_id: await getNextOrderId(),
      customer_name: order.customer_name,
      customer_phone: order.customer_phone?.toString(),
      user_id: getOrCreateUserId(),
      total: orderTotal,
      status: "pending",
      created_at: getISTTimestamp()
    };
    if (order.delivery_address) {
      orderPayload.delivery_address = order.delivery_address;
    }
    if (order.delivery_latitude != null) {
      orderPayload.delivery_latitude = order.delivery_latitude;
    }
    if (order.delivery_longitude != null) {
      orderPayload.delivery_longitude = order.delivery_longitude;
    }

    try {
      const createdOrder = await saveOrderWithRetry(orderPayload);

      const orderItemsPayload = orderItems.map(item => ({
        order_ref: createdOrder.id,
        item_name: item.item_name,
        qty: item.qty,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
      if (itemsError) {
        console.error("Failed to insert reorder items:", itemsError);
        showAlert("error", "Reorder Failed", "Unable to add items to your reorder. Please contact support.");
        return;
      }

      showAlert("success", "Reorder Successful!", `Your new order ID is ${createdOrder.order_id}. Redirecting to order tracking...`, 2000);
      setTimeout(() => {
        navigate(`/track/${encodeURIComponent(createdOrder.order_id)}`);
      }, 2000);
    } catch (err) {
      console.error("Unexpected error during reorder:", err);
      showAlert("error", "Reorder Error", "An unexpected error occurred while placing the reorder. Please try again.");
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>My Orders</h2>
          <p className="text-muted mb-0">Review your past orders and reorder with one click.</p>
        </div>
        <Link to="/" className="btn btn-outline-secondary">
          Back to Home
        </Link>
      </div>

      {loading ? (
        <div className="alert alert-secondary">Loading your orders…</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">
          No past orders found. Place a new order on the <Link to="/booking">booking page</Link>.
        </div>
      ) : (
        <div className="my-orders-list">
          <div className="row gy-4">
            {orders.map((order) => {
              const status = order.status ?? order.order_status ?? "pending";
              return (
                <div key={order.id || order.order_id} className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
                      <div>
                        <h5 className="mb-1">Order {order.order_id || order.id}</h5>
                        <div className="text-muted">{new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
                      </div>
                      <div className="text-end">
                        <span className={`badge ${badgeClasses[status] || badgeClasses.pending}`}>{statusLabels[status] || "Pending"}</span>
                        <div className="text-muted small mt-2">₹{order.total || 0}</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="mb-3">
                        <strong>Delivery Location</strong>
                        <p className="mb-0">{order.delivery_address || "-"}</p>
                      </div>
                      <strong>Items</strong>
                      <div className="table-responsive mt-2">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th className="text-end">Qty</th>
                              <th className="text-end">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.order_items?.map((item) => (
                              <tr key={`${item.item_name}-${item.price}-${item.qty}`}>
                                <td>{item.item_name}</td>
                                <td className="text-end">{item.qty}</td>
                                <td className="text-end">₹{(item.price || 0) * (item.qty || 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end">
                      <Link to={`/track/${encodeURIComponent(order.order_id || order.id)}`} className="btn btn-outline-primary btn-sm">
                        Track Order
                      </Link>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleReorder(order)}>
                        Reorder
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={closeAlert}
        autoCloseTime={alertModal.autoCloseTime}
      />
    </div>
  );
}
