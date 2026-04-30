import React, { useState } from "react";
import "./Contact.css";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState("idle");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setStatus("error");
      return;
    }
    setStatus("success");
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="contact-page py-5">
      <div className="container">
        <div className="contact-hero text-center mb-5">
          <span className="contact-label">Contact Us</span>
          <h1>Reach out to GaruhChai</h1>
          <p className="text-muted mx-auto contact-subtitle">
            Have a question, feedback, or want to place a custom order? Send us a message and we will
            get back to you shortly.
          </p>
        </div>

        <div className="row g-4 mb-5">
          <div className="col-lg-3 col-sm-6">
            <div className="contact-card p-4 h-100">
              <h5>Visit Us</h5>
              <p>Zangulpora, Devsar Kulgam</p>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="contact-card p-4 h-100">
              <h5>Call Us</h5>
              <p>+91 78893 08062</p>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="contact-card p-4 h-100">
              <h5>Email</h5>
              <p>support@garuhchai.com</p>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="contact-card p-4 h-100">
              <h5>Open Hours</h5>
              <p>08:00 AM - 10:00 PM</p>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="contact-form-card p-4 shadow-sm rounded">
              <h2>Send a message</h2>
              <p className="text-muted">
                Drop your details below and we will respond within a few hours.
              </p>

              {status === "success" && (
                <div className="alert alert-success">Thanks for reaching out! We'll contact you soon.</div>
              )}
              {status === "error" && (
                <div className="alert alert-danger">Please fill in your name, email and message.</div>
              )}

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Your name"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Optional phone number"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    className="form-control"
                    rows="5"
                    placeholder="Tell us what you'd like to order or ask..."
                  />
                </div>
                <button type="submit" className="btn btn-warning btn-lg w-100">
                  Send Message
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="contact-map-card p-4 shadow-sm rounded h-100">
              <h2>Our location</h2>
              <p className="text-muted mb-4">
                Find GaruhChai on the map and plan your visit today.
              </p>
              <div className="map-wrapper rounded overflow-hidden">
                <iframe
                  title="GaruhChai location"
                  src="https://www.google.com/maps?q=33.636417,75.064694&output=embed"
                  width="100%"
                  height="330"
                  style={{ border: 0, minHeight: 350 }}
                  allowFullScreen
                  aria-hidden={false}
                  tabIndex={0}
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
