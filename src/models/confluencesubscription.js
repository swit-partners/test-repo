module.exports = function(Sequelize, Schema){
	var User = Schema.define('confluencesubscription', {

	  id : {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	  },
		user_id:{
			type: Sequelize.STRING
		},
		pages_id:{
			type: Sequelize.STRING,
			defaultValue: null
		},
		spaces_id:{
			type: Sequelize.STRING,
			defaultValue: null
		},
        page_url:{
	    type: Sequelize.STRING
		},
		notifications:{
			type: Sequelize.STRING,
			defaultValue: "On"
		},
	    mainpage_create:{
			type: Sequelize.INTEGER,
			defaultValue: 0
		},
		mainpage_update:{
			type: Sequelize.INTEGER,
			defaultValue: 0
		},
		mainpage_comment:{
			type: Sequelize.INTEGER,
			defaultValue: 0
		},
		blog_create:{
			type: Sequelize.INTEGER,
			defaultValue: 0
		},
		childpage_create:{
			type: Sequelize.INTEGER,
			defaultValue: 0
		},
		childpage_update:{
			type: Sequelize.INTEGER,
			defaultValue: 0
		},
		childpage_comment:{
			type: Sequelize.INTEGER,
			defaultValue: 0
        },
		page_type:{
			type: Sequelize.STRING
		},
		page_name:{
			type: Sequelize.STRING
		}
	}, {underscored: true});

	User.sync({alter :true });

	return User;
}