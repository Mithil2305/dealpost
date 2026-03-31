import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Explore from "./pages/Explore.jsx";
import Categories from "./pages/Categories.jsx";
import BusinessListings from "./pages/BusinessListings.jsx";
import BusinessPostAd from "./pages/BusinessPostAd.jsx";
import PostAd from "./pages/PostAd.jsx";
import EditListing from "./pages/EditListing.jsx";
import MyAds from "./pages/MyAds.jsx";
import Profile from "./pages/Profile.jsx";
import Messages from "./pages/Messages.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Disclaimer from "./pages/Disclaimer.jsx";
import HelpCenter from "./pages/HelpCenter.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsAndConditions from "./pages/TermsAndConditions.jsx";
import CompareListings from "./pages/CompareListings.jsx";
import Likedproducts from "./pages/Likedproducts.jsx";
import { useAuth } from "./context/useAuth.jsx";
import SkipToMain from "./components/a11y/SkipToMain.jsx";
import { trackPageView } from "./utils/analytics.js";

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

function ScrollToTop() {
	const { pathname } = useLocation();

	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "instant" });
	}, [pathname]);

	return null;
}

function AnalyticsTracker() {
	const { pathname, search, hash } = useLocation();

	useEffect(() => {
		trackPageView(`${pathname}${search}${hash}`);
	}, [hash, pathname, search]);

	return null;
}

function App() {
	const location = useLocation();

	useEffect(() => {
		const routeMain = document.querySelector("main");
		if (routeMain && routeMain.id !== "main-content") {
			routeMain.id = "main-content";
		}
	}, [location.pathname]);

	return (
		<>
			<ScrollToTop />
			<AnalyticsTracker />
			<SkipToMain />
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
				<Route path="/compare" element={<CompareListings />} />
				<Route path="/about" element={<About />} />
				<Route path="/contact" element={<Contact />} />
				<Route path="/help-center" element={<HelpCenter />} />
				<Route path="/legal/disclaimer" element={<Disclaimer />} />
				<Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
				<Route
					path="/legal/terms-and-conditions"
					element={<TermsAndConditions />}
				/>
				<Route path="/business-listings" element={<BusinessListings />} />
				<Route
					path="/post-business-ad"
					element={
						<ProtectedRoute>
							<BusinessPostAd />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/post-ad"
					element={
						<ProtectedRoute>
							<PostAd />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/edit-listing/:id"
					element={
						<ProtectedRoute>
							<EditListing />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/my-listings"
					element={
						<ProtectedRoute>
							<MyAds />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<UserDashboard />
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
					path="/favorites"
					element={
						<ProtectedRoute>
							<Likedproducts />
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
		</>
	);
}

export default App;
