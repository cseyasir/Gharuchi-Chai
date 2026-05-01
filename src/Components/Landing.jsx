import React from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
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
            <div className="col-md-4">
              <div className="menu-card p-4 rounded shadow-sm">
                <div className="menu-price">₹45</div>
                <h5>Nagro Special Tea</h5>
                <p>Spiced and milky tea with masala and warmth.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="menu-card p-4 rounded shadow-sm">
                <div className="menu-price">₹95</div>
                <h5>Tuja Roaster Meat</h5>
                <p>Juicy roasted meat seasoned with local spices.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="menu-card p-4 rounded shadow-sm">
                <div className="menu-price">₹39</div>
                <h5>Orange Juice</h5>
                <p>Freshly squeezed and naturally sweet.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="menu-card p-4 rounded shadow-sm">
                <div className="menu-price">₹55</div>
                <h5>Lemon Tea</h5>
                <p>Refreshing citrus tea with a bright zing.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="menu-card p-4 rounded shadow-sm">
                <div className="menu-price">₹75</div>
                <h5>Veg Sandwich</h5>
                <p>Crispy sandwich loaded with fresh vegetables and chutney.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="menu-card p-4 rounded shadow-sm">
                <div className="menu-price">₹65</div>
                <h5>Patties</h5>
                <p>Warm flaky pastry stuffed with savory filling.</p>
              </div>
            </div>
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
