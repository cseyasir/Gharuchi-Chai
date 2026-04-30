import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";
import "./Booking.css";

export default function Booking() {
  const [menuData, setMenuData] = useState({});
  const [category, setCategory] = useState("tea");
  const [cart, setCart] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bill, setBill] = useState(null);
  const resetTimer = useRef(null);

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

  // 🔥 FETCH MENU FROM DB (ONLY CHANGE)
  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const fetchMenu = async () => {
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
  };

  const items = menuData[category] || [];

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

  const categories = [
    { value: "tea", label: "Tea" },
    { value: "meal", label: "Meal" },
    { value: "juice", label: "Juice" },
    { value: "roaster", label: "Roaster" },
  ];

  const categoryIcons = {
    tea: "☕",
    meal: "🍔",
    juice: "🥤",
    roaster: "🍖"
  };

  const total = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

  const generateOrderId = () => {
    let c = parseInt(localStorage.getItem("orderCounter") || "0") + 1;
    localStorage.setItem("orderCounter", c);
    const d = new Date();
    return `ORD${d.getMonth()+1}${d.getFullYear().toString().slice(-2)}/${c}`;
  };

  const [saved, setSaved] = useState(false);

  const generateBill = () => {
    if (!name || !phone || cart.length === 0) {
      alert("Enter name, phone number & select items");
      return;
    }

    const newBill = {
      id: generateOrderId(),
      name,
      phone,
      items: cart,
      total,
      date: new Date().toLocaleString()
    };

    setBill(newBill);
    setSaved(false);
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Clear your cart and start again?")) {
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
    doc.text("GaruhChai", leftMargin, 48);

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

    doc.save(`GaruhChai-Bill-${bill.id}.pdf`);
  };

  const confirmOrder = async () => {
    if (!bill) return;

    const orderPayload = {
      order_id: bill.id,
      customer_name: bill.name,
      total: bill.total,
      status: 'pending'
    };
    if (bill.phone) {
      orderPayload.customer_phone = bill.phone;
    }

    try {
      let { data: order, error } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      if (error || !order) {
        const unknownField = error?.details?.includes('customer_phone') || error?.message?.includes('customer_phone');
        if (unknownField) {
          const retryPayload = {
            order_id: bill.id,
            customer_name: bill.name,
            total: bill.total,
            status: 'pending'
          };
          const { data: retryOrder, error: retryError } = await supabase
            .from("orders")
            .insert([retryPayload])
            .select()
            .single();

          if (retryError || !retryOrder) {
            console.error("Retry without phone failed:", retryError);
            throw retryError || new Error("Order save failed after retry");
          }
          alert("Order saved, but customer_phone column is missing in the database. Add it to store phone numbers.");
          order = retryOrder;
        } else {
          console.error("Order save error:", error);
          throw error || new Error("Order save failed");
        }
      }

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

      setSaved(true);
      setCart([]);
      alert("Order confirmed! Returning to booking page in 10 seconds.");

      resetTimer.current = setTimeout(() => {
        setBill(null);
        setSaved(false);
        setName("");
        setPhone("");
        setCategory("tea");
        setCart([]);
        resetTimer.current = null;
      }, 10000);
    } catch (err) {
      console.error("Confirm order failed:", err);
      alert(`Unable to confirm order: ${err?.message || err}`);
    }
  };



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
      </div>

      <div className="category-tabs mb-4">
        {categories.map(cat => (
          <button
            key={cat.value}
            type="button"
            className={`category-tab ${category === cat.value ? "active" : ""}`}
            onClick={() => setCategory(cat.value)}
          >
            <span className="category-thumb">{categoryIcons[cat.value]}</span>
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

    </div>
  );
}