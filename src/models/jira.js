module.exports = function(Sequelize, Schema){
	var User = Schema.define('jira', {

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
      jira_token:{
	    type: Sequelize.TEXT
	  },
	  jira_refresh_token:{
	    type: Sequelize.TEXT
	  },
	  jira_domain:{
	    type: Sequelize.STRING
	  },
	  jira_cloud_id:{
	    type: Sequelize.STRING
	  },
	  jira_user_id:{
	    type: Sequelize.STRING
	  },
	  jira_email:{
	    type: Sequelize.STRING
	  },
	  swit_channel:{
		type: Sequelize.STRING
	  },
	  jira_project:{
		type: Sequelize.STRING
	  },
	 
	  jira_notification:{
		type: Sequelize.BOOLEAN, 
		allowNull: false, 
		defaultValue: true
	  },
	  jira_connects:{
		type: Sequelize.TEXT
	  }
	  
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