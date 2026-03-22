import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Explore from "./pages/Explore.jsx";
import Categories from "./pages/Categories.jsx";
import PostAd from "./pages/PostAd.jsx";
import MyAds from "./pages/MyAds.jsx";
import Profile from "./pages/Profile.jsx";
import Messages from "./pages/Messages.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import { useAuth } from "./context/useAuth.jsx";

function ProtectedRoute({ children, requireAdmin = false }) {
	const { token, user } = useAuth();
	const role = String(user?.role || "").toLowerCase();
	const hasElevatedAccess = role === "admin" || role === "developer";

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	if (requireAdmin && !hasElevatedAccess) {
		return <Navigate to="/" replace />;
	}

	return children;
}

function GuestOnlyRoute({ children }) {
	const { token } = useAuth();

	if (token) {
		return <Navigate to="/" replace />;
	}

	return children;
}

function App() {
	return (
		<Routes>
			<Route path="/" element={<Home />} />
			<Route
				path="/login"
				element={
					<GuestOnlyRoute>
						<Login />
					</GuestOnlyRoute>
				}
			/>
			<Route
				path="/signup"
				element={
					<GuestOnlyRoute>
						<Signup />
					</GuestOnlyRoute>
				}
			/>
			<Route path="/listing/:id" element={<ProductDetail />} />
			<Route path="/explore" element={<Explore />} />
			<Route path="/categories" element={<Categories />} />
			<Route
				path="/post-ad"
				element={
					<ProtectedRoute>
						<PostAd />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/my-ads"
				element={
					<ProtectedRoute>
						<MyAds />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/profile"
				element={
					<ProtectedRoute>
						<Profile />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/messages"
				element={
					<ProtectedRoute>
						<Messages />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/admin"
				element={
					<ProtectedRoute requireAdmin>
						<AdminDashboard />
					</ProtectedRoute>
				}
			/>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;
