/**
 * Appwrite SDK Service
 * Frontend service for initializing Appwrite client and providing helper methods
 * Location: frontend/src/services/appwrite.js
 *
 * This service handles:
 * - Client initialization
 * - Database operations (CRUD)
 * - Storage operations (file upload/download)
 * - Authentication (via backend session)
 * - Realtime subscriptions
 * - Query helpers
 */

import {
	Client,
	Account,
	Databases,
	Storage,
	Query,
	ID,
	AppwriteException,
} from "appwrite";

// Initialize Appwrite Client
const client = new Client()
	.setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // https://api.dealpost.in/v1
	.setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID); // dealpost

// Export individual services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database and Collection IDs
export const DB_ID = "dealpost";
export const COLLECTIONS = {
	USERS: "users",
	LISTINGS: "listings",
	CONVERSATIONS: "conversations",
	MESSAGES: "messages",
	NOTIFICATIONS: "notifications",
	REPORTS: "reports",
	LIKES: "likes",
};

export const BUCKETS = {
	AVATARS: "avatars",
	LISTING_IMAGES: "listing-images",
	REPORT_EVIDENCE: "report-evidence",
};

// ============================================================================
// AUTHENTICATION SERVICES
// ============================================================================

export const authService = {
	/**
	 * Signup with email & password
	 * @param {string} email - User email
	 * @param {string} password - User password
	 * @param {string} name - User full name
	 * @returns {Promise<Object>} User object
	 */
	async signup(email, password, name) {
		try {
			// Create account
			const user = await account.create(ID.unique(), email, password, name);

			// Auto login after signup
			await account.createEmailPasswordSession(email, password);

			// Create user profile in database
			const userProfile = await databases.createDocument(
				DB_ID,
				COLLECTIONS.USERS,
				user.$id,
				{
					userId: user.$id,
					email: email,
					name: name,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			);

			return { ...user, ...userProfile };
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Login with email & password
	 * @param {string} email - User email
	 * @param {string} password - User password
	 * @returns {Promise<Object>} Session object
	 */
	async login(email, password) {
		try {
			const session = await account.createEmailPasswordSession(email, password);
			return session;
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Get current logged in user
	 * @returns {Promise<Object>} Current user object
	 */
	async getCurrentUser() {
		try {
			return await account.get();
		} catch (error) {
			if (error.code === 401) {
				return null; // Not authenticated
			}
			throw this.handleError(error);
		}
	},

	/**
	 * Get user profile from database
	 * @param {string} userId - User ID
	 * @returns {Promise<Object>} User profile
	 */
	async getUserProfile(userId) {
		try {
			return await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Update user profile
	 * @param {string} userId - User ID
	 * @param {Object} updates - Fields to update
	 * @returns {Promise<Object>} Updated user profile
	 */
	async updateProfile(userId, updates) {
		try {
			return await databases.updateDocument(
				DB_ID,
				COLLECTIONS.USERS,
				userId,
				updates,
			);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Logout - delete current session
	 * @param {string} sessionId - Session ID (optional, defaults to current)
	 * @returns {Promise<void>}
	 */
	async logout(sessionId = "current") {
		try {
			await account.deleteSession(sessionId);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Request password reset email
	 * @param {string} email - User email
	 * @param {string} redirectUrl - URL to redirect after reset
	 * @returns {Promise<Object>} Reset token
	 */
	async requestPasswordReset(email, redirectUrl) {
		try {
			return await account.createRecovery(email, redirectUrl);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Confirm password reset with token
	 * @param {string} userId - User ID
	 * @param {string} secret - Reset token from email
	 * @param {string} newPassword - New password
	 * @returns {Promise<Object>} Updated session
	 */
	async resetPassword(userId, secret, newPassword) {
		try {
			return await account.updateRecovery(userId, secret, newPassword);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Handle and format Appwrite errors
	 * @param {Error} error - Appwrite error
	 * @returns {Error} Formatted error
	 */
	handleError(error) {
		if (error instanceof AppwriteException) {
			const err = new Error(error.message);
			err.code = error.code;
			err.type = error.type;
			return err;
		}
		return error;
	},
};

// ============================================================================
// DATABASE SERVICES
// ============================================================================

export const listingService = {
	/**
	 * Get all active listings with filters
	 * @param {Object} filters - {category, minPrice, maxPrice, sortBy}
	 * @param {number} limit - Results per page
	 * @param {number} offset - Pagination offset
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getListings(filters = {}, limit = 20, offset = 0) {
		try {
			const queries = [
				Query.equal("status", "active"),
				Query.limit(limit),
				Query.offset(offset),
				Query.orderDesc("createdAt"),
			];

			if (filters.category) {
				queries.push(Query.equal("category", filters.category));
			}
			if (filters.minPrice) {
				queries.push(Query.greaterThanEqual("price", filters.minPrice));
			}
			if (filters.maxPrice) {
				queries.push(Query.lessThanEqual("price", filters.maxPrice));
			}

			return await databases.listDocuments(
				DB_ID,
				COLLECTIONS.LISTINGS,
				queries,
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Get single listing by ID
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<Object>} Listing document
	 */
	async getListing(listingId) {
		try {
			return await databases.getDocument(
				DB_ID,
				COLLECTIONS.LISTINGS,
				listingId,
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Get listings by owner/user
	 * @param {string} userId - Owner user ID
	 * @param {number} limit - Max results
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getUserListings(userId, limit = 100) {
		try {
			return await databases.listDocuments(DB_ID, COLLECTIONS.LISTINGS, [
				Query.equal("ownerId", userId),
				Query.orderDesc("createdAt"),
				Query.limit(limit),
			]);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Create new listing
	 * @param {Object} data - Listing data {title, description, price, category, images, etc}
	 * @returns {Promise<Object>} Created listing
	 */
	async createListing(data) {
		try {
			const listingData = {
				...data,
				listingId: ID.unique(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			return await databases.createDocument(
				DB_ID,
				COLLECTIONS.LISTINGS,
				listingData.listingId,
				listingData,
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Update listing
	 * @param {string} listingId - Listing ID
	 * @param {Object} updates - Fields to update
	 * @returns {Promise<Object>} Updated listing
	 */
	async updateListing(listingId, updates) {
		try {
			updates.updatedAt = new Date().toISOString();
			return await databases.updateDocument(
				DB_ID,
				COLLECTIONS.LISTINGS,
				listingId,
				updates,
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Delete listing
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<void>}
	 */
	async deleteListing(listingId) {
		try {
			await databases.deleteDocument(DB_ID, COLLECTIONS.LISTINGS, listingId);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Increment view count
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<Object>} Updated listing
	 */
	async incrementViews(listingId) {
		try {
			const listing = await this.getListing(listingId);
			return await this.updateListing(listingId, {
				viewCount: (listing.viewCount || 0) + 1,
			});
		} catch (error) {
			throw authService.handleError(error);
		}
	},
};

export const messageService = {
	/**
	 * Get conversation messages
	 * @param {string} conversationId - Conversation ID
	 * @param {number} limit - Results per page
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getMessages(conversationId, limit = 50) {
		try {
			return await databases.listDocuments(DB_ID, COLLECTIONS.MESSAGES, [
				Query.equal("conversationId", conversationId),
				Query.orderAsc("createdAt"),
				Query.limit(limit),
			]);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Send message
	 * @param {Object} data - {conversationId, senderId, receiverId, message}
	 * @returns {Promise<Object>} Created message
	 */
	async sendMessage(data) {
		try {
			return await databases.createDocument(
				DB_ID,
				COLLECTIONS.MESSAGES,
				ID.unique(),
				{
					...data,
					read: false,
					createdAt: new Date().toISOString(),
				},
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Mark message as read
	 * @param {string} messageId - Message ID
	 * @returns {Promise<Object>} Updated message
	 */
	async markAsRead(messageId) {
		try {
			return await databases.updateDocument(
				DB_ID,
				COLLECTIONS.MESSAGES,
				messageId,
				{
					read: true,
					readAt: new Date().toISOString(),
				},
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Get or create conversation
	 * @param {string} userId1 - First user ID
	 * @param {string} userId2 - Second user ID
	 * @returns {Promise<Object>} Conversation
	 */
	async getOrCreateConversation(userId1, userId2) {
		try {
			// Search existing conversation
			const conversations = await databases.listDocuments(
				DB_ID,
				COLLECTIONS.CONVERSATIONS,
				[Query.search("participantIds", `${userId1} ${userId2}`)],
			);

			if (conversations.documents.length > 0) {
				return conversations.documents[0];
			}

			// Create new conversation
			return await databases.createDocument(
				DB_ID,
				COLLECTIONS.CONVERSATIONS,
				ID.unique(),
				{
					participantIds: [userId1, userId2],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},
};

export const notificationService = {
	/**
	 * Get user notifications
	 * @param {string} userId - User ID
	 * @param {boolean} unreadOnly - Only unread
	 * @param {number} limit - Max results
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getNotifications(userId, unreadOnly = false, limit = 50) {
		try {
			const queries = [
				Query.equal("userId", userId),
				Query.orderDesc("createdAt"),
				Query.limit(limit),
			];

			if (unreadOnly) {
				queries.push(Query.equal("read", false));
			}

			return await databases.listDocuments(
				DB_ID,
				COLLECTIONS.NOTIFICATIONS,
				queries,
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Create notification
	 * @param {Object} data - Notification data
	 * @returns {Promise<Object>} Created notification
	 */
	async createNotification(data) {
		try {
			return await databases.createDocument(
				DB_ID,
				COLLECTIONS.NOTIFICATIONS,
				ID.unique(),
				{
					...data,
					read: false,
					createdAt: new Date().toISOString(),
				},
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Mark notification as read
	 * @param {string} notificationId - Notification ID
	 * @returns {Promise<Object>} Updated notification
	 */
	async markAsRead(notificationId) {
		try {
			return await databases.updateDocument(
				DB_ID,
				COLLECTIONS.NOTIFICATIONS,
				notificationId,
				{ read: true },
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Mark all notifications as read
	 * @param {string} userId - User ID
	 * @returns {Promise<void>}
	 */
	async markAllAsRead(userId) {
		try {
			const notifications = await this.getNotifications(userId, true, 1000);

			for (const notif of notifications.documents) {
				await this.markAsRead(notif.$id);
			}
		} catch (error) {
			throw authService.handleError(error);
		}
	},
};

export const likeService = {
	/**
	 * Check if user liked a listing
	 * @param {string} userId - User ID
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<boolean>} True if liked
	 */
	async isLiked(userId, listingId) {
		try {
			const likes = await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
				Query.equal("userId", userId),
				Query.equal("listingId", listingId),
			]);
			return likes.total > 0;
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Toggle like on listing
	 * @param {string} userId - User ID
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<{liked: boolean}>} New like status
	 */
	async toggleLike(userId, listingId) {
		try {
			const isLiked = await this.isLiked(userId, listingId);

			if (isLiked) {
				// Remove like
				const likes = await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
					Query.equal("userId", userId),
					Query.equal("listingId", listingId),
				]);

				await databases.deleteDocument(
					DB_ID,
					COLLECTIONS.LIKES,
					likes.documents[0].$id,
				);

				return { liked: false };
			} else {
				// Add like
				await databases.createDocument(DB_ID, COLLECTIONS.LIKES, ID.unique(), {
					userId,
					listingId,
					createdAt: new Date().toISOString(),
				});

				return { liked: true };
			}
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Get user's liked listings
	 * @param {string} userId - User ID
	 * @param {number} limit - Max results
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getUserLikes(userId, limit = 100) {
		try {
			return await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
				Query.equal("userId", userId),
				Query.orderDesc("createdAt"),
				Query.limit(limit),
			]);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Get like count for listing
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<number>} Like count
	 */
	async getLikeCount(listingId) {
		try {
			const likes = await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
				Query.equal("listingId", listingId),
			]);
			return likes.total;
		} catch (error) {
			throw authService.handleError(error);
		}
	},
};

// ============================================================================
// STORAGE SERVICES
// ============================================================================

export const fileService = {
	/**
	 * Upload file to storage
	 * @param {string} bucketId - Bucket ID
	 * @param {File} file - File object from input
	 * @param {Function} onProgress - Progress callback
	 * @returns {Promise<Object>} File metadata
	 */
	async uploadFile(bucketId, file, onProgress = null) {
		try {
			return await storage.createFile(
				bucketId,
				ID.unique(),
				file,
				undefined,
				onProgress,
			);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Upload avatar image
	 * @param {File} file - Image file
	 * @returns {Promise<Object>} File metadata with fileId
	 */
	async uploadAvatar(file) {
		try {
			return await this.uploadFile(BUCKETS.AVATARS, file);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Upload listing images
	 * @param {File[]} files - Image files array
	 * @returns {Promise<Object[]>} Array of file metadata
	 */
	async uploadListingImages(files) {
		try {
			const uploads = files.map((file) =>
				this.uploadFile(BUCKETS.LISTING_IMAGES, file),
			);
			return await Promise.all(uploads);
		} catch (error) {
			throw authService.handleError(error);
		}
	},

	/**
	 * Get file preview URL
	 * @param {string} bucketId - Bucket ID
	 * @param {string} fileId - File ID
	 * @param {number} width - Preview width (optional)
	 * @param {number} height - Preview height (optional)
	 * @returns {string} Preview URL
	 */
	getFilePreview(bucketId, fileId, width = 300, height = 300) {
		return storage.getFilePreview(bucketId, fileId, width, height);
	},

	/**
	 * Get file download URL
	 * @param {string} bucketId - Bucket ID
	 * @param {string} fileId - File ID
	 * @returns {string} Download URL
	 */
	getFileDownload(bucketId, fileId) {
		return storage.getFileDownload(bucketId, fileId);
	},

	/**
	 * Delete file
	 * @param {string} bucketId - Bucket ID
	 * @param {string} fileId - File ID
	 * @returns {Promise<void>}
	 */
	async deleteFile(bucketId, fileId) {
		try {
			await storage.deleteFile(bucketId, fileId);
		} catch (error) {
			throw authService.handleError(error);
		}
	},
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export const realtimeService = {
	/**
	 * Subscribe to messages in conversation
	 * @param {string} conversationId - Conversation ID
	 * @param {Function} callback - Called on new message/update
	 * @returns {string|number} Subscription ID (for unsubscribe)
	 */
	subscribeToMessages(conversationId, callback) {
		return client.subscribe(
			`databases.${DB_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
			(response) => {
				// Filter by conversation
				if (response.payload.conversationId === conversationId) {
					callback(response);
				}
			},
		);
	},

	/**
	 * Subscribe to user notifications
	 * @param {string} userId - User ID
	 * @param {Function} callback - Called on new notification
	 * @returns {string|number} Subscription ID
	 */
	subscribeToNotifications(userId, callback) {
		return client.subscribe(
			`databases.${DB_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`,
			(response) => {
				// Filter by user
				if (response.payload.userId === userId) {
					callback(response);
				}
			},
		);
	},

	/**
	 * Subscribe to new listings
	 * @param {Function} callback - Called on new listing
	 * @returns {string|number} Subscription ID
	 */
	subscribeToNewListings(callback) {
		return client.subscribe(
			`databases.${DB_ID}.collections.${COLLECTIONS.LISTINGS}.documents`,
			(response) => {
				if (
					response.events.includes(
						"databases.*.collections.*.documents.*.create",
					)
				) {
					callback(response);
				}
			},
		);
	},

	/**
	 * Unsubscribe from realtime
	 * @param {string|number} subscriptionId - Subscription ID from subscribe
	 */
	unsubscribe(subscriptionId) {
		client.unsubscribe(subscriptionId);
	},
};

export default {
	client,
	account,
	databases,
	storage,
	authService,
	listingService,
	messageService,
	notificationService,
	likeService,
	fileService,
	realtimeService,
};
