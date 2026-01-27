import type { User } from "@/types/auth";
import { create } from "zustand";

type Auth = {
	user: User | null;
	login: (user: User) => void;
	logout: () => void;
}

export const useAuth = create<Auth>((set) => ({
	user: null,
	login: (user) => set({ user: user }),
	logout: () => set({ user: null }),
}));
