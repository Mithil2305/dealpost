import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { Fragment } from "react";

const SIZE_CLASSES = {
	sm: "max-w-md",
	md: "max-w-lg",
	lg: "max-w-2xl",
	xl: "max-w-4xl",
};

export default function Modal({
	isOpen,
	onClose,
	title,
	children,
	size = "md",
}) {
	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={onClose}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-200"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-150"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/40" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto p-4">
					<div className="flex min-h-full items-center justify-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-200"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-150"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel
								className={`w-full ${SIZE_CLASSES[size] || SIZE_CLASSES.md} overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xl`}
							>
								<div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
									<Dialog.Title className="text-lg font-bold text-brand-dark">
										{title}
									</Dialog.Title>
									<button
										type="button"
										onClick={onClose}
										className="grid h-10 w-10 place-items-center rounded-lg text-[#666666] hover:bg-brand-bg hover:text-black"
										aria-label="Close dialog"
									>
										<X size={18} />
									</button>
								</div>
								<div className="p-4">{children}</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}
