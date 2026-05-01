import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";
import "./Admin.css";

export default function Admin() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [localAdmin, setLocalAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [salesData, setSalesData] = useState({});
  const [feedbacks, setFeedbacks] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "", image_url: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: "", price: "", image_url: "" });
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [salesRange, setSalesRange] = useState("3m");
  const salesFromDate = "";
  const salesToDate = "";
  const LOCAL_ADMIN_KEY = "adminLoggedIn";

  const getOrderStatus = useCallback((order) => {
    return order?.status ?? order?.order_status ?? 'pending';
  }, []);

  const getOrderLabel = useCallback((order) => {
    const status = getOrderStatus(order);
    if (status === 'in_progress') return 'In Progress';
    if (status === 'dispatched') return 'Dispatched';
    if (status === 'completed') return 'Completed';
    return 'Pending';
  }, [getOrderStatus]);

  const getOrderBadgeClass = useCallback((order) => {
    const status = getOrderStatus(order);
    if (status === 'in_progress') return 'bg-info';
    if (status === 'dispatched') return 'bg-primary';
    if (status === 'completed') return 'bg-success';
    return 'bg-warning';
  }, [getOrderStatus]);

  // Menu CRUD Operations
  const fetchMenuItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("menu")
      .select("*")
      .order("category", { ascending: true });

    if (error) console.error(error);
    else setMenuItems(data || []);
  }, []);

  const fetchOrders = useCallback(async () => {
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
      const pendingCount = data?.filter(order => {
        const status = getOrderStatus(order);
        return !status || status === 'pending';
      }).length || 0;
      setNotificationCount(pendingCount);
    }
  }, [getOrderStatus]);

  const fetchSalesData = useCallback(async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("total, status, created_at");

    if (ordersError) {
      console.error(ordersError);
      return;
    }

    const totalSales = ordersData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const completedOrders = ordersData?.filter(order => getOrderStatus(order) === 'completed').length || 0;
    const pendingOrders = ordersData?.filter(order => getOrderStatus(order) === 'pending').length || 0;

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

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("item_name, qty");

    if (itemsError) {
      console.error(itemsError);
    }

    const itemSales = {};
    itemsData?.forEach(item => {
      itemSales[item.item_name] = (itemSales[item.item_name] || 0) + item.qty;
    });

    const popularItems = Object.entries(itemSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    setSalesData({
      totalSales,
      completedOrders,
      pendingOrders,
      todaySales,
      popularItems,
      monthlyTotals
    });
  }, [getOrderStatus]);

  const fetchFeedbacks = useCallback(async () => {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, name, email, phone, message, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Feedback fetch failed:", error);
      return;
    }

    setFeedbacks(data || []);
  }, []);

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
      await fetchFeedbacks();
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
  }, [nav, fetchMenuItems, fetchOrders, fetchSalesData, fetchFeedbacks]);

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
      fetchFeedbacks();
    }, 15000);

    return () => {
      supabase.removeChannel(orderChannel);
      clearInterval(interval);
    };
  }, [fetchOrders, fetchSalesData, fetchFeedbacks]);

  const addMenuItem = async () => {
    const priceValue = Number(newItem.price);
    if (!newItem.name.trim() || !newItem.category || Number.isNaN(priceValue) || priceValue <= 0) {
      alert("Please enter a valid name, category and price greater than 0.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("menu")
      .insert([{
        name: newItem.name.trim(),
        price: priceValue,
        category: newItem.category,
        image_url: newItem.image_url?.trim() || null,
        is_active: true
      }]);

    if (error) {
      console.error("Add menu item failed:", error);
      alert(`Error adding item: ${error.message}`);
    } else {
      setNewItem({ name: "", price: "", category: "", image_url: "" });
      fetchMenuItems();
    }
    setLoading(false);
  };

  const startEditingItem = (item) => {
    setEditingItem(item.id);
    setEditingValues({
      name: item.name,
      price: item.price.toString(),
      image_url: item.image_url || ""
    });
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

    if (updates.image_url !== undefined) {
      const trimmedUrl = updates.image_url.trim();
      payload.image_url = trimmedUrl || null;
    }

    if (Object.keys(payload).length === 0) {
      alert("No valid changes to save.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("menu")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Update menu item failed:", error);
      alert(`Error updating item: ${error.message}`);
    } else {
      fetchMenuItems();
      setEditingItem(null);
      setEditingValues({ name: "", price: "", image_url: "" });
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

  const printOrderPOS = (order) => {
    const widthMm = 63.5;
    const left = 6;
    const lineHeight = 4.5;
    const baseTop = 8;
    let y = baseTop;

    const items = order.order_items || [];
    const estimatedHeight = baseTop
      + 5  // title
      + 5  // address
      + 6  // subtitle
      + 6  // divider
      + 4  // order line
      + 4  // date line
      + 4  // customer line
      + 6  // phone line
      + 6  // divider
      + 4  // header row
      + 5  // header divider
      + items.length * 5
      + 4  // item/footer spacing
      + 6  // total divider
      + 7  // total line
      + 9; // footer

    const pageHeight = Math.max(estimatedHeight, 90);
    const doc = new jsPDF({ unit: "mm", format: [widthMm, pageHeight] });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("GaruhChai", widthMm / 2, y, { align: "center" });
    y += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Zangulpora Devsar Kulgam", widthMm / 2, y, { align: "center" });
    y += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("POS Receipt", widthMm / 2, y, { align: "center" });
    y += 6;

    doc.setLineWidth(0.3);
    doc.line(left, y, widthMm - left, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Order: ${order.order_id || order.id}`, left, y);
    y += lineHeight;

    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, left, y);
    y += lineHeight;

    doc.text(`Customer: ${order.customer_name || "-"}`, left, y);
    y += lineHeight;

    doc.text(`Phone: ${order.customer_phone || "-"}`, left, y);
    y += 6;

    doc.line(left, y, widthMm - left, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Item", left, y);
    doc.text("Qty", widthMm - 30, y);
    doc.text("Amt", widthMm - left, y, { align: "right" });
    y += lineHeight;

    doc.setLineWidth(0.2);
    doc.line(left, y, widthMm - left, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    items.forEach(item => {
      const itemName = item.item_name || item.name || "Item";
      const amount = (item.qty || 0) * (item.price || 0);
      const truncatedName = itemName.length > 18 ? itemName.slice(0, 18) + "..." : itemName;

      doc.text(truncatedName, left, y);
      doc.text(`${item.qty || 0}`, widthMm - 30, y);
      doc.text(`Rs ${amount}`, widthMm - left, y, { align: "right" });
      y += 5;
    });

    y += 4;
    doc.line(left, y, widthMm - left, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(`Total: Rs ${order.total || 0}`, left, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Thank you for your order!", widthMm / 2, y, { align: "center" });

    doc.save(`POS-${order.order_id || order.id}.pdf`);
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

  const buildLineChart = (data, width = 560, height = 260, padding = 24) => {
    const values = data.map((point) => point.total);
    const maxValue = Math.max(...values, 1);
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

    const points = data.map((point, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((point.total / maxValue) * (height - padding * 2));
      return { x, y, label: point.label, value: point.total };
    });

    const linePath = points.map((pt, index) => `${index === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

    return { width, height, padding, points, linePath, areaPath, maxValue };
  };

  const totalMenus = menuItems.length;
  const totalOrders = orders.length;
  const uniqueClients = new Set(
    orders
      .map(order => order.customer_phone?.toString().trim() || order.customer_name?.trim() || "")
      .filter(Boolean)
  ).size;
  const completedOrdersCount = orders.filter(order => getOrderStatus(order) === 'completed').length;
  const pendingOrdersCount = orders.filter(order => getOrderStatus(order) === 'pending').length;
  const inProgressOrdersCount = orders.filter(order => getOrderStatus(order) === 'in_progress').length;
  const recentOrders = orders.slice(0, 4);
  const recentFeedbacks = feedbacks.slice(0, 4);
  const feedbackCount = feedbacks.length;

  const itemImageMap = menuItems.reduce((map, item) => {
    if (item.image_url) map[item.name] = item.image_url;
    return map;
  }, {});

  const itemSales = orders.reduce((acc, order) => {
    (order.order_items || []).forEach(item => {
      const itemName = item.item_name || item.name || "Unknown";
      acc[itemName] = (acc[itemName] || 0) + (item.qty || 0);
    });
    return acc;
  }, {});

  const popularItems = Object.entries(itemSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([item, qty]) => ({
      item,
      qty,
      image: itemImageMap[item] || "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=500&q=80"
    }));

  const trendingItems = popularItems.slice(0, 5).map((entry, index) => ({
    ...entry,
    sales: entry.qty * 12,
  }));

  const mostSellingItems = popularItems.slice(0, 5);

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
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </li>
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
            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </li>
      </ul>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="admin-dashboard-view">
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card admin-summary-card text-center p-3">
                <div className="admin-summary-value">{totalMenus}</div>
                <div className="admin-summary-label">Total Menus</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card admin-summary-card text-center p-3">
                <div className="admin-summary-value">₹{salesData.totalSales?.toFixed(0)}</div>
                <div className="admin-summary-label">Total Revenue</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card admin-summary-card text-center p-3">
                <div className="admin-summary-value">{totalOrders}</div>
                <div className="admin-summary-label">Total Orders</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card admin-summary-card text-center p-3">
                <div className="admin-summary-value">{uniqueClients}</div>
                <div className="admin-summary-label">Total Clients</div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-8">
              <div className="card h-100 dashboard-card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="mb-1">Orders Summary</h5>
                      <p className="text-muted mb-0">Latest order status and counts.</p>
                    </div>
                    <span className="badge bg-success p-2">Updated live</span>
                  </div>
                  <div className="row g-3">
                    <div className="col-sm-4">
                      <div className="dashboard-metric-card">
                        <span className="metric-label">New Orders</span>
                        <strong>{pendingOrdersCount}</strong>
                      </div>
                    </div>
                    <div className="col-sm-4">
                      <div className="dashboard-metric-card">
                        <span className="metric-label">In Progress</span>
                        <strong>{inProgressOrdersCount}</strong>
                      </div>
                    </div>
                    <div className="col-sm-4">
                      <div className="dashboard-metric-card">
                        <span className="metric-label">Delivered</span>
                        <strong>{completedOrdersCount}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="row mt-4 g-3">
                    <div className="col-md-6">
                      <div className="dashboard-status-box p-3">
                        <p className="mb-2">Pending Orders</p>
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className="progress-bar bg-warning"
                            role="progressbar"
                            style={{ width: `${totalOrders ? (pendingOrdersCount / totalOrders) * 100 : 0}%` }}
                            aria-valuenow={pendingOrdersCount}
                            aria-valuemin="0"
                            aria-valuemax={totalOrders}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="dashboard-status-box p-3">
                        <p className="mb-2">Completed Orders</p>
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{ width: `${totalOrders ? (completedOrdersCount / totalOrders) * 100 : 0}%` }}
                            aria-valuenow={completedOrdersCount}
                            aria-valuemin="0"
                            aria-valuemax={totalOrders}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card h-100 dashboard-card">
                <div className="card-body">
                  <h5 className="mb-3">Recent Orders</h5>
                  {recentOrders.length === 0 ? (
                    <p className="text-muted">No recent orders yet.</p>
                  ) : (
                    <div className="list-group admin-recent-orders">
                      {recentOrders.map(order => (
                        <div key={order.id || order.order_id} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{order.order_id || order.id}</strong>
                              <div className="small text-muted">{order.customer_name || 'Guest'}</div>
                            </div>
                            <span className={`badge ${getOrderBadgeClass(order)}`}>{getOrderLabel(order)}</span>
                          </div>
                          <div className="small text-muted mt-2">₹{order.total || 0} · {new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card dashboard-card">
                <div className="card-body">
                  <h5 className="mb-3">Recent Feedback</h5>
                  {recentFeedbacks.length === 0 ? (
                    <p className="text-muted">No customer feedback yet.</p>
                  ) : (
                    <div className="list-group admin-feedback-list">
                      {recentFeedbacks.map(feedback => (
                        <div key={feedback.id} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong>{feedback.name}</strong>
                              <div className="small text-muted">{feedback.email} {feedback.phone ? `• ${feedback.phone}` : ''}</div>
                            </div>
                            <div className="text-end small text-muted">{new Date(feedback.created_at).toLocaleDateString()}</div>
                          </div>
                          <p className="mb-0 mt-2">{feedback.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card dashboard-card">
                <div className="card-body">
                  <h5 className="mb-3">Feedback Count</h5>
                  <div className="display-5 fw-bold">{feedbackCount}</div>
                  <p className="text-muted mb-0">Customer messages received from Contact form.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card dashboard-card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-1">Revenue Trend</h5>
                      <p className="text-muted mb-0">Sales over selected periods.</p>
                    </div>
                    <div className="d-flex gap-2">
                      {['1m', '3m', '1y'].map(value => (
                        <button
                          key={value}
                          type="button"
                          className={`btn btn-sm ${salesRange === value ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => setSalesRange(value)}
                        >
                          {value === '1m' ? '1M' : value === '3m' ? '3M' : '1Y'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sales-chart dashboard-sales-chart">
                    {chartData.map((point, index) => {
                      const maxValue = Math.max(...chartData.map(p => p.total), 1);
                      const height = point.total === 0 ? 12 : Math.max(12, Math.round((point.total / maxValue) * 100));
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
            </div>
            <div className="col-lg-4">
              <div className="card dashboard-card">
                <div className="card-body">
                  <h5 className="mb-3">Popular Items</h5>
                  {getPopularItemsForRange().map(([item, qty], index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                      <div>{item}</div>
                      <div className="text-secondary">{qty}</div>
                    </div>
                  ))}
                  {getPopularItemsForRange().length === 0 && <p className="text-muted">No item data available.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Image URL or data URI"
                    value={newItem.image_url}
                    onChange={(e) => setNewItem({...newItem, image_url: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Image URL"
                    value={newItem.image_url}
                    onChange={(e) => setNewItem({...newItem, image_url: e.target.value})}
                  />
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
                              <div className="d-flex gap-2 flex-wrap">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Name"
                                  value={editingValues.name}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="Price"
                                  value={editingValues.price}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, price: e.target.value }))}
                                />
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Image URL or data URI"
                                  value={editingValues.image_url}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, image_url: e.target.value }))}
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
                                    setEditingValues({ name: "", price: "", image_url: "" });
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div>
                                <strong>{item.name}</strong> - ₹{item.price}
                                {item.image_url && (
                                  <div className="text-muted small">
                                    Image: <a href={item.image_url} target="_blank" rel="noreferrer">link</a>
                                    <br />
                                    <img src={item.image_url} alt="preview" style={{ maxWidth: 180, maxHeight: 140, marginTop: 8, display: 'block', borderRadius: 8, objectFit: 'cover' }} />
                                  </div>
                                )}
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
                    <span className={`badge ${getOrderBadgeClass(order)}`}>
                      {getOrderLabel(order)}
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
                        className="btn btn-outline-secondary"
                        onClick={() => printOrderPOS(order)}
                        title="Print POS bill"
                      >
                        🖨️ Print
                      </button>
                      <button
                        className="btn btn-outline-info"
                        onClick={() => updateOrderStatus(order.id || order.order_id, 'in_progress')}
                        disabled={getOrderStatus(order) !== 'pending'}
                      >
                        In Progress
                      </button>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => updateOrderStatus(order.id || order.order_id, 'dispatched')}
                        disabled={getOrderStatus(order) !== 'in_progress'}
                      >
                        Dispatch
                      </button>
                      <button
                        className="btn btn-outline-success"
                        onClick={() => updateOrderStatus(order.id || order.order_id, 'completed')}
                        disabled={getOrderStatus(order) === 'completed' || getOrderStatus(order) === 'pending'}
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

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h4>Analytics</h4>
              <p className="text-muted">Restaurant summary with sales, item trends and customer feedback.</p>
            </div>
            <button className="btn btn-outline-secondary btn-sm">
              Filter Period
            </button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-8">
              <div className="card analytics-card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-1">Chart Orders</h5>
                      <p className="text-muted mb-0">Total sales and average sales per day.</p>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Weekly</button>
                  </div>
                  <div className="analytics-graph">
                    {(() => {
                      const lineData = buildLineChart(chartData);
                      return (
                        <div className="analytics-line-graph-wrapper">
                          <svg
                            viewBox={`0 0 ${lineData.width} ${lineData.height}`}
                            className="analytics-line-graph-svg"
                          >
                            <defs>
                              <linearGradient id="analytics-area-gradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="rgba(70, 132, 255, 0.28)" />
                                <stop offset="100%" stopColor="rgba(70, 132, 255, 0)" />
                              </linearGradient>
                            </defs>
                            {[0, 1, 2, 3].map((lineIndex) => {
                              const y = lineData.height - lineData.padding - (lineIndex * (lineData.height - lineData.padding * 2) / 3);
                              return (
                                <line
                                  key={lineIndex}
                                  x1={lineData.padding}
                                  y1={y}
                                  x2={lineData.width - lineData.padding}
                                  y2={y}
                                  stroke="rgba(108, 117, 125, 0.14)"
                                  strokeWidth="1"
                                />
                              );
                            })}
                            <path
                              d={lineData.areaPath}
                              fill="url(#analytics-area-gradient)"
                              opacity="0.9"
                            />
                            <path
                              d={lineData.linePath}
                              fill="none"
                              stroke="#467ffd"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {lineData.points.map((pt, index) => (
                              <g key={`point-${index}`}> 
                                <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#467ffd" strokeWidth="3" />
                                <text x={pt.x} y={pt.y - 12} textAnchor="middle" className="analytics-point-label">
                                  ₹{pt.value.toFixed(0)}
                                </text>
                              </g>
                            ))}
                          </svg>
                          <div className="analytics-line-labels">
                            {lineData.points.map((pt, index) => (
                              <div key={`label-${index}`} className="analytics-line-label-item">
                                {pt.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card analytics-card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-1">Trending Items</h5>
                      <p className="text-muted mb-0">Top-selling products this week.</p>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Weekly</button>
                  </div>
                  <div className="trending-items-list">
                    {trendingItems.map(item => (
                      <div key={item.item} className="trending-item d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-3">
                          <img src={item.image} alt={item.item} className="trending-thumb" />
                          <div>
                            <strong>{item.item}</strong>
                            <div className="small text-muted">{item.qty} sales</div>
                          </div>
                        </div>
                        <div className={`trend-badge ${item.sales > 200 ? 'up' : 'down'}`}>
                          {item.sales}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card analytics-card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Most Favorite Items</h5>
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-secondary">Monthly</button>
                    <button className="btn btn-outline-secondary">Weekly</button>
                    <button className="btn btn-outline-secondary">Today</button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {popularItems.slice(0, 6).map((item, index) => (
                      <div key={item.item} className="col-md-4">
                        <div className="favorite-item-card h-100">
                          <img src={item.image} alt={item.item} />
                          <div className="favorite-item-body">
                            <strong>{item.item}</strong>
                            <div className="text-muted small">{item.qty} orders</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {popularItems.length === 0 && <p className="text-muted">No favorite items available yet.</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card analytics-card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Most Selling Items</h5>
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-secondary">Monthly</button>
                    <button className="btn btn-outline-secondary">Weekly</button>
                    <button className="btn btn-outline-secondary">Today</button>
                  </div>
                </div>
                <div className="card-body">
                  {mostSellingItems.map((item, index) => (
                    <div key={item.item} className="most-selling-item d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <strong>{item.item}</strong>
                        <div className="small text-muted">{item.qty} orders</div>
                      </div>
                      <div className="text-primary">₹{(item.qty * 10).toFixed(2)}</div>
                    </div>
                  ))}
                  {mostSellingItems.length === 0 && <p className="text-muted">No selling items available yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}