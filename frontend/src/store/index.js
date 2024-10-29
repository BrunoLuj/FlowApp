import { create } from "zustand";
import { jwtDecode } from 'jwt-decode';

const useStore = create((set) => {

    const user = JSON.parse(localStorage.getItem("user")) || null;
    const token = localStorage.getItem("token");

    let permissions = [];

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
                localStorage.setItem("token", user.token);
                localStorage.setItem("user", JSON.stringify(user));
            }
        },
        setCredentials: (updatedUser) => {
            set((state) => {
                const newUser = {
                    ...state.user,
                    ...updatedUser,
                };
                const decodedToken = jwtDecode(newUser.token);
                set({ permissions: decodedToken.permissions || [] });
                localStorage.setItem("user", JSON.stringify(newUser));
                localStorage.setItem("token", user.token);
                return { user: newUser };
            });
        },
        signOut: () => {
            set({ user: null, permissions: [] });
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        },
    };
});

export default useStore;
