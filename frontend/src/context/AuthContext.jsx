import { useCallback, useMemo, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "./auth-context";

const DEV_BYPASS_EMAIL = "dev@123";
const DEV_BYPASS_PASSWORD = "123456";

const parseStoredUser = () => {
	try {
		const raw = localStorage.getItem("user");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

export function AuthProvider({ children }) {
	const [token, setToken] = useState(
		() => localStorage.getItem("token") || null,
	);
	const [user, setUser] = useState(parseStoredUser);

	const persistSession = useCallback((nextToken, nextUser) => {
		localStorage.setItem("token", nextToken);
		localStorage.setItem("user", JSON.stringify(nextUser || null));
		setToken(nextToken);
		setUser(nextUser || null);
	}, []);

	const clearSession = useCallback(() => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setToken(null);
		setUser(null);
	}, []);

	const signup = useCallback(
		async (payload) => {
			const { data } = await api.post("/auth/register", payload);
			const nextToken = data?.token;
			if (!nextToken) throw new Error("Missing auth token in response");
			persistSession(nextToken, data?.user);
			return data;
		},
		[persistSession],
	);

	const login = useCallback(
		async (payload) => {
			// Development-only bypass for local UI testing without backend auth.
			if (
				import.meta.env.DEV &&
				payload?.email === DEV_BYPASS_EMAIL &&
				payload?.password === DEV_BYPASS_PASSWORD
			) {
				const devUser = {
					name: "Developer",
					email: DEV_BYPASS_EMAIL,
					role: "developer",
				};

				persistSession("dev-local-token", devUser);

				return {
					token: "dev-local-token",
					user: devUser,
					bypass: true,
				};
			}

			const { data } = await api.post("/auth/login", payload);
			const nextToken = data?.token;
			if (!nextToken) throw new Error("Missing auth token in response");
			persistSession(nextToken, data?.user);
			return data;
		},
		[persistSession],
	);

	const logout = useCallback(() => {
		clearSession();
	}, [clearSession]);

	const value = useMemo(
		() => ({
			token,
			user,
			signup,
			login,
			logout,
			isAuthenticated: Boolean(token),
		}),
		[login, logout, signup, token, user],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
