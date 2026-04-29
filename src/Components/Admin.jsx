import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./Admin.css";

export default function Admin() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("menu");
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [salesData, setSalesData] = useState({});
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: "", price: "" });
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [salesRange, setSalesRange] = useState("3m");
  const [salesFromDate, setSalesFromDate] = useState("");
  const [salesToDate, setSalesToDate] = useState("");
  const LOCAL_ADMIN_KEY = "adminLoggedIn";

  // Require admin session before loading any data
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const local = localStorage.getItem(LOCAL_ADMIN_KEY) === "true";
      if (!data?.session && !local) {
        nav("/login");
        return;
      }
      setSession(data.session || null);
      setLocalAdmin(local);
      await fetchMenuItems();
      await fetchOrders();
      await fetchSalesData();
      setCheckingAuth(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) nav("/login");
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [nav]);

  useEffect(() => {
    const orderChannel = supabase
      .channel("orders-realtime")
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        fetchSalesData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        fetchSalesData();
      });

    orderChannel.subscribe();
    const interval = setInterval(() => {
      fetchOrders();
      fetchSalesData();
    }, 15000);

    return () => {
      supabase.removeChannel(orderChannel);
      clearInterval(interval);
    };
  }, []);

  // Menu CRUD Operations
  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu")
      .select("*")
      .order("category", { ascending: true });

    if (error) console.error(error);
    else setMenuItems(data || []);
  };

  const addMenuItem = async () => {
    const priceValue = Number(newItem.price);
    if (!newItem.name.trim() || !newItem.category || Number.isNaN(priceValue) || priceValue <= 0) {
      alert("Please enter a valid name, category and price greater than 0.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("menu")
      .insert([{
        name: newItem.name.trim(),
        price: priceValue,
        category: newItem.category,
        is_active: true
      }]);

    if (error) {
      console.error("Add menu item failed:", error);
      alert(`Error adding item: ${error.message}`);
    } else {
      setNewItem({ name: "", price: "", category: "" });
      fetchMenuItems();
    }
    setLoading(false);
  };

  const startEditingItem = (item) => {
    setEditingItem(item.id);
    setEditingValues({ name: item.name, price: item.price.toString() });
  };

  const updateMenuItem = async (id, updates) => {
    const payload = {};
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (trimmedName) payload.name = trimmedName;
    }

    if (updates.price !== undefined) {
      const parsedPrice = Number(updates.price);
      if (!Number.isNaN(parsedPrice) && parsedPrice > 0) payload.price = parsedPrice;
    }

    if (Object.keys(payload).length === 0) {
      alert("No valid changes to save.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("menu")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Update menu item failed:", error);
      alert(`Error updating item: ${error.message}`);
    } else {
      fetchMenuItems();
      setEditingItem(null);
      setEditingValues({ name: "", price: "" });
    }
    setLoading(false);
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    const { error } = await supabase
      .from("menu")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Error deleting item");
    } else {
      fetchMenuItems();
    }
  };

  const toggleItemStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from("menu")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) console.error(error);
    else fetchMenuItems();
  };

  // Orders Management
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setOrders(data || []);
      setFilteredOrders(data || []);
      // Count pending orders for notification
      const pendingCount = data?.filter(order => {
        const status = getOrderStatus(order);
        return !status || status === 'pending';
      }).length || 0;
      setNotificationCount(pendingCount);
    }
  };

  useEffect(() => {
    const filtered = orders.filter(order => {
      const search = orderSearch.trim().toLowerCase();
      const phone = order.customer_phone?.toString() || "";
      const matchesSearch = !search ||
        order.order_id?.toString().toLowerCase().includes(search) ||
        order.customer_name?.toLowerCase().includes(search) ||
        phone.includes(search);
      const orderDate = new Date(order.created_at);
      const fromDate = orderStartDate ? new Date(orderStartDate) : null;
      const toDate = orderEndDate ? new Date(orderEndDate) : null;
      const matchesStart = !fromDate || orderDate >= fromDate;
      const matchesEnd = !toDate || orderDate <= toDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
    setFilteredOrders(filtered);
  }, [orders, orderSearch, orderStartDate, orderEndDate]);

  const getOrderFilter = (orderId) => {
    return orderId && orderId.toString().startsWith("ORD")
      ? { column: "order_id", value: orderId }
      : { column: "id", value: orderId };
  };

  const getOrderStatus = (order) => {
    return order.status ?? order.order_status ?? 'pending';
  };

  const updateOrderStatus = async (orderId, status) => {
    const filter = getOrderFilter(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq(filter.column, filter.value);

    if (error) {
      console.error(error);
      alert("Error updating order status: " + error.message);
    } else {
      await fetchOrders();
      await fetchSalesData();
    }
  };

  // Sales Dashboard
  const fetchSalesData = async () => {
    // Get total sales
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("total, status, created_at");

    if (ordersError) {
      console.error(ordersError);
      return;
    }

    // Calculate sales metrics
    const totalSales = ordersData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const completedOrders = ordersData?.filter(order => getOrderStatus(order) === 'completed').length || 0;
    const pendingOrders = ordersData?.filter(order => getOrderStatus(order) === 'pending').length || 0;

    // Get today's sales
    const today = new Date().toDateString();
    const todaySales = ordersData?.filter(order =>
      new Date(order.created_at).toDateString() === today &&
      getOrderStatus(order) === 'completed'
    ).reduce((sum, order) => sum + (order.total || 0), 0) || 0;

    const monthlyTotals = [];
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = monthDate.toLocaleString("default", { month: "short" });
      const monthTotal = ordersData?.filter(order => {
        const date = new Date(order.created_at);
        return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
      }).reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      monthlyTotals.push({ label, total: monthTotal });
    }

    // Get popular items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("item_name, qty");

    const itemSales = {};
    itemsData?.forEach(item => {
      itemSales[item.item_name] = (itemSales[item.item_name] || 0) + item.qty;
    });

    const popularItems = Object.entries(itemSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    setSalesData({
      totalSales,
      completedOrders,
      pendingOrders,
      todaySales,
      popularItems,
      monthlyTotals
    });
  };

  const clearNotifications = () => {
    setNotificationCount(0);
  };

  const resetOrderFilters = () => {
    setOrderSearch("");
    setOrderStartDate("");
    setOrderEndDate("");
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_ADMIN_KEY);
    setLocalAdmin(false);
    await supabase.auth.signOut();
    nav("/login");
  };

  const buildWeeklyChart = (sourceOrders) => {
    const today = new Date();
    return Array.from({ length: 4 }).map((_, index) => {
      const daysAgo = 7 * (3 - index);
      const end = new Date(today);
      end.setDate(today.getDate() - daysAgo);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const label = `${start.getDate()}/${start.getMonth() + 1}`;
      const total = sourceOrders.reduce((sum, order) => {
        const date = new Date(order.created_at);
        return date >= start && date <= end ? sum + (order.total || 0) : sum;
      }, 0);
      return { label, total };
    });
  };

  const buildCustomChart = (sourceOrders) => {
    if (!salesFromDate || !salesToDate) return [];
    const from = new Date(salesFromDate);
    const to = new Date(salesToDate);
    if (from > to) return [];
    const result = [];
    const current = new Date(from.getFullYear(), from.getMonth(), 1);
    while (current <= to) {
      const label = current.toLocaleString("default", { month: "short" });
      const total = sourceOrders.reduce((sum, order) => {
        const date = new Date(order.created_at);
        return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth()
          ? sum + (order.total || 0)
          : sum;
      }, 0);
      result.push({ label, total });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  };

  const getSalesChartData = () => {
    if (!salesData.monthlyTotals?.length) return [];
    if (salesRange === '1m') return buildWeeklyChart(orders);
    if (salesRange === '3m') return salesData.monthlyTotals.slice(-3);
    if (salesRange === '1y') return salesData.monthlyTotals.slice(-12);
    if (salesRange === 'custom') return buildCustomChart(orders);
    return salesData.monthlyTotals.slice(-3);
  };

  const getPopularItemsForRange = () => {
    const sourceOrders = orders.filter(order => {
      if (salesRange === 'custom' && salesFromDate && salesToDate) {
        const date = new Date(order.created_at);
        return date >= new Date(salesFromDate) && date <= new Date(salesToDate);
      }
      const windowDays = salesRange === '1m' ? 30 : salesRange === '3m' ? 90 : salesRange === '1y' ? 365 : 365;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - windowDays);
      return new Date(order.created_at) >= cutoff;
    });

    const itemSales = {};
    sourceOrders.forEach(order => {
      order.order_items?.forEach(item => {
        itemSales[item.item_name] = (itemSales[item.item_name] || 0) + item.qty;
      });
    });

    return Object.entries(itemSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  const chartData = (() => {
    const data = getSalesChartData();
    return data.length ? data : [{ label: 'No data', total: 0 }];
  })();

  const categories = ["tea", "meal", "juice", "roaster"];
  const categoryOptions = Array.from(new Set([
    ...categories,
    ...menuItems.map(item => item.category || "")
  ].filter(Boolean))).sort();

  if (checkingAuth) {
    return (
      <div className="container py-4">
        <div className="alert alert-secondary">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Admin Dashboard</h2>
          {session?.user?.email ? (
            <div className="text-muted">Signed in as {session.user.email}</div>
          ) : localAdmin ? (
            <div className="text-muted">Signed in as Admin</div>
          ) : null}
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-danger" onClick={signOut}>
            Logout
          </button>
          <button
            className="btn btn-outline-primary position-relative"
            onClick={clearNotifications}
          >
            🔔 Notifications
            {notificationCount > 0 && (
              <span className="badge bg-danger position-absolute top-0 start-100 translate-middle">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            Menu Management
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders {orders.filter(o => !o.status || o.status === 'pending').length > 0 &&
              <span className="badge bg-warning ms-1">New</span>}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Dashboard
          </button>
        </li>
      </ul>

      {/* Menu Management Tab */}
      {activeTab === 'menu' && (
        <div>
          <h4>Menu Management</h4>

          {/* Add New Item Form */}
          <div className="card mb-4">
            <div className="card-header">
              <h5>Add New Item</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Item Name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="col-md-3">
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Price"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-success w-100"
                    onClick={addMenuItem}
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="row">
            {categories.map(category => (
              <div key={category} className="col-md-6 mb-4">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">{category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                  </div>
                  <div className="card-body">
                    {menuItems
                      .filter(item => item.category === category)
                      .map(item => (
                        <div key={item.id} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                          <div className="flex-grow-1">
                            {editingItem === item.id ? (
                              <div className="d-flex gap-2">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={editingValues.name}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={editingValues.price}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, price: e.target.value }))}
                                />
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => updateMenuItem(item.id, editingValues)}
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => {
                                    setEditingItem(null);
                                    setEditingValues({ name: "", price: "" });
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div>
                                <strong>{item.name}</strong> - ₹{item.price}
                                <span className={`badge ms-2 ${item.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                  {item.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => startEditingItem(item)}
                              disabled={editingItem === item.id}
                            >
                              ✏️
                            </button>
                            <button
                              className={`btn ${item.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => toggleItemStatus(item.id, item.is_active)}
                            >
                              {item.is_active ? '🚫' : '✅'}
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => deleteMenuItem(item.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <h4>Order Management</h4>
          <div className="card admin-filter-card mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label">Order ID / Phone filter</label>
                  <div className="input-group">
                    <span className="input-group-text">🔎</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search order ID or phone"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label">From date</label>
                  <div className="input-group">
                    <span className="input-group-text">📅</span>
                    <input
                      type="date"
                      className="form-control"
                      value={orderStartDate}
                      onChange={(e) => setOrderStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label">To date</label>
                  <div className="input-group">
                    <span className="input-group-text">📅</span>
                    <input
                      type="date"
                      className="form-control"
                      value={orderEndDate}
                      onChange={(e) => setOrderEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-2 d-grid">
                  <button className="btn btn-outline-secondary" onClick={resetOrderFilters}>
                    Reset filters
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            {filteredOrders.map(order => (
              <div key={order.id || order.order_id} className="col-md-6 mb-3">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Order #{order.order_id}</h6>
                    <span className={`badge ${
                      getOrderStatus(order) === 'pending' ? 'bg-warning' :
                      getOrderStatus(order) === 'in_progress' ? 'bg-info' : 'bg-success'
                    }`}>
                      {getOrderStatus(order) === 'pending' ? 'Pending' :
                       getOrderStatus(order) === 'in_progress' ? 'In Progress' : 'Completed'}
                    </span>
                  </div>
                  <div className="card-body">
                    <p><strong>Customer:</strong> {order.customer_name}</p>
                    <p><strong>Phone:</strong> {order.customer_phone || "-"}</p>
                    <p><strong>Total:</strong> ₹{order.total}</p>
                    <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>

                    <h6>Items:</h6>
                    <ul className="list-group list-group-flush mb-3">
                      {order.order_items?.map((item, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between">
                          <span>{item.item_name} x{item.qty}</span>
                          <span>₹{item.price * item.qty}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="btn-group w-100">
                      <button
                        className="btn btn-outline-info"
                        onClick={() => updateOrderStatus(order.id || order.order_id, 'in_progress')}
                        disabled={getOrderStatus(order) === 'in_progress' || getOrderStatus(order) === 'completed'}
                      >
                        In Progress
                      </button>
                      <button
                        className="btn btn-outline-success"
                        onClick={() => updateOrderStatus(order.id || order.order_id, 'completed')}
                        disabled={getOrderStatus(order) === 'completed'}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Dashboard Tab */}
      {activeTab === 'sales' && (
        <div>
          <h4>Sales Dashboard</h4>
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Total Sales</h5>
                  <h3 className="text-success">₹{salesData.totalSales?.toFixed(2)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Today's Sales</h5>
                  <h3 className="text-primary">₹{salesData.todaySales?.toFixed(2)}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Completed Orders</h5>
                  <h3 className="text-info">{salesData.completedOrders}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <h5 className="card-title">Pending Orders</h5>
                  <h3 className="text-warning">{salesData.pendingOrders}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">
              <h5>Sales Trend</h5>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2 mb-3 admin-chart-controls">
                {[
                  { value: '1m', label: '1 Month' },
                  { value: '3m', label: '3 Months' },
                  { value: '1y', label: '1 Year' },
                  { value: 'custom', label: 'Custom' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn btn-outline-secondary sales-range-pill ${salesRange === option.value ? 'active' : ''}`}
                    onClick={() => setSalesRange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {salesRange === 'custom' && (
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Start date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={salesFromDate}
                      onChange={(e) => setSalesFromDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">End date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={salesToDate}
                      onChange={(e) => setSalesToDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="sales-chart">
                {chartData.map((point, index) => {
                  const maxValue = Math.max(...chartData.map(p => p.total), 1);
                  const height = point.total === 0 ? 10 : Math.max(10, Math.round((point.total / maxValue) * 100));
                  return (
                    <div key={`${point.label}-${index}`} className="sales-chart-column">
                      <div className="sales-chart-bar" style={{ height: `${height}%` }}>
                        <span>₹{point.total.toFixed(0)}</span>
                      </div>
                      <div className="sales-chart-label">{point.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5>Popular Items</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {getPopularItemsForRange().map(([item, qty], index) => (
                  <div key={index} className="col-md-4 mb-3">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <h6>{item}</h6>
                        <p className="text-muted">{qty} orders</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}