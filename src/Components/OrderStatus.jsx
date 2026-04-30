import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  const getOrderIdFromLocation = () => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("orderId")) {
      return searchParams.get("orderId");
    }
    const prefix = "/track/";
    if (location.pathname.startsWith(prefix)) {
      return decodeURIComponent(location.pathname.slice(prefix.length));
    }
    return "";
  };

  useEffect(() => {
    setOrderId(getOrderIdFromLocation());
  }, [location.pathname, location.search]);

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

      const isOrderRef = orderId.toString().startsWith("ORD");
      let query = supabase.from("orders").select("*, order_items(*)");
      query = isOrderRef ? query.eq("order_id", orderId) : query.eq("id", Number(orderId));
      const { data, error } = await query.single();

      if (error || !data) {
        setError("Order not found. Please verify the order ID.");
        setOrder(null);
      } else {
        setOrder(data);
        setLastRefresh(new Date().toLocaleTimeString());
      }
      setLoading(false);
    };

    fetchOrder();

    const interval = setInterval(() => {
      fetchOrder();
    }, 7000);

    return () => clearInterval(interval);
  }, [orderId]);

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
                <p className="text-muted mb-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
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
