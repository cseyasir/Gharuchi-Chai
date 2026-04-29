import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Booking from "./Components/Booking";
import Admin from "./Components/Admin";
import AdminLogin from "./Components/AdminLogin";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function App() {
  return (
    
    <BrowserRouter>
    <Header/>
      <Routes>
        
        <Route path="/" element={<Booking />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<AdminLogin />} />
      </Routes>
      <Footer/>
    </BrowserRouter>
  );
}

export default App;