export function scheduleIdleTask(callback, options = {}) {
	if (typeof window === "undefined") {
		return () => {};
	}

	const timeout = Number(options.timeout) || 1500;

	if (typeof window.requestIdleCallback === "function") {
		const id = window.requestIdleCallback(callback, { timeout });
		return () => window.cancelIdleCallback(id);
	}

	const id = window.setTimeout(() => {
		callback({
			didTimeout: false,
			timeRemaining: () => 0,
		});
	}, 1);

	return () => window.clearTimeout(id);
}

