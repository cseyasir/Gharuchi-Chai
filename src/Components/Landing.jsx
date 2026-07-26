import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./Landing.css";

export default function Landing() {
  const [popularItems, setPopularItems] = useState([]);

  useEffect(() => {
    fetchPopularItems();
  }, []);

  const fetchPopularItems = async () => {
    try {
      // Fetch popular items from database - you can add a 'is_popular' field to menu table
      // For now, we'll fetch some items from different categories
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .eq("is_active", true)
        .in("name", ["Nagro Special Tea", "Tuja (Roaster Meat)", "Orange Juice", "Lemon Tea", "Veg Sandwich", "Patties"]);

      if (error) {
        console.error("Error fetching popular items:", error);
        // Fallback to static data if database fetch fails
        setPopularItems([
          { name: "Nagro Special Tea", price: 45, description: "Spiced and milky tea with masala and warmth." },
          { name: "Tuja Roaster Meat", price: 95, description: "Juicy roasted meat seasoned with local spices." },
          { name: "Orange Juice", price: 39, description: "Freshly squeezed and naturally sweet." },
          { name: "Lemon Tea", price: 55, description: "Refreshing citrus tea with a bright zing." },
          { name: "Veg Sandwich", price: 75, description: "Crispy sandwich loaded with fresh vegetables and chutney." },
          { name: "Patties", price: 65, description: "Warm flaky pastry stuffed with savory filling." }
        ]);
        return;
      }

      setPopularItems(data || []);
    } catch (error) {
      console.error("Error fetching popular items:", error);
      // Fallback to static data
      setPopularItems([
        { name: "Nagro Special Tea", price: 45, description: "Spiced and milky tea with masala and warmth." },
        { name: "Tuja Roaster Meat", price: 95, description: "Juicy roasted meat seasoned with local spices." },
        { name: "Orange Juice", price: 39, description: "Freshly squeezed and naturally sweet." },
        { name: "Lemon Tea", price: 55, description: "Refreshing citrus tea with a bright zing." },
        { name: "Veg Sandwich", price: 75, description: "Crispy sandwich loaded with fresh vegetables and chutney." },
        { name: "Patties", price: 65, description: "Warm flaky pastry stuffed with savory filling." }
      ]);
    }
  };

  return (
    <div className="landing-page">
      <section className="landing-hero d-flex align-items-center">
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-lg-6 text-white hero-copy">
              <span className="hero-badge">Fresh, warm, handmade</span>
              <h1 className="display-4 mt-3">GarxechChai</h1>
              <p className="lead text-light mt-3">
                A local chai house experience with fast ordering, live order tracking and delicious street-style meals.
              </p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <Link to="/booking" className="btn btn-warning btn-lg hero-btn">
                  Order Now
                </Link>
                <a href="#menu" className="btn btn-outline-light btn-lg hero-btn">
                  View Menu
                </a>
                <a href="/app-release.apk" className="btn btn-success btn-lg hero-btn" download="app-release.apk">
                  Download App
                </a>
              </div>
            </div>
            <div className="col-lg-6 mt-4 mt-lg-0">
              <div className="hero-card shadow-lg">
                <div className="hero-card-top">
                  <span>Daily Special</span>
                  <strong>Tea + Snack Combo</strong>
                </div>
                <div className="hero-card-body">
                  <div className="hero-food-item">
                    <div>
                      <h6>Nagro Special Tea</h6>
                      <small>Classic Kashmiri chai blend</small>
                    </div>
                    <span>₹45</span>
                  </div>
                  <div className="hero-food-item">
                    <div>
                      <h6>Roaster Meat</h6>
                      <small>Spiced slow-cooked delight</small>
                    </div>
                    <span>₹95</span>
                  </div>
                  <div className="hero-food-item">
                    <div>
                      <h6>Orange Juice</h6>
                      <small>Freshly squeezed</small>
                    </div>
                    <span>₹39</span>
                  </div>
                  <div className="hero-card-footer">
                    <p className="mb-0">Fresh food, served fast. Track your order from kitchen to delivery.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features py-5" id="about">
        <div className="container">
          <div className="row text-center gy-4">
            <div className="col-md-4">
              <div className="feature-card p-4 h-100 shadow-sm rounded">
                <div className="feature-icon">☕</div>
                <h5 className="mt-3">Authentic Chai</h5>
                <p>Enjoy rich, aromatic tea made with our special spice blend and fresh milk.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card p-4 h-100 shadow-sm rounded">
                <div className="feature-icon">📦</div>
                <h5 className="mt-3">Live Tracking</h5>
                <p>Order status updates from kitchen preparation to dispatched and completed.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card p-4 h-100 shadow-sm rounded">
                <div className="feature-icon">✨</div>
                <h5 className="mt-3">Fast Delivery</h5>
                <p>Quick checkout and fast delivery ensures your food stays warm and delicious.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-menu py-5" id="menu">
        <div className="container">
          <div className="section-header text-center mb-5">
            <span className="subtitle">Our Menu</span>
            <h2>Popular items we recommend</h2>
          </div>
          <div className="row g-4 justify-content-center">
            {popularItems.map((item, index) => (
              <div className="col-md-4" key={item.id || index}>
                <div className="menu-card p-4 rounded shadow-sm">
                  <div className="menu-price">₹{item.price}</div>
                  <h5>{item.name}</h5>
                  <p>{item.description || "Delicious and fresh."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta py-5">
        <div className="container text-center text-white py-5 rounded-4 shadow-lg cta-card">
          <h2>Ready for a comforting meal?</h2>
          <p className="mb-4">Order now and experience GarxechChai on your table with live order tracking.</p>
          <Link to="/booking" className="btn btn-warning btn-lg">
            Start Your Order
          </Link>
        </div>
      </section>
    </div>
  );
}
