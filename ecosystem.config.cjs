module.exports = {
	apps: [
		{
			name: "dealpost-api",
			script: "./backend/server.js",
			cwd: "/var/www/dealpost",
			interpreter: "node",
			instances: 2,
			exec_mode: "cluster",
			watch: false,
			max_memory_restart: "512M",
			env: {
				NODE_ENV: "production",
				PORT: 5000,
			},
			error_file: "/var/log/dealpost/error.log",
			out_file: "/var/log/dealpost/out.log",
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
		},
	],
};
