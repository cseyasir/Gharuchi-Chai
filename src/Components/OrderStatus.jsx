import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress",
  dispatched: "Dispatched",
  completed: "Completed"
};

const badgeClasses = {
  pending: "bg-warning",
  in_progress: "bg-info",
  dispatched: "bg-primary",
  completed: "bg-success"
};

export default function OrderStatus() {
  const location = useLocation();
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    const getOrderIdFromLocation = () => {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get("orderId")) {
        return searchParams.get("orderId");
      }
      const paramOrderId = params["*"] || "";
      return paramOrderId ? decodeURIComponent(paramOrderId) : "";
    };

    setOrderId(getOrderIdFromLocation());
  }, [location.search, params]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;

    // Set up real-time subscription for order status changes
    const subscription = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        console.log('Order status changed:', payload);
        const newOrder = payload.new;
        setOrder(newOrder);

        // Send browser notification if status changed
        if (notificationPermission === 'granted' && order) {
          const oldStatus = order.status ?? order.order_status ?? "pending";
          const newStatus = newOrder.status ?? newOrder.order_status ?? "pending";

          if (oldStatus !== newStatus) {
            sendStatusNotification(newStatus, newOrder.order_id);
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, notificationPermission, order]);

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setOrder(null);
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      setError("");

      const normalizedId = orderId.trim();
      const numericId = Number(normalizedId);
      const isOrderRef = normalizedId.toUpperCase().startsWith("ORD");

      const queryOrder = async (filterById) => {
        const query = supabase.from("orders").select("*, order_items(*)");
        return filterById
          ? query.eq("id", numericId).single()
          : query.eq("order_id", normalizedId).single();
      };

      let data = null;
      let error = null;

      if (isOrderRef) {
        ({ data, error } = await queryOrder(false));
        if ((!data || error) && !Number.isNaN(numericId)) {
          ({ data, error } = await queryOrder(true));
        }
      } else if (!Number.isNaN(numericId)) {
        ({ data, error } = await queryOrder(true));
        if ((!data || error) && normalizedId !== String(numericId)) {
          ({ data, error } = await queryOrder(false));
        }
      } else {
        ({ data, error } = await queryOrder(false));
      }

      if (error || !data) {
        setError("Order not found. Please verify the order ID.");
        setOrder(null);
      } else {
        setOrder(data);
        setLastRefresh(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
      }
      setLoading(false);
    };

    fetchOrder();

    const interval = setInterval(() => {
      fetchOrder();
    }, 7000);

    return () => clearInterval(interval);
  }, [orderId]);

  const sendStatusNotification = (newStatus, orderId) => {
    if (notificationPermission !== 'granted') return;

    const statusMessages = {
      pending: "Your order is now pending preparation.",
      in_progress: "Your order is now being prepared!",
      dispatched: "Your order has been dispatched and is on the way!",
      completed: "Your order has been completed and delivered!"
    };

    const message = statusMessages[newStatus] || `Your order status has been updated to ${statusLabels[newStatus] || newStatus}`;

    new Notification('GarxechChai Order Update', {
      body: message,
      icon: '/favicon.ico', // You can add a custom icon
      tag: `order-${orderId}`, // Prevents duplicate notifications
      requireInteraction: true
    });
  };

  const status = order ? (order.status ?? order.order_status ?? "pending") : "pending";
  const statusLabel = statusLabels[status] || "Pending";
  const badgeClass = badgeClasses[status] || "bg-warning";

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Track Your Order</h2>
          <p className="text-muted mb-0">Enter your order ID to see the latest status.</p>
        </div>
        <Link to="/" className="btn btn-outline-secondary">
          Back to Home
        </Link>
      </div>

      {/* Notification Permission Section */}
      {'Notification' in window && notificationPermission !== 'granted' && (
        <div className="alert alert-info mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>🔔 Enable Notifications</strong>
              <p className="mb-0 small">Get instant updates when your order status changes!</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                Notification.requestPermission().then(permission => {
                  setNotificationPermission(permission);
                });
              }}
            >
              Enable Notifications
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <div className="spinner-border text-primary me-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div>
                <h5 className="placeholder-glow mb-1">
                  <span className="placeholder col-6"></span>
                </h5>
                <p className="placeholder-glow mb-0">
                  <span className="placeholder col-7"></span>
                </p>
              </div>
            </div>
            <div className="placeholder-glow mb-3">
              <span className="placeholder col-4"></span>
            </div>
            <div className="placeholder-glow mb-2">
              <span className="placeholder col-12"></span>
            </div>
            <div className="placeholder-glow mb-2">
              <span className="placeholder col-12"></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-12"></span>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          {error}
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="card-title mb-1">Order {order.order_id || order.id}</h5>
                <p className="text-muted mb-1">Placed on {new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                <span className={`badge ${badgeClass}`}>{statusLabel}</span>
              </div>
              <div className="text-end text-muted small">
                Auto-refresh every 7s
                {lastRefresh ? <div>Last updated {lastRefresh}</div> : null}
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-4">
                <strong>Customer</strong>
                <p className="mb-1">{order.customer_name || "-"}</p>
              </div>
              <div className="col-md-4">
                <strong>Phone</strong>
                <p className="mb-1">{order.customer_phone || "-"}</p>
              </div>
              <div className="col-md-4">
                <strong>Total</strong>
                <p className="mb-1">₹{order.total || 0}</p>
              </div>
            </div>

            <h6>Order Items</h6>
            <div className="table-responsive mb-3">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_name}</td>
                      <td className="text-end">{item.qty}</td>
                      <td className="text-end">₹{(item.price || 0) * (item.qty || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="alert alert-light">
              Keep this page open to refresh the status manually by reloading, or come back anytime with the same tracking link.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
