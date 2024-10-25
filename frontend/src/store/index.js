import { create } from "zustand";

const useStore = create((set) =>({
    theme: localStorage.getItem("theme") ?? "light",
    user: JSON.parse(localStorage.getItem("user")) ?? null,

    setTheme: (value) => set({ theme: value}),
    setCredentials: (user) => set({ user }),
    signOut: () => {
        set({ user: null });
        localStorage.removeItem("user");
    },

}));

export default useStore;