import { create } from "zustand";
import { jwtDecode } from 'jwt-decode';
import i18n from 'i18next';

const useStore = create((set) => {
    const user = JSON.parse(localStorage.getItem("user")) || null;
    const token = localStorage.getItem("token");
    const language = localStorage.getItem("language") || 'en';

    let permissions = [];
    if (token) {
        const decodedToken = jwtDecode(token);
        permissions = decodedToken.permissions || [];
    }

    const checkTokenExpiration = (token) => {
        if (!token) return false;
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        return decodedToken.exp < currentTime;
    };

    const signOut = () => {
        set({ user: null, permissions: [], language: 'en' });
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("language");
    };

    const handleUserUpdate = (newUser) => {
        if (newUser && newUser.token) {
            if (checkTokenExpiration(newUser.token)) {
                console.log("Token je istekao. Korisnik se odjavljuje.");
                signOut();
            } else {
                const decodedToken = jwtDecode(newUser.token);
                set({ permissions: decodedToken.permissions || [] });
                localStorage.setItem("token", newUser.token);
                localStorage.setItem("user", JSON.stringify(newUser));
            }
        }
    };

    return {
        theme: localStorage.getItem("theme") ?? "light",
        user,
        permissions,
        language,

        setTheme: (value) => set({ theme: value }),
        setCredentials: (newUser) => {
            set({ user: newUser });
            handleUserUpdate(newUser);
        },
        updateCredentials: (updatedUser) => {
            set((state) => {
                const newUser = {
                    ...state.user,
                    ...updatedUser,
                };
                handleUserUpdate(newUser);
                return { user: newUser };
            });
        },
        setLanguage: (newLanguage) => {
            set({ language: newLanguage });
            localStorage.setItem("language", newLanguage);
            i18n.changeLanguage(newLanguage);
        },
        signOut,
    };
});

export default useStore;
