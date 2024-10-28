import { create } from "zustand";
import { jwtDecode } from 'jwt-decode';

const useStore = create((set) => {
    // Prvo učitaj korisničke podatke i token iz localStorage
    const user = JSON.parse(localStorage.getItem("user")) || null;
    const token = localStorage.getItem("token");

    let permissions = [];
    // Ako postoji token, dekodiraj ga i uzmi dozvole
    if (token) {
        const decodedToken = jwtDecode(token);
        permissions = decodedToken.permissions || [];
    }

    return {
        theme: localStorage.getItem("theme") ?? "light",
        user,
        permissions,

        setTheme: (value) => set({ theme: value }),
        setCredentials: (user) => {
            set({ user });
            // Kada se korisnik prijavi, učitaj i njegove dozvole iz tokena
            if (user && user.token) {
                const decodedToken = jwtDecode(user.token);
                set({ permissions: decodedToken.permissions || [] });
                localStorage.setItem("token", user.token); // Sačuvaj token
            }
        },
        signOut: () => {
            set({ user: null, permissions: [] }); // Resetuj i dozvole
            localStorage.removeItem("user");
            localStorage.removeItem("token"); // Opcionalno, obriši token
        },
    };
});

export default useStore;
