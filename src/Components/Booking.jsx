import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";
import { getOrCreateUserId, getCartFromStorage, saveCartToStorage, clearCartStorage, getNameFromStorage, getPhoneFromStorage, saveNameToStorage, savePhoneToStorage } from "./orderUtils";
import AlertModal from "./AlertModal";
import DeliveryMap from "./DeliveryMap";
import "./Booking.css";

const categoryIcons = {
  tea: "☕",
  meal: "🍔",
  juice: "🥤",
  roaster: "🍖"
};

const LOCATION_PERMISSION_ASKED_KEY = "garuchhai_location_permission_asked";
const CURRENT_LOCATION_STORAGE_KEY = "garuchhai_current_location";
const SHOP_LOCATION = [33.636417, 75.064694];

export default function Booking() {
  const [menuData, setMenuData] = useState({});
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("tea");
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [useDeliveryLocation, setUseDeliveryLocation] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapPosition, setMapPosition] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [bill, setBill] = useState(null);
  const [shouldAutoReorder, setShouldAutoReorder] = useState(false);
  const [autoReorderStarted, setAutoReorderStarted] = useState(false);
  const [searchParams] = useSearchParams();
  const resetTimer = useRef(null);
  const customDeliveryLocationRef = useRef(false);

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    autoCloseTime: null
  });

  // IMAGE MAPPING FOR FOOD ITEMS (fallback only)
  const getIcon = (name) => {
    const images = {
      "Nagro Special Tea": "https://img.icons8.com/fluency/48/000000/tea.png",
      "Noon Chai": "https://img.icons8.com/fluency/48/000000/tea.png",
      "Lipton": "https://img.icons8.com/fluency/48/000000/tea.png",
      "Lemon Tea": "https://img.icons8.com/fluency/48/000000/lemon.png",
      "Mint Tea": "https://img.icons8.com/fluency/48/000000/tea.png",
      "Coffee": "https://img.icons8.com/fluency/48/000000/coffee-to-go.png",
      "Burger": "https://img.icons8.com/fluency/48/000000/hamburger.png",
      "Sandwich": "https://img.icons8.com/fluency/48/000000/sandwich.png",
      "Patties": "https://img.icons8.com/fluency/48/000000/dumpling.png",
      "Orange Juice": "https://img.icons8.com/fluency/48/000000/orange-juice.png",
      "Mixed Juice": "https://img.icons8.com/fluency/48/000000/juice-cup.png",
      "Apple Juice": "https://img.icons8.com/fluency/48/000000/apple-juice.png",
      "Pineapple Juice": "https://img.icons8.com/fluency/48/000000/pineapple.png",
      "Tuja (Roaster Meat)": "https://img.icons8.com/fluency/48/000000/roast-chicken.png"
    };
    return images[name] || null;
  };

  const fetchMenu = useCallback(async () => {
    const { data, error } = await supabase
      .from("menu")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error(error);
      return;
    }

    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    setMenuData(grouped);

    // Try to fetch categories from categories table first
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    let categoryObjects = [];

    if (!categoriesError && categoriesData && categoriesData.length > 0) {
      // Use categories from database
      categoryObjects = categoriesData.map(cat => ({
        value: cat.name,
        label: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
        icon: cat.icon || categoryIcons[cat.name] || "🍽️"
      }));
    } else {
      // Fallback: Extract unique categories from menu items
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      categoryObjects = uniqueCategories.map(cat => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        icon: categoryIcons[cat] || "🍽️"
      }));
    }

    setCategories(categoryObjects);

    // Set default category to first available if current category doesn't exist
    const availableCategories = categoryObjects.map(cat => cat.value);
    if (!availableCategories.includes(category) && availableCategories.length > 0) {
      setCategory(availableCategories[0]);
    }
  }, [category]);

  const saveBrowserLocation = async (coords) => {
    const position = [coords.latitude, coords.longitude];
    let address = "Current browser location";
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position[0]}&lon=${position[1]}`
      );
      if (response.ok) {
        const result = await response.json();
        address = result.display_name || address;
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
    const savedLocation = { address, latitude: position[0], longitude: position[1] };
    localStorage.setItem(CURRENT_LOCATION_STORAGE_KEY, JSON.stringify(savedLocation));
    setCurrentLocation(savedLocation);
    if (!customDeliveryLocationRef.current) {
      setMapPosition(position);
      setDeliveryLocation(savedLocation);
    }
  };

  // 🔥 FETCH MENU FROM DB (ONLY CHANGE)
  useEffect(() => {
    getOrCreateUserId();
    setName(getNameFromStorage());
    setPhone(getPhoneFromStorage());
    const storedCart = getCartFromStorage();
    if (storedCart.length > 0) {
      setCart(storedCart);
    }
    if (searchParams.get("reorder") === "true") {
      setShouldAutoReorder(true);
    }
    fetchMenu();
  }, [fetchMenu, searchParams]);

  useEffect(() => {
    const storedLocation = localStorage.getItem(CURRENT_LOCATION_STORAGE_KEY);
    if (storedLocation) {
      try {
        const parsedLocation = JSON.parse(storedLocation);
        if (parsedLocation?.latitude != null && parsedLocation?.longitude != null) {
          setCurrentLocation(parsedLocation);
          setDeliveryLocation(parsedLocation);
          setMapPosition([parsedLocation.latitude, parsedLocation.longitude]);
        }
      } catch (error) {
        localStorage.removeItem(CURRENT_LOCATION_STORAGE_KEY);
      }
    }

    if (!navigator.geolocation) return;

    localStorage.setItem(LOCATION_PERMISSION_ASKED_KEY, "true");
    const updateCurrentLocation = ({ coords }) => {
      saveBrowserLocation(coords).finally(() => setLocationLoading(false));
    };
    const handleLocationError = () => setLocationLoading(false);
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(updateCurrentLocation, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
    const watchId = navigator.geolocation.watchPosition(updateCurrentLocation, handleLocationError, {
      enableHighAccuracy: true,
      maximumAge: 300000,
      timeout: 30000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    saveNameToStorage(name);
  }, [name]);

  useEffect(() => {
    savePhoneToStorage(phone);
  }, [phone]);

  const fetchDeliveryLocation = () => {
    if (mapPosition) {
      setMapOpen(true);
      return;
    }

    if (!navigator.geolocation) {
      setMapPosition(SHOP_LOCATION);
      setMapOpen(true);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      await saveBrowserLocation(coords);
      setMapOpen(true);
      setLocationLoading(false);
    }, () => {
      setMapPosition(SHOP_LOCATION);
      setMapOpen(true);
      setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  };

  const toggleDeliveryLocation = (event) => {
    const checked = event.target.checked;
    customDeliveryLocationRef.current = checked;
    setUseDeliveryLocation(checked);
    if (checked) fetchDeliveryLocation();
    else {
      setMapPosition(currentLocation ? [currentLocation.latitude, currentLocation.longitude] : null);
      setDeliveryLocation(currentLocation);
    }
  };

  const confirmMapLocation = async () => {
    if (!mapPosition) return;
    let address = "Pinned delivery location";
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${mapPosition[0]}&lon=${mapPosition[1]}`
      );
      if (response.ok) {
        const result = await response.json();
        address = result.display_name || address;
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
    setDeliveryLocation({ address, latitude: mapPosition[0], longitude: mapPosition[1] });
    customDeliveryLocationRef.current = true;
    setUseDeliveryLocation(true);
    setMapOpen(false);
  };

  const cancelMapLocation = () => {
    setMapOpen(false);
    customDeliveryLocationRef.current = Boolean(currentLocation);
    setUseDeliveryLocation(Boolean(currentLocation));
    setDeliveryLocation(currentLocation);
  };

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const items = menuData[category] || [];

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

  // 🛒 CART (same logic, using id internally)
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id);
      if (existing) {
        return prev.map(x =>
          x.id === item.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const increaseItem = (item) => {
    setCart(prev =>
      prev.map(x =>
        x.id === item.id ? { ...x, qty: x.qty + 1 } : x
      )
    );
  };

  const decreaseItem = (item) => {
    setCart(prev => {
      const found = prev.find(x => x.id === item.id);
      if (found.qty === 1) {
        return prev.filter(x => x.id !== item.id);
      }
      return prev.map(x =>
        x.id === item.id ? { ...x, qty: x.qty - 1 } : x
      );
    });
  };

  const total = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

  useEffect(() => {
    saveCartToStorage(cart);
  }, [cart]);

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

  const getNextOrderId = useCallback(async () => {
    const prefix = formatMonthlyOrderPrefix();
    const nextSequence = await getNextOrderSequence(prefix);
    return buildMonthlyOrderId(prefix, nextSequence);
  }, []);

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

  const [saved, setSaved] = useState(false);

  const generateBill = useCallback(async () => {
    if (!name || !phone || cart.length === 0) {
      showAlert("warning", "Missing Information", "Please enter your name, phone number and select items before proceeding.");
      return;
    }
    if (!deliveryLocation || locationLoading) {
      showAlert("warning", "Delivery Location Needed", "Please allow location access or select your delivery location on the map.");
      return;
    }

    let orderId = `TEMP-${Date.now()}`;
    try {
      orderId = await getNextOrderId();
    } catch (error) {
      console.error("Failed to compute order ID:", error);
    }

    const newBill = {
      id: orderId,
      name,
      phone,
      deliveryLocation,
      items: cart,
      total,
      date: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    };

    setBill(newBill);
    setSaved(false);
  }, [name, phone, deliveryLocation, locationLoading, cart, total, getNextOrderId]);

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Clear your cart and start again?")) {
      clearCartStorage();
      setCart([]);
      setBill(null);
      setSaved(false);
    }
  };

  const cancelBill = () => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    setBill(null);
    setSaved(false);
  };

  const downloadBill = () => {
    if (!bill) return;

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 84;
    const leftMargin = 42;
    let y = 52;

    doc.setFillColor("#b4d7f8");
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

    doc.setFillColor("#0e4c92");
    doc.rect(0, 0, pageWidth, 98, "F");

    doc.setFontSize(24);
    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.text("GarxechChai", leftMargin, 48);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("", leftMargin, 62);
    doc.text("Zangulpora Devsar Kulgam.", leftMargin, 78);

    doc.setFontSize(14);
    doc.setTextColor("#ffffff");
    doc.text("Order Bill", pageWidth - leftMargin, 48, { align: "right" });
    doc.setFontSize(10);
    doc.text(`Order ID: ${bill.id}`, pageWidth - leftMargin, 64, { align: "right" });
    doc.text(`Date: ${bill.date}`, pageWidth - leftMargin, 80, { align: "right" });

    y = 116;
    doc.setDrawColor("#8bb1e1");
    doc.setLineWidth(1.2);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);

    y += 20;
    doc.setFontSize(10);
    doc.setTextColor("#1f1f1f");
    doc.text("Customer:", leftMargin, y);
    doc.setFont("helvetica", "bold");
    doc.text(bill.name, leftMargin + 70, y);

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.text("Phone:", leftMargin, y);
    doc.setFont("helvetica", "bold");
    doc.text(bill.phone, leftMargin + 70, y);

    doc.setFont("helvetica", "normal");
    doc.text("Status:", pageWidth - leftMargin - 120, y - 18, { align: "left" });
    doc.setFont("helvetica", "bold");
    doc.text(saved ? "Confirmed" : "Pending", pageWidth - leftMargin, y - 18, { align: "right" });

    y += 22;
    doc.setFont("helvetica", "normal");
    doc.text("Order placed on:", leftMargin, y);
    doc.setFont("helvetica", "bold");
    doc.text(bill.date, leftMargin + 88, y);

    y += 28;
    doc.setFontSize(10);
    doc.text("Item", leftMargin + 16, y);
    doc.text("Qty", leftMargin + 250, y);
    doc.text("Amount", pageWidth - leftMargin - 16, y, { align: "right" });

    y += 22;
    doc.setFillColor("#ffffff");
    doc.roundedRect(leftMargin, y - 14, contentWidth, (bill.items.length * 20) + 22, 14, 14, "F");
    doc.setFontSize(10);
    doc.setTextColor("#1f1f1f");

    bill.items.forEach(item => {
      doc.text(item.name, leftMargin + 16, y);
      doc.text(`${item.qty}`, leftMargin + 250, y);
      doc.text(`Rs ${item.qty * item.price}`, pageWidth - leftMargin - 16, y, { align: "right" });
      y += 20;
    });

    y += 6;
    doc.setDrawColor("#8bb1e1");
    doc.setLineWidth(0.8);
    doc.line(leftMargin, y, pageWidth - leftMargin, y);

    y += 26;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Total", leftMargin + 16, y);
    doc.text(`Rs ${bill.total}`, pageWidth - leftMargin - 16, y, { align: "right" });

    y += 28;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#1f1f1f");
    doc.text(saved ? "Order confirmed" : "Order pending", leftMargin + 16, y);
    doc.text("Please call +917889308062 for order updates.", leftMargin + 16, y + 18);

    doc.save(`GarxechChai-Bill-${bill.id}.pdf`);
  };

  const saveOrderWithRetry = useCallback(async (payload, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      const { data: order, error } = await supabase
        .from("orders")
        .insert([payload])
        .select()
        .single();

      if (!error && order) {
        return order;
      }

      const duplicateError = error?.message?.toLowerCase().includes("duplicate") ||
        error?.details?.toLowerCase?.()?.includes("duplicate") ||
        error?.message?.toLowerCase().includes("unique");

      if (!duplicateError || attempt === retries) {
        throw error || new Error("Order save failed");
      }

      const nextOrderId = await getNextOrderId();
      payload.order_id = nextOrderId;
      if (bill) {
        setBill(prev => prev ? { ...prev, id: nextOrderId } : prev);
      }
    }

    throw new Error("Unable to generate a unique order ID");
  }, [bill, getNextOrderId]);

  const confirmOrder = useCallback(async () => {
    if (!bill) return;

    const orderPayload = {
      order_id: bill.id,
      customer_name: bill.name,
      user_id: getOrCreateUserId(),
      total: bill.total,
      status: 'pending',
      created_at: getISTTimestamp()
    };
    if (bill.phone) {
      orderPayload.customer_phone = bill.phone;
    }
    if (bill.deliveryLocation) {
      orderPayload.delivery_address = bill.deliveryLocation.address;
      orderPayload.delivery_latitude = bill.deliveryLocation.latitude;
      orderPayload.delivery_longitude = bill.deliveryLocation.longitude;
    }

    try {
      const order = await saveOrderWithRetry(orderPayload);

      const orderItems = bill.items.map(i => ({
        order_ref: order.id,
        item_name: i.name,
        qty: i.qty,
        price: i.price
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        throw itemsError;
      }

      const confirmedBill = {
        ...bill,
        id: order.order_id || bill.id
      };

      setBill(confirmedBill);
      setSaved(true);
      clearCartStorage();
      setCart([]);
      setName("");
      setPhone("");
      showAlert("success", "Order Confirmed!", "Your order has been successfully placed. Returning to booking page in 10 seconds.", 10000);

      resetTimer.current = setTimeout(() => {
        setBill(null);
        setSaved(false);
        setCategory("tea");
        setCart([]);
        resetTimer.current = null;
      }, 10000);
    } catch (err) {
      console.error("Confirm order failed:", err);
      showAlert("error", "Order Failed", `Unable to confirm order: ${err?.message || err}`);
    }
  }, [bill, saveOrderWithRetry]);

  // Auto-reorder effects (defined after functions to avoid temporal dead zone)
  useEffect(() => {
    if (!shouldAutoReorder || autoReorderStarted || cart.length === 0 || !name || !phone) return;
    generateBill();
    setAutoReorderStarted(true);
  }, [shouldAutoReorder, autoReorderStarted, cart, name, phone, generateBill]);

  useEffect(() => {
    if (!shouldAutoReorder || !autoReorderStarted || !bill) return;
    confirmOrder();
    setShouldAutoReorder(false);
  }, [shouldAutoReorder, autoReorderStarted, bill, confirmOrder]);

  return (
    <div className="container py-4 booking-page">

      <div className="booking-header mb-4">
        <div>
          <p className="booking-subtitle">Fresh food, faster checkout</p>
          <h1 className="booking-title">Order Food</h1>
        </div>
      </div>

      <div className="booking-top">
        <input
          className="form-control booking-input"
          placeholder="Enter your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="form-control booking-input"
          placeholder="Enter your phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <label className="delivery-location-option">
          <input
            type="checkbox"
            className="delivery-location-toggle"
            checked={useDeliveryLocation}
            onChange={toggleDeliveryLocation}
          />
          <span>
            <strong>{useDeliveryLocation ? "Change delivery location" : "Current location selected"}</strong>
            <small>
              {locationLoading ? "Finding your location..." : deliveryLocation?.address || "Allow location access to select your current location"}
            </small>
          </span>
        </label>
      </div>

      <div className="category-tabs mb-4">
        {categories.map(cat => (
          <button
            key={cat.value}
            type="button"
            className={`category-tab ${category === cat.value ? "active" : ""}`}
            onClick={() => setCategory(cat.value)}
          >
            <span className="category-thumb">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-state">No items available in this category yet.</div>
      )}

      {/* 🔥 SAME UI STRUCTURE PRESERVED */}
      <div className="food-grid">
        {items.map(item => {
        const cartItem = cart.find(x => x.id === item.id);

        return (
          <div className="food-card" key={item.id}>
            <div className="food-card-row">
              <div className="food-card-details">
                <div className="food-card-title">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="food-item-image" />
                  ) : getIcon(item.name) ? (
                    <img src={getIcon(item.name)} alt={item.name} className="food-item-image" />
                  ) : (
                    <span className="food-item-fallback">🍽️</span>
                  )}
                  <h6>{item.name}</h6>
                </div>
                <small>₹{item.price}</small>
              </div>

              {!cartItem ? (
                <button
                  type="button"
                  className="add-main-btn"
                  onClick={() => addToCart(item)}
                >
                  ADD
                </button>
              ) : (
                <div className="qty-box">
                  <button type="button" onClick={() => decreaseItem(item)}>−</button>
                  <span>{cartItem.qty}</span>
                  <button type="button" onClick={() => increaseItem(item)}>+</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>

      {/* CART BAR */}
      {cart.length > 0 && !bill && (
        <div className="cart-bar">
          <div>
            ₹{total}
            <div className="small">{cart.length} items</div>
          </div>

          <div className="cart-actions">
            <button type="button" className="btn btn-outline-light clear-cart-btn" onClick={clearCart}>
              Clear
            </button>
            <button type="button" onClick={generateBill} className="btn btn-light">
              Proceed →
            </button>
          </div>
        </div>
      )}

      {mapOpen && mapPosition && (
        <div className="modal-overlay">
          <div className="location-modal">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h4>Pin delivery location</h4>
                <p className="text-muted mb-0">Move the pin to the exact place where we should deliver.</p>
              </div>
              <button type="button" className="close-btn" onClick={cancelMapLocation}>×</button>
            </div>
            <DeliveryMap position={mapPosition} onPositionChange={setMapPosition} interactive />
            <div className="selected-location-summary">
              <span className="selected-location-icon" aria-hidden="true">●</span>
              <div>
                <strong>Selected location</strong>
                <p>{deliveryLocation?.address || "Location selected on map"}</p>
              </div>
            </div>
            <div className="location-modal-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={cancelMapLocation}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={confirmMapLocation}>Use this location</button>
            </div>
          </div>
        </div>
      )}

      {bill && (
        <div className="modal-overlay">
          <div className="modal-box-pro">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div className="bill-header">
                <div className="bill-top-row">
                  <h4>Order Bill</h4>
                  {saved && <span className="badge bill-badge">Confirmed</span>}
                </div>
                <div className="text-muted">{bill.date}</div>
              </div>
              <button className="close-btn" onClick={cancelBill}>
                ×
              </button>
            </div>

            <div className="bill-info">
              <p>
                <strong>Order ID</strong><br />
                {bill.id}
              </p>
              <p>
                <strong>Name</strong><br />
                {bill.name}
              </p>
              <p>
                <strong>Phone</strong><br />
                {bill.phone}
              </p>
              {bill.deliveryLocation && (
                <p className="bill-location">
                  <strong>Delivery Location</strong><br />
                  {bill.deliveryLocation.address}
                </p>
              )}
            </div>

            <table className="table bill-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="text-end">{item.qty}</td>
                    <td className="text-end">₹{item.qty * item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bill-total">
              <span>Total</span>
              <span>₹{bill.total}</span>
            </div>

            {saved && (
              <div className="bill-success-box mt-3 mb-2 py-3 px-3 success-animated">
                <div className="balloons">
                  <span className="balloon balloon-1">🎈</span>
                  <span className="balloon balloon-2">🎈</span>
                  <span className="balloon balloon-3">🎉</span>
                  <span className="balloon balloon-4">🎈</span>
                </div>
                <div className="bill-success-title">🎉 Order confirmed successfully!</div>
                <div className="bill-success-text">
                  Your order is confirmed! Please call <strong>+917889308062</strong> for status updates.
                </div>
              </div>
            )}

            <div className="mt-3 d-flex gap-2">
              <button type="button" className="btn btn-secondary flex-grow-1" onClick={downloadBill}>
                Download PDF
              </button>
              <button type="button" className="btn btn-danger flex-grow-1" onClick={cancelBill}>
                {saved ? 'Close' : 'Cancel Order'}
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary w-100 mt-3"
              onClick={confirmOrder}
              disabled={saved}
            >
              {saved ? 'Order Confirmed' : 'Confirm Order'}
            </button>

            {saved && bill?.id && (
              <div className="mt-3 text-center">
                <p className="mb-2">Your order is confirmed. Track status with the button below.</p>
                <Link to={`/track/${encodeURIComponent(bill.id)}`} className="btn btn-outline-primary">
                  Check Order Status
                </Link>
              </div>
            )}

            <div className="bill-footer mt-3 text-center">
              Download the bill or cancel the order if you want to make changes.
            </div>
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