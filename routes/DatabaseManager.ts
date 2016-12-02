///<reference path='../types/DefinitelyTyped/node/node.d.ts'/>
///<reference path='../types/DefinitelyTyped/express/express.d.ts'/> 

class DatabaseManager {
	private express = require('express');
	private mongoose = require('mongoose');
	private ObjectId = this.mongoose.Schema.Types.ObjectId;
	private fs = require('fs');
	private Grid = require('gridfs-stream');
	private schemas = require('./mongooseSchemas');
	
	constructor() {
		this.mongoose.connect('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
		this.Grid.mongo = this.mongoose.mongo;
	}

	registerNewUser(userId, success, fail, req, res) : void {
		this.schemas.User.findOne({ username: req.body.newusername }, function(err, user) {
				if (user) {
					return res.render('register', { title: 'Join Comicon!', 'error': 'Sorry, but the user name you selected is already taken.' });
				}
			var newUser = new User({ username: req.body.newusername, password: req.body.newpassword, userChoice: req.body.chooseuser }); //??
				newUser.save(function(err, newUser) {
					if (err) res.redirect('/register');
					req.login(newUser, function(err) {
						if (err) { return next(err); }
						return res.redirect('/profile');
					});
				});
			})	
	}


	
}