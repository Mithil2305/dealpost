/**
 * useAppwriteAuth Hook
 * React hook for Appwrite authentication
 * Location: frontend/src/hooks/useAppwriteAuth.js
 *
 * Features:
 * - Signup with email/password
 * - Login/logout
 * - Session management
 * - Persistent login
 * - Password reset
 * - User profile updates
 */

import { useState, useEffect, useCallback } from "react";
import { authService } from "../services/appwrite";

const useAppwriteAuth = () => {
	const [user, setUser] = useState(null);
	const [userProfile, setUserProfile] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	/**
	 * Check if user is currently logged in
	 * Runs on component mount
	 */
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const currentUser = await authService.getCurrentUser();
				if (currentUser) {
					setUser(currentUser);
					setIsAuthenticated(true);

					// Fetch user profile from database
					try {
						const profile = await authService.getUserProfile(currentUser.$id);
						setUserProfile(profile);
					} catch (err) {
						console.warn("Profile not found, creating new profile...", err);
						// Profile might not exist yet - that's okay
					}
				} else {
					setUser(null);
					setIsAuthenticated(false);
				}
			} catch (err) {
				console.error("Auth check error:", err);
				setUser(null);
				setIsAuthenticated(false);
			} finally {
				setIsLoading(false);
			}
		};

		checkAuth();

		// Cleanup function (optional)
		return () => {
			// Could add subscription cleanup here if using realtime
		};
	}, []);

	/**
	 * Signup with email and password
	 */
	const signup = useCallback(async (email, password, name) => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await authService.signup(email, password, name);
			setUser(result);
			setUserProfile(result);
			setIsAuthenticated(true);
			return result;
		} catch (err) {
			setError(err.message);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Login with email and password
	 */
	const login = useCallback(async (email, password) => {
		setIsLoading(true);
		setError(null);

		try {
			const session = await authService.login(email, password);
			const currentUser = await authService.getCurrentUser();
			setUser(currentUser);
			setIsAuthenticated(true);

			// Fetch profile
			try {
				const profile = await authService.getUserProfile(currentUser.$id);
				setUserProfile(profile);
			} catch (err) {
				console.warn("Profile fetch failed:", err);
			}

			return { user: currentUser, session };
		} catch (err) {
			setError(err.message);
			setUser(null);
			setIsAuthenticated(false);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Logout and clear session
	 */
	const logout = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			await authService.logout();
			setUser(null);
			setUserProfile(null);
			setIsAuthenticated(false);
		} catch (err) {
			setError(err.message);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Update user profile
	 */
	const updateProfile = useCallback(
		async (updates) => {
			if (!user) {
				throw new Error("User not authenticated");
			}

			setError(null);

			try {
				const updated = await authService.updateProfile(user.$id, updates);
				setUserProfile(updated);
				return updated;
			} catch (err) {
				setError(err.message);
				throw err;
			}
		},
		[user],
	);

	/**
	 * Request password reset email
	 */
	const requestPasswordReset = useCallback(async (email, redirectUrl) => {
		setError(null);

		try {
			const result = await authService.requestPasswordReset(email, redirectUrl);
			return result;
		} catch (err) {
			setError(err.message);
			throw err;
		}
	}, []);

	/**
	 * Confirm password reset with token
	 */
	const resetPassword = useCallback(async (userId, token, newPassword) => {
		setError(null);

		try {
			const result = await authService.resetPassword(
				userId,
				token,
				newPassword,
			);
			return result;
		} catch (err) {
			setError(err.message);
			throw err;
		}
	}, []);

	/**
	 * Refresh user data
	 */
	const refreshUser = useCallback(async () => {
		if (!user) return;

		try {
			const profile = await authService.getUserProfile(user.$id);
			setUserProfile(profile);
			return profile;
		} catch (err) {
			setError(err.message);
			throw err;
		}
	}, [user]);

	/**
	 * Clear error state
	 */
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		// State
		user,
		userProfile,
		isAuthenticated,
		isLoading,
		error,

		// Methods
		signup,
		login,
		logout,
		updateProfile,
		requestPasswordReset,
		resetPassword,
		refreshUser,
		clearError,

		// Helpers
		userId: user?.$id,
		userEmail: user?.email,
	};
};

export default useAppwriteAuth;
