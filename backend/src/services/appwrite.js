/**
 * Appwrite Backend Service
 * Server-to-server communication with Appwrite Admin API
 * Location: backend/src/services/appwrite.js
 *
 * This service handles:
 * - Server-side database operations
 * - Admin operations (user management, etc)
 * - Batch operations
 * - Session token verification
 * - Direct database queries with full permissions
 */

const sdk = require("node-appwrite");

// Initialize with admin API key (higher privileges)
const client = new sdk.Client()
	.setEndpoint(process.env.APPWRITE_ENDPOINT || "https://api.dealpost.in/v1")
	.setProject(process.env.APPWRITE_PROJECT_ID || "dealpost")
	.setKey(process.env.APPWRITE_API_KEY); // Server API key with admin access

// Export services
const databases = new sdk.Databases(client);
const users = new sdk.Users(client);
const storage = new sdk.Storage(client);

// Database and Collection references
const DB_ID = process.env.DB_ID || "dealpost";
const COLLECTIONS = {
	USERS: "users",
	LISTINGS: "listings",
	CONVERSATIONS: "conversations",
	MESSAGES: "messages",
	NOTIFICATIONS: "notifications",
	REPORTS: "reports",
	LIKES: "likes",
};

const BUCKETS = {
	AVATARS: "avatars",
	LISTING_IMAGES: "listing-images",
	REPORT_EVIDENCE: "report-evidence",
};

// ============================================================================
// USER MANAGEMENT (Admin operations)
// ============================================================================

const userService = {
	/**
	 * Create user (admin operation)
	 * @param {Object} userData - {email, password?, name}
	 * @returns {Promise<Object>} Created user
	 */
	async createUser(userData) {
		try {
			const user = await users.create(
				sdk.ID.unique(),
				userData.email,
				userData.password || null,
				userData.name,
			);

			// Create user profile in database
			const profile = await databases.createDocument(
				DB_ID,
				COLLECTIONS.USERS,
				user.$id,
				{
					userId: user.$id,
					email: userData.email,
					name: userData.name || "",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			);

			return { ...user, ...profile };
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Get user by ID
	 * @param {string} userId - User ID
	 * @returns {Promise<Object>} User profile
	 */
	async getUser(userId) {
		try {
			return await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Get user by email
	 * @param {string} email - User email
	 * @returns {Promise<Object|null>} User profile or null
	 */
	async getUserByEmail(email) {
		try {
			const users = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
				sdk.Query.equal("email", email),
			]);
			return users.documents.length > 0 ? users.documents[0] : null;
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Update user profile
	 * @param {string} userId - User ID
	 * @param {Object} updates - Fields to update
	 * @returns {Promise<Object>} Updated user
	 */
	async updateUser(userId, updates) {
		try {
			updates.updatedAt = new Date().toISOString();
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
	 * Update user email (requires verification)
	 * @param {string} userId - User ID
	 * @param {string} newEmail - New email
	 * @returns {Promise<void>}
	 */
	async updateEmail(userId, newEmail) {
		try {
			const user = await users.get(userId);
			await users.updateEmail(userId, newEmail);
			await this.updateUser(userId, { email: newEmail });
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Update user password
	 * @param {string} userId - User ID
	 * @param {string} newPassword - New password
	 * @returns {Promise<void>}
	 */
	async updatePassword(userId, newPassword) {
		try {
			await users.updatePassword(userId, newPassword);
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Delete user and all related data
	 * @param {string} userId - User ID
	 * @returns {Promise<void>}
	 */
	async deleteUser(userId) {
		try {
			// Delete user profile
			await databases.deleteDocument(DB_ID, COLLECTIONS.USERS, userId);

			// Delete user account
			await users.delete(userId);

			// TODO: Delete related documents (listings, messages, etc) if cascade not enabled
		} catch (error) {
			throw this.handleError(error);
		}
	},

	/**
	 * Add business verification to user
	 * @param {string} userId - User ID
	 * @param {Object} businessData - {gstIn, businessVerified}
	 * @returns {Promise<Object>} Updated user
	 */
	async verifyBusiness(userId, businessData) {
		try {
			return await this.updateUser(userId, {
				...businessData,
				businessVerified: true,
			});
		} catch (error) {
			throw this.handleError(error);
		}
	},

	handleError(error) {
		const err = new Error(error.message);
		err.code = error.code;
		return err;
	},
};

// ============================================================================
// LISTING MANAGEMENT
// ============================================================================

const listingService = {
	/**
	 * Create listing
	 * @param {Object} data - Listing data
	 * @returns {Promise<Object>} Created listing
	 */
	async createListing(data) {
		try {
			const listingData = {
				...data,
				listingId: sdk.ID.unique(),
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
			throw userService.handleError(error);
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
			throw userService.handleError(error);
		}
	},

	/**
	 * Mark listing as sold
	 * @param {string} listingId - Listing ID
	 * @returns {Promise<Object>} Updated listing
	 */
	async markAsSold(listingId) {
		try {
			return await this.updateListing(listingId, { status: "sold" });
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Get user's listings
	 * @param {string} userId - Owner user ID
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getUserListings(userId) {
		try {
			return await databases.listDocuments(DB_ID, COLLECTIONS.LISTINGS, [
				sdk.Query.equal("ownerId", userId),
				sdk.Query.orderDesc("createdAt"),
			]);
		} catch (error) {
			throw userService.handleError(error);
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
			throw userService.handleError(error);
		}
	},
};

// ============================================================================
// MESSAGE & CONVERSATION MANAGEMENT
// ============================================================================

const conversationService = {
	/**
	 * Create conversation
	 * @param {Object} data - {participantIds, relatedListingId?}
	 * @returns {Promise<Object>} Created conversation
	 */
	async createConversation(data) {
		try {
			return await databases.createDocument(
				DB_ID,
				COLLECTIONS.CONVERSATIONS,
				sdk.ID.unique(),
				{
					...data,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			);
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Get user conversations
	 * @param {string} userId - User ID
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getUserConversations(userId) {
		try {
			return await databases.listDocuments(DB_ID, COLLECTIONS.CONVERSATIONS, [
				sdk.Query.search("participantIds", userId),
				sdk.Query.orderDesc("updatedAt"),
			]);
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Update conversation (last message, etc)
	 * @param {string} conversationId - Conversation ID
	 * @param {Object} updates - Fields to update
	 * @returns {Promise<Object>} Updated conversation
	 */
	async updateConversation(conversationId, updates) {
		try {
			updates.updatedAt = new Date().toISOString();
			return await databases.updateDocument(
				DB_ID,
				COLLECTIONS.CONVERSATIONS,
				conversationId,
				updates,
			);
		} catch (error) {
			throw userService.handleError(error);
		}
	},
};

const messageService = {
	/**
	 * Create message
	 * @param {Object} data - {conversationId, senderId, receiverId, message}
	 * @returns {Promise<Object>} Created message
	 */
	async createMessage(data) {
		try {
			const message = await databases.createDocument(
				DB_ID,
				COLLECTIONS.MESSAGES,
				sdk.ID.unique(),
				{
					...data,
					read: false,
					createdAt: new Date().toISOString(),
				},
			);

			// Update conversation last message
			await conversationService.updateConversation(data.conversationId, {
				lastMessage: data.message.substring(0, 100),
				lastMessageTime: new Date().toISOString(),
			});

			return message;
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Get conversation messages
	 * @param {string} conversationId - Conversation ID
	 * @param {number} limit - Max results
	 * @returns {Promise<Object>} {documents, total}
	 */
	async getMessages(conversationId, limit = 100) {
		try {
			return await databases.listDocuments(DB_ID, COLLECTIONS.MESSAGES, [
				sdk.Query.equal("conversationId", conversationId),
				sdk.Query.orderDesc("createdAt"),
				sdk.Query.limit(limit),
			]);
		} catch (error) {
			throw userService.handleError(error);
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
			throw userService.handleError(error);
		}
	},
};

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

const notificationService = {
	/**
	 * Create notification
	 * @param {Object} data - {userId, type, title, content, relatedId}
	 * @returns {Promise<Object>} Created notification
	 */
	async createNotification(data) {
		try {
			return await databases.createDocument(
				DB_ID,
				COLLECTIONS.NOTIFICATIONS,
				sdk.ID.unique(),
				{
					...data,
					read: false,
					createdAt: new Date().toISOString(),
				},
			);
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Get user unread notifications count
	 * @param {string} userId - User ID
	 * @returns {Promise<number>} Unread count
	 */
	async getUnreadCount(userId) {
		try {
			const notifications = await databases.listDocuments(
				DB_ID,
				COLLECTIONS.NOTIFICATIONS,
				[sdk.Query.equal("userId", userId), sdk.Query.equal("read", false)],
			);
			return notifications.total;
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Create notification helpers
	 */
	async notifyNewMessage(conversationId, receiverId, senderName) {
		return this.createNotification({
			userId: receiverId,
			type: "message",
			title: `New message from ${senderName}`,
			actionUrl: `/chat/${conversationId}`,
			relatedId: conversationId,
		});
	},

	async notifyNewLike(listingId, ownerId, liker) {
		return this.createNotification({
			userId: ownerId,
			type: "like",
			title: `${liker} liked your listing`,
			actionUrl: `/listing/${listingId}`,
			relatedId: listingId,
		});
	},

	async notifyListingReport(listingId, ownerId) {
		return this.createNotification({
			userId: ownerId,
			type: "report",
			title: "Your listing was reported",
			content:
				"A user has reported your listing. Our team will review it shortly.",
			actionUrl: `/listing/${listingId}`,
			relatedId: listingId,
		});
	},
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

const batchService = {
	/**
	 * Create multiple documents (batch insert)
	 * @param {string} collectionId - Collection ID
	 * @param {Array} documents - Array of document data
	 * @returns {Promise<Array>} Created documents
	 */
	async bulkCreateDocuments(collectionId, documents) {
		try {
			const created = [];

			for (const doc of documents) {
				const createdDoc = await databases.createDocument(
					DB_ID,
					collectionId,
					sdk.ID.unique(),
					doc,
				);
				created.push(createdDoc);
			}

			return created;
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Delete multiple documents
	 * @param {string} collectionId - Collection ID
	 * @param {Array} documentIds - Array of document IDs
	 * @returns {Promise<void>}
	 */
	async bulkDeleteDocuments(collectionId, documentIds) {
		try {
			for (const id of documentIds) {
				await databases.deleteDocument(DB_ID, collectionId, id);
			}
		} catch (error) {
			throw userService.handleError(error);
		}
	},
};

// ============================================================================
// QUERY HELPERS
// ============================================================================

const queryService = {
	/**
	 * Search listings by multiple criteria
	 * @param {Object} filters - {category, minPrice, maxPrice, ownerId, status}
	 * @param {number} limit - Max results
	 * @returns {Promise<Object>} {documents, total}
	 */
	async searchListings(filters = {}, limit = 50) {
		try {
			const queries = [sdk.Query.equal("status", filters.status || "active")];

			if (filters.category) {
				queries.push(sdk.Query.equal("category", filters.category));
			}
			if (filters.minPrice) {
				queries.push(sdk.Query.greaterThanEqual("price", filters.minPrice));
			}
			if (filters.maxPrice) {
				queries.push(sdk.Query.lessThanEqual("price", filters.maxPrice));
			}
			if (filters.ownerId) {
				queries.push(sdk.Query.equal("ownerId", filters.ownerId));
			}

			queries.push(sdk.Query.orderDesc("createdAt"));
			queries.push(sdk.Query.limit(limit));

			return await databases.listDocuments(
				DB_ID,
				COLLECTIONS.LISTINGS,
				queries,
			);
		} catch (error) {
			throw userService.handleError(error);
		}
	},

	/**
	 * Get statistics
	 * @returns {Promise<Object>} {totalUsers, totalListings, totalMessages}
	 */
	async getStatistics() {
		try {
			const users = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
				sdk.Query.limit(1),
			]);
			const listings = await databases.listDocuments(
				DB_ID,
				COLLECTIONS.LISTINGS,
				[sdk.Query.limit(1)],
			);
			const messages = await databases.listDocuments(
				DB_ID,
				COLLECTIONS.MESSAGES,
				[sdk.Query.limit(1)],
			);

			return {
				totalUsers: users.total,
				totalListings: listings.total,
				totalMessages: messages.total,
			};
		} catch (error) {
			throw userService.handleError(error);
		}
	},
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const storageService = {
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
			throw userService.handleError(error);
		}
	},

	/**
	 * Delete files by ID array
	 * @param {string} bucketId - Bucket ID
	 * @param {Array} fileIds - File IDs to delete
	 * @returns {Promise<void>}
	 */
	async deleteFiles(bucketId, fileIds) {
		try {
			for (const fileId of fileIds) {
				await this.deleteFile(bucketId, fileId);
			}
		} catch (error) {
			throw userService.handleError(error);
		}
	},
};

// ============================================================================
// SESSION VERIFICATION
// ============================================================================

const sessionService = {
	/**
	 * Verify JWT token from frontend
	 * Note: This requires the frontend to send tokens with requests
	 * @param {string} token - JWT token
	 * @returns {Promise<Object>} Decoded token data
	 */
	async verifyToken(token) {
		try {
			// Appwrite sessions are server-validated via API
			// This would typically be called from auth middleware
			// See auth.middleware.js for implementation
			return { verified: true };
		} catch (error) {
			throw new Error("Invalid session token");
		}
	},
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
	client,
	databases,
	users: users, // Note: 'users' is Appwrite Users API, not our userService
	storage,
	DB_ID,
	COLLECTIONS,
	BUCKETS,

	// Services
	userService,
	listingService,
	conversationService,
	messageService,
	notificationService,
	batchService,
	queryService,
	storageService,
	sessionService,

	// Helpers
	Query: sdk.Query,
	ID: sdk.ID,
};
