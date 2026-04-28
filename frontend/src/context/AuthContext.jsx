import { useCallback, useMemo, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "./auth-context";

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

	const extractTokenFromResponse = useCallback((data) => {
		return (
			data?.token ||
			data?.accessToken ||
			data?.jwt ||
			data?.data?.token ||
			data?.data?.accessToken ||
			null
		);
	}, []);

	const extractUserFromResponse = useCallback((data) => {
		return data?.user || data?.data?.user || null;
	}, []);

	const persistSession = useCallback((nextToken, nextUser) => {
		localStorage.setItem("token", nextToken);
		localStorage.setItem("user", JSON.stringify(nextUser || null));
		setToken(nextToken);
		setUser(nextUser || null);
	}, []);

	const hydrateSessionFromToken = useCallback(
		async (nextToken, fallbackUser = null) => {
			try {
				const { data } = await api.get("/auth/me", {
					headers: { Authorization: `Bearer ${nextToken}` },
				});
				const hydratedUser = data?.user || fallbackUser || null;
				persistSession(nextToken, hydratedUser);
				return hydratedUser;
			} catch {
				if (fallbackUser) {
					persistSession(nextToken, fallbackUser);
					return fallbackUser;
				}
				throw new Error("Unable to establish authenticated session");
			}
		},
		[persistSession],
	);

	const clearSession = useCallback(() => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		setToken(null);
		setUser(null);
	}, []);

	const signup = useCallback(
		async (payload) => {
			const { data } = await api.post("/auth/register", payload);
			const nextToken = extractTokenFromResponse(data);
			if (!nextToken) throw new Error("Missing auth token in response");
			const nextUser = extractUserFromResponse(data);
			if (nextUser) {
				persistSession(nextToken, nextUser);
			} else {
				await hydrateSessionFromToken(nextToken);
			}
			return data;
		},
		[
			extractTokenFromResponse,
			extractUserFromResponse,
			hydrateSessionFromToken,
			persistSession,
		],
	);

	const login = useCallback(
		async (payload) => {
			const { data } = await api.post("/auth/login", payload);
			const nextToken = extractTokenFromResponse(data);
			if (!nextToken) throw new Error("Missing auth token in response");
			const nextUser = extractUserFromResponse(data);
			if (nextUser) {
				persistSession(nextToken, nextUser);
			} else {
				await hydrateSessionFromToken(nextToken);
			}
			return data;
		},
		[
			extractTokenFromResponse,
			extractUserFromResponse,
			hydrateSessionFromToken,
			persistSession,
		],
	);

	const loginWithGoogle = useCallback(
		async (payload) => {
			const { data } = await api.post("/auth/firebase", payload);
			const nextToken = extractTokenFromResponse(data);
			if (!nextToken) throw new Error("Missing auth token in response");
			const nextUser = extractUserFromResponse(data);
			if (nextUser) {
				persistSession(nextToken, nextUser);
			} else {
				await hydrateSessionFromToken(nextToken);
			}
			return data;
		},
		[
			extractTokenFromResponse,
			extractUserFromResponse,
			hydrateSessionFromToken,
			persistSession,
		],
	);

	const loginWithFirebase = useCallback(
		async (payload) => {
			const { data } = await api.post("/auth/firebase", payload);
			const nextToken = extractTokenFromResponse(data);
			if (!nextToken) throw new Error("Missing auth token in response");
			const nextUser = extractUserFromResponse(data);
			if (nextUser) {
				persistSession(nextToken, nextUser);
			} else {
				await hydrateSessionFromToken(nextToken);
			}
			return data;
		},
		[
			extractTokenFromResponse,
			extractUserFromResponse,
			hydrateSessionFromToken,
			persistSession,
		],
	);

	const logout = useCallback(() => {
		clearSession();
	}, [clearSession]);

	const setCurrentUser = useCallback((nextUser) => {
		setUser(nextUser || null);
		localStorage.setItem("user", JSON.stringify(nextUser || null));
	}, []);

	const value = useMemo(
		() => ({
			token,
			user,
			signup,
			login,
			loginWithGoogle,
			loginWithFirebase,
			logout,
			setCurrentUser,
			isAuthenticated: Boolean(token),
		}),
		[
			login,
			loginWithFirebase,
			loginWithGoogle,
			logout,
			setCurrentUser,
			signup,
			token,
			user,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
