import { create } from "zustand";
import { jwtDecode } from 'jwt-decode';

const useStore = create((set) => ({
    theme: localStorage.getItem("theme") ?? "light",
    user: JSON.parse(localStorage.getItem("user")) ?? null,
    permissions: [], // Dodaj polje za dozvole

    setTheme: (value) => set({ theme: value }),
    setCredentials: (user) => {
        set({ user });
        // Kada se korisnik prijavi, učitaj i njegove dozvole iz tokena
        if (user && user.token) {
            const decodedToken = jwtDecode(user.token);
            set({ permissions: decodedToken.permissions || [] });
        }
    },
    signOut: () => {
        set({ user: null, permissions: [] }); // Resetuj i dozvole
        localStorage.removeItem("user");
        localStorage.removeItem("token"); // Opcionalno, obriši token
    },
}));

export default useStore;
