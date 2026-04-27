import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { initGoogleAnalytics } from "./utils/analytics.js";
import { scheduleIdleTask } from "./utils/idle.js";

if (typeof window !== "undefined") {
	window.addEventListener(
		"load",
		() => {
			scheduleIdleTask(() => {
				initGoogleAnalytics();
			});
		},
		{ once: true },
	);
}

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<BrowserRouter
			future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
		>
			<AuthProvider>
				<App />
				<Toaster
					position="top-right"
					toastOptions={{
						style: {
							borderRadius: "14px",
							background: "#111111",
							color: "#f5f5f0",
							border: "1px solid #2a2a2a",
						},
					}}
				/>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
);
