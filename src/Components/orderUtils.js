const USER_ID_STORAGE_KEY = "garuchhai_user_id";
const CART_STORAGE_KEY = "garuchhai_cart";
const USER_PHONE_STORAGE_KEY = "garuchhai_user_phone";
const USER_NAME_STORAGE_KEY = "garuchhai_user_name";

export const getOrCreateUserId = () => {
  if (typeof window === "undefined") return null;
  let userId = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!userId) {
    userId = `user_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }
  return userId;
};

export const getCartFromStorage = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading stored cart:", error);
    return [];
  }
};

export const saveCartToStorage = (cart) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart || []));
  } catch (error) {
    console.error("Error saving cart to storage:", error);
  }
};

export const savePhoneToStorage = (phone) => {
  if (typeof window === "undefined") return;
  try {
    if (!phone) {
      localStorage.removeItem(USER_PHONE_STORAGE_KEY);
    } else {
      localStorage.setItem(USER_PHONE_STORAGE_KEY, phone);
    }
  } catch (error) {
    console.error("Error saving phone to storage:", error);
  }
};

export const getPhoneFromStorage = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(USER_PHONE_STORAGE_KEY) || "";
  } catch (error) {
    console.error("Error reading phone from storage:", error);
    return "";
  }
};

export const saveNameToStorage = (name) => {
  if (typeof window === "undefined") return;
  try {
    if (!name) {
      localStorage.removeItem(USER_NAME_STORAGE_KEY);
    } else {
      localStorage.setItem(USER_NAME_STORAGE_KEY, name);
    }
  } catch (error) {
    console.error("Error saving name to storage:", error);
  }
};

export const getNameFromStorage = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(USER_NAME_STORAGE_KEY) || "";
  } catch (error) {
    console.error("Error reading name from storage:", error);
    return "";
  }
};

export const clearCartStorage = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
};

export const getRecommendedItemName = (orders = [], fallbackItemName = null) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return fallbackItemName || null;
  }

  const itemTotals = {};

  orders.forEach((order) => {
    const items = Array.isArray(order?.order_items) ? order.order_items : [];

    items.forEach((item) => {
      const itemName = (item?.item_name || item?.name || "").trim();
      if (!itemName) return;

      const qty = Number(item?.qty ?? 1) || 1;
      itemTotals[itemName] = (itemTotals[itemName] || 0) + qty;
    });
  });

  if (Object.keys(itemTotals).length === 0) {
    return fallbackItemName || null;
  }

  const [recommendedItemName] = Object.entries(itemTotals).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0];

  return recommendedItemName || fallbackItemName || null;
};
