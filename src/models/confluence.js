module.exports = function(Sequelize, Schema){
	var User = Schema.define('confluence', {

	  id : {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	  },
	  user_id:{
	    type: Sequelize.STRING
	  },
      user_name:{
	    type: Sequelize.STRING
	  },
	  user_email:{
	    type: Sequelize.STRING
	  },
      swit_code:{
	    type: Sequelize.STRING
	  },
      swit_token:{
	    type: Sequelize.TEXT
	  },
      confluence_token:{
	    type: Sequelize.TEXT
	  },
	  confluence_refresh_token:{
	    type: Sequelize.TEXT
	  },
	  confluence_domain:{
	    type: Sequelize.STRING
	  },
	  confluence_cloud_id:{
	    type: Sequelize.STRING
	  },
	  confluence_email:{
	    type: Sequelize.STRING
	  },
	  swit_channel:{
		type: Sequelize.STRING
	  },
	  confluence_project:{
		type: Sequelize.STRING
	  },
	  confluence_notification:{
		type: Sequelize.BOOLEAN, 
		allowNull: false, 
		defaultValue: true
	  },
	//   confluence_right_panel:{
	// 	type: Sequelize.JSON,
	// 	defaultValue: {}
	//   }
	  
	//   status:{
	//     type: Sequelize.boo('Active', 'InActive'), defaultValue:'Active'
	//   },
	//   is_deleted:{
	//     type: Sequelize.ENUM('1', '0'), defaultValue:'0'
	//   },

	}, {underscored: true});

	User.sync({alter :true });

	return User;
}