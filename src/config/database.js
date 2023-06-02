const env = process.env.NODE_ENV || "staging"
module.exports = function (dataBaseType) {

	//Start: sequelize database connection
	var database = '';
	var username = '';
	var password = '';
	var port = "";
	var host = '';

	if (env == "local") {
		database = "swit_integration";
		username = "root";
		password = "";
		port = "3306";
		host = "127.0.0.1";
	} else if (env == "staging") {
		database = "swtiodev_db";
		username = "swtiodev_usr";
		password = "Jyr$W7KhZKh";
		port = "3306";
		host = "127.0.0.1";
	} else {

	}

	var sequelize = new dataBaseType(database, username, password, {
		host: host,
		dialect: 'mysql',
		operatorsAliases: false,
		logging: false,
		port: port,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000
		},
	});

	sequelize.authenticate().then(() => {
		console.log(`*** Connected with ${database} database. ***`);
	}).catch(err => {
		console.error('Unable to connect to the database:', err);
	});
	return sequelize;
}
