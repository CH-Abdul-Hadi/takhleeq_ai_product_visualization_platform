const STORAGE_KEY = "aiDesignOwnershipByUser";

const parseStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistStore = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const resolveUserKey = (user) => {
  if (!user) return null;
  return String(user.id || user.user_id || user.email || user.username || "");
};

export const designOwnershipService = {
  resolveUserKey,

  addOwnedDesign(user, designId) {
    const userKey = resolveUserKey(user);
    if (!userKey || !designId) return;
    const store = parseStore();
    const owned = new Set(store[userKey] || []);
    owned.add(Number(designId));
    store[userKey] = [...owned];
    persistStore(store);
  },

  getOwnedDesignIds(user) {
    const userKey = resolveUserKey(user);
    if (!userKey) return [];
    const store = parseStore();
    return Array.isArray(store[userKey]) ? store[userKey].map(Number) : [];
  },
};
