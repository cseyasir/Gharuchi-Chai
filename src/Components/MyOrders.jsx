import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getOrCreateUserId, saveCartToStorage } from "./orderUtils";
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

  useEffect(() => {
    if (!userId) return;
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
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
  };

  const handleReorder = (order) => {
    if (!order?.order_items?.length) {
      alert("This order has no items to reorder.");
      return;
    }

    const reorderCart = order.order_items.map(item => ({
      id: item.id ? item.id : `${item.item_name}-${item.price}`,
      name: item.item_name,
      qty: item.qty || 1,
      price: item.price || 0
    }));

    saveCartToStorage(reorderCart);
    navigate("/booking");
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
    </div>
  );
}
