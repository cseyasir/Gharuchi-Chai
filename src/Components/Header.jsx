import React from "react";
import "./header.css";
import { Link } from "react-router-dom";
export default function Header() {
  return (
    <nav className="navbar navbar-expand-lg custom-navbar px-4 px-lg-5">

      {/* LOGO */}
      <Link to="/" className="navbar-brand d-flex align-items-center">
        <span className="logo-icon">🍴</span>
        <h1 className="m-0 logo-text">GarxechChai</h1>
     </Link>

      {/* TOGGLER */}
      <button
        className="navbar-toggler"
        data-bs-toggle="collapse"
        data-bs-target="#navbarCollapse"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      {/* MENU */}
      <div className="collapse navbar-collapse" id="navbarCollapse">
        <div className="navbar-nav ms-auto py-0 pe-4 nav-center">

          <Link to="/" className="nav-item nav-link">Home</Link>
          <Link to="/menu" className="nav-item nav-link">Menu</Link>
          <Link to="/contact" className="nav-item nav-link">Contact</Link>
        </div>

        {/* BUTTON */}
        <Link to="/booking" className="btn btn-warning px-4 py-2 ms-lg-3 book-btn">
          Book Our Service
        </Link>
      </div>

    </nav>
  );
}