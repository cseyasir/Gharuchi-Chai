import React from "react";
import "./header.css";
import { Link } from "react-router-dom";
import line from "./line.png"; // Ensure you have a line image at this path or update the path accordingly
import logo from "./logo192.png"; // Ensure you have a logo image at this path or update the path accordingly
export default function Header() {
  return (
    <nav className="navbar navbar-expand-lg custom-navbar px-4 px-lg-5">

      {/* LOGO */}
      <Link to="/" className="navbar-brand">
        <img src={logo} alt="GarxechChai" className="logo-icon" />
        <div className="logo-wrapper">
    <span className="logo-text">
  Garxech<span className="chai-text">Chai</span>
</span>
    
    <img src={line} alt="" className="logo-curve" />
  </div>
      
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
          <Link to="/orders" className="nav-item nav-link">My Orders</Link>
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