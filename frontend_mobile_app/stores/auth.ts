import { User } from "@/types/entities";
import { create } from "zustand";

type AuthState = {
	user: User | null;
	token: string;
	login: (user: User, token: string) => void;
	logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
	user: null,
	token: "",
	login: (user, token) => set({ user, token }),
	logout: () => set({ user: null, token: "" }),
}));

