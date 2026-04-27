import { lazy } from "react";

export function lazyPage(loader) {
	const LazyComponent = lazy(loader);
	LazyComponent.preload = loader;
	return LazyComponent;
}

