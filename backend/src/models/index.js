import { defineAppSetting } from "./AppSetting.js";
import { defineCategory } from "./Category.js";
import { defineConversation } from "./Conversation.js";
import { defineListing } from "./Listing.js";
import { defineMessage } from "./Message.js";
import { defineReport } from "./Report.js";
import { defineSponsoredAd } from "./SponsoredAd.js";
import { defineUser } from "./User.js";

export function initModels(sequelize) {
	const User = defineUser(sequelize);
	const Category = defineCategory(sequelize);
	const Listing = defineListing(sequelize);
	const Conversation = defineConversation(sequelize);
	const Message = defineMessage(sequelize);
	const Report = defineReport(sequelize);
	const SponsoredAd = defineSponsoredAd(sequelize);
	const AppSetting = defineAppSetting(sequelize);

	Category.hasMany(Listing, { foreignKey: "categoryId", as: "listings" });
	Listing.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

	User.hasMany(Listing, { foreignKey: "sellerId", as: "listings" });
	Listing.belongsTo(User, { foreignKey: "sellerId", as: "seller" });

	Listing.hasMany(Conversation, {
		foreignKey: "listingId",
		as: "conversations",
	});
	Conversation.belongsTo(Listing, {
		foreignKey: "listingId",
		as: "listing",
	});

	Conversation.hasMany(Message, {
		foreignKey: "conversationId",
		as: "messages",
	});
	Message.belongsTo(Conversation, {
		foreignKey: "conversationId",
		as: "conversation",
	});

	User.hasMany(Message, { foreignKey: "senderId", as: "sentMessages" });
	Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });

	User.hasMany(Report, { foreignKey: "sellerId", as: "receivedReports" });
	User.hasMany(Report, { foreignKey: "reporterId", as: "createdReports" });
	Report.belongsTo(User, { foreignKey: "sellerId", as: "seller" });
	Report.belongsTo(User, { foreignKey: "reporterId", as: "reporter" });
	Report.belongsTo(Listing, { foreignKey: "listingId", as: "listing" });
	Listing.hasMany(Report, { foreignKey: "listingId", as: "reports" });

	Conversation.belongsTo(User, { foreignKey: "buyerId", as: "buyer" });
	Conversation.belongsTo(User, { foreignKey: "sellerId", as: "seller" });

	User.hasMany(SponsoredAd, {
		foreignKey: "submittedById",
		as: "submittedSponsoredAds",
	});
	User.hasMany(SponsoredAd, {
		foreignKey: "reviewedById",
		as: "reviewedSponsoredAds",
	});
	SponsoredAd.belongsTo(User, {
		foreignKey: "submittedById",
		as: "submitter",
	});
	SponsoredAd.belongsTo(User, {
		foreignKey: "reviewedById",
		as: "reviewer",
	});

	return {
		User,
		Category,
		Listing,
		Conversation,
		Message,
		Report,
		SponsoredAd,
		AppSetting,
	};
}
