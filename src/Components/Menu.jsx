import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./Menu.css";

const categoryLabels = {
  tea: "Tea",
  meal: "Meal",
  juice: "Juice",
  roaster: "Roaster"
};

const getIcon = (name) => {
  const icons = {
    "Nagro Special Tea": "https://img.icons8.com/fluency/48/000000/tea.png",
    "Noon Chai": "https://img.icons8.com/fluency/48/000000/tea.png",
    Lipton: "https://img.icons8.com/fluency/48/000000/tea.png",
    "Lemon Tea": "https://img.icons8.com/fluency/48/000000/lemon.png",
    "Mint Tea": "https://img.icons8.com/fluency/48/000000/tea.png",
    Coffee: "https://img.icons8.com/fluency/48/000000/coffee-to-go.png",
    Burger: "https://img.icons8.com/fluency/48/000000/hamburger.png",
    Sandwich: "https://img.icons8.com/fluency/48/000000/sandwich.png",
    Patties: "https://img.icons8.com/fluency/48/000000/dumpling.png",
    "Orange Juice": "https://img.icons8.com/fluency/48/000000/orange-juice.png",
    "Mixed Juice": "https://img.icons8.com/fluency/48/000000/juice-cup.png",
    "Apple Juice": "https://img.icons8.com/fluency/48/000000/apple-juice.png",
    "Pineapple Juice": "https://img.icons8.com/fluency/48/000000/pineapple.png",
    "Tuja (Roaster Meat)": "https://img.icons8.com/fluency/48/000000/roast-chicken.png"
  };
  return icons[name] || "https://img.icons8.com/fluency/48/000000/meal.png";
};

export default function Menu() {
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Menu fetch failed:", error);
        setMenuData({});
      } else {
        const grouped = {};
        (data || []).forEach((item) => {
          const category = item.category || "other";
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(item);
        });
        setMenuData(grouped);
      }
      setLoading(false);
    };

    fetchMenu();
  }, []);

  const categories = Object.keys(menuData).sort((a, b) => {
    const order = ["tea", "meal", "juice", "roaster"];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="menu-page py-5">
      <div className="container">
        <div className="menu-hero text-center mb-5">
          <span className="menu-label">Our Menu</span>
          <h1>Delicious items available now</h1>
          <p className="text-muted">
            Browse the full GaruhChai menu and click the button below to start ordering.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-5">Loading menu...</div>
        ) : (
          <>
            {categories.length === 0 ? (
              <div className="text-center text-muted py-5">No menu items are available right now.</div>
            ) : (
              categories.map((category) => (
                <div key={category} className="menu-category mb-5">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h2>{categoryLabels[category] || category}</h2>
                      <p className="text-muted mb-0">Popular {categoryLabels[category] || category} options.</p>
                    </div>
                  </div>
                  <div className="row g-4">
                    {menuData[category].map((item) => (
                      <div key={item.id} className="col-md-4">
                        <div className="menu-card p-4 h-100 shadow-sm rounded">
                          <div className="menu-card-icon mb-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} />
                            ) : (
                              <img src={getIcon(item.name)} alt={item.name} />
                            )}
                          </div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <h5>{item.name}</h5>
                            </div>
                            <div className="menu-price">₹{item.price}</div>
                          </div>
                          <p className="text-muted mb-0">
                            {item.description || "Freshly prepared and ready to order."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        <div className="text-center mt-4">
          <Link to="/booking" className="btn btn-warning btn-lg">
            Order Now
          </Link>
        </div>
      </div>
    </div>
  );
}
