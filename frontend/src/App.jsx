import { Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/useAuth.jsx";
import SkipToMain from "./components/a11y/SkipToMain.jsx";
import RouteFallback from "./components/ui/RouteFallback.jsx";
import { trackPageView } from "./utils/analytics.js";
import { lazyPage } from "./utils/lazy.js";

const Home = lazyPage(() => import("./pages/Home.jsx"));
const Login = lazyPage(() => import("./pages/Login.jsx"));
const Signup = lazyPage(() => import("./pages/Signup.jsx"));
const ProductDetail = lazyPage(() => import("./pages/ProductDetail.jsx"));
const Explore = lazyPage(() => import("./pages/Explore.jsx"));
const Categories = lazyPage(() => import("./pages/Categories.jsx"));
const BusinessListings = lazyPage(() => import("./pages/BusinessListings.jsx"));
const BusinessRegistration = lazyPage(() =>
	import("./pages/BusinessRegistration.jsx"),
);
const PostAd = lazyPage(() => import("./pages/PostAd.jsx"));
const EditListing = lazyPage(() => import("./pages/EditListing.jsx"));
const MyAds = lazyPage(() => import("./pages/MyAds.jsx"));
const Profile = lazyPage(() => import("./pages/Profile.jsx"));
const Messages = lazyPage(() => import("./pages/Messages.jsx"));
const AdminDashboard = lazyPage(() => import("./pages/AdminDashboard.jsx"));
const UserDashboard = lazyPage(() => import("./pages/UserDashboard.jsx"));
const About = lazyPage(() => import("./pages/About.jsx"));
const Contact = lazyPage(() => import("./pages/Contact.jsx"));
const Disclaimer = lazyPage(() => import("./pages/Disclaimer.jsx"));
const HelpCenter = lazyPage(() => import("./pages/HelpCenter.jsx"));
const PrivacyPolicy = lazyPage(() => import("./pages/PrivacyPolicy.jsx"));
const TermsAndConditions = lazyPage(() =>
	import("./pages/TermsAndConditions.jsx"),
);
const CompareListings = lazyPage(() => import("./pages/CompareListings.jsx"));
const Likedproducts = lazyPage(() => import("./pages/Likedproducts.jsx"));

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
			<Suspense fallback={<RouteFallback />}>
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
						path="/business-registration"
						element={
							<ProtectedRoute>
								<BusinessRegistration />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/post-business-ad"
						element={<Navigate to="/business-registration" replace />}
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
			</Suspense>
		</>
	);
}

export default App;
