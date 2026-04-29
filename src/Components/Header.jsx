import React from "react";
import "./header.css";

export default function Header() {
  return (
    <nav className="navbar navbar-expand-lg custom-navbar px-4 px-lg-5">

      {/* LOGO */}
      <a href="#" className="navbar-brand d-flex align-items-center">
        <span className="logo-icon">🍴</span>
        <h1 className="m-0 logo-text">GaruhChai</h1>
      </a>

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

          <a href="#" className="nav-item nav-link">Home</a>
          <a href="#" className="nav-item nav-link active">About</a>
          <a href="#" className="nav-item nav-link">Service</a>
          <a href="#" className="nav-item nav-link">Menu</a>

          <div className="nav-item dropdown">
            <a href="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown">
              Pages
            </a>
            <div className="dropdown-menu">
              <a href="#" className="dropdown-item">Booking</a>
              <a href="#" className="dropdown-item">Team</a>
              <a href="#" className="dropdown-item">Testimonial</a>
            </div>
          </div>

          <a href="#" className="nav-item nav-link">Contact</a>
        </div>

        {/* BUTTON */}
        <a href="#" className="btn btn-warning px-4 py-2 ms-lg-3 book-btn">
          Book Our Service
        </a>
      </div>

    </nav>
  );
}