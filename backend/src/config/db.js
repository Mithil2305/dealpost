import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { initModels } from "../models/index.js";

export const sequelize = new Sequelize(
	env.DB_NAME,
	env.DB_USER,
	env.DB_PASSWORD,
	{
		host: env.DB_HOST,
		port: env.DB_PORT,
		dialect: "mysql",
		logging: false,
		define: {
			underscored: true,
		},
	},
);

export const models = initModels(sequelize);

export async function connectDB() {
	await sequelize.authenticate();
	await sequelize.sync();
	console.log("MySQL connected and models synced");
}
