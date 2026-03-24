import bcrypt from "bcryptjs";
import { DataTypes } from "sequelize";

export function defineUser(sequelize) {
	const User = sequelize.define(
		"User",
		{
			id: {
				type: DataTypes.INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			phone: {
				type: DataTypes.STRING,
			},
			avatar: {
				type: DataTypes.STRING,
				defaultValue: "",
			},
			location: {
				type: DataTypes.STRING,
			},
			accountType: {
				type: DataTypes.ENUM("personal", "business"),
				defaultValue: "personal",
			},
			businessName: {
				type: DataTypes.STRING,
			},
			gstOrMsme: {
				type: DataTypes.STRING,
			},
			role: {
				type: DataTypes.ENUM("user", "admin", "developer"),
				defaultValue: "user",
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				defaultValue: true,
			},
		},
		{
			tableName: "users",
			hooks: {
				beforeCreate: async (user) => {
					user.email = user.email.toLowerCase();
					user.password = await bcrypt.hash(user.password, 12);
				},
				beforeUpdate: async (user) => {
					if (user.changed("email")) {
						user.email = user.email.toLowerCase();
					}
					if (user.changed("password")) {
						user.password = await bcrypt.hash(user.password, 12);
					}
				},
			},
		},
	);

	User.prototype.comparePassword = function comparePassword(plainText) {
		return bcrypt.compare(plainText, this.password);
	};

	User.prototype.toSafeObject = function toSafeObject() {
		const raw = this.toJSON();
		delete raw.password;
		return raw;
	};

	return User;
}
