import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Landing from "./Components/Landing";
import Menu from "./Components/Menu";
import Booking from "./Components/Booking";
import Contact from "./Components/Contact";
import Admin from "./Components/Admin";
import AdminLogin from "./Components/AdminLogin";
import OrderStatus from "./Components/OrderStatus";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/track/*" element={<OrderStatus />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<AdminLogin />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;