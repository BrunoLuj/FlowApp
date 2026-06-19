const QUEUE_KEY = "flowapp_mobile_sync_queue";
const ORDERS_KEY = "flowapp_mobile_cached_orders";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export const createEventKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const getMobileQueue = () => readJson(QUEUE_KEY, []);

export const queueMobileEvent = (event) => {
  const queue = getMobileQueue();
  if (!queue.some((item) => item.event_key === event.event_key)) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, event]));
  }
  window.dispatchEvent(new Event("flowapp-mobile-queue-change"));
};

export const removeMobileEvent = (eventKey) => {
  localStorage.setItem(
    QUEUE_KEY,
    JSON.stringify(getMobileQueue().filter((item) => item.event_key !== eventKey))
  );
  window.dispatchEvent(new Event("flowapp-mobile-queue-change"));
};

export const cacheMobileOrders = (orders) =>
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

export const getCachedMobileOrders = () => readJson(ORDERS_KEY, []);
