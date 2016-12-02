///<reference path='../types/DefinitelyTyped/node/node.d.ts'/>
///<reference path='../types/DefinitelyTyped/express/express.d.ts'/> 


function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	req.session.error = 'Please sign in!';
	res.redirect(302,'/');
}

class Router {

	constructor() {

		var express = require('express');
		var passport = require('passport');
		var router = express.Router();

		//Import mongoose schemas
		var mongoose = require('mongoose');
		var schemas = require('./mongooseSchemas');
		var User = schemas.User;
		var ProfileContent = schemas.ProfileContent;
		var Comic = schemas.Comic;

		//Setting up GridFs storage
		var fs = require('fs');
		var Grid = require('gridfs-stream');
		Grid.mongo = mongoose.mongo;

		//Configuring multer for multipart-form upload
		var multer = require('multer');
		var upload = multer({ dest: 'uploads/' });

		router.get('/', function(req, res, next) {
			if (req.isAuthenticated()) {
				res.redirect('/profile');
			}
			var error = req.session.login_error;
			req.session.login_error = null;
			res.render('login', { title: 'Welcome to Comicon!', 'error': error });
		});

		router.post('/login', function(req, res, next) {
			console.log('in login')
			//passport.authenticate('local', { successRedirect: '/profile',failureRedirect: '/',failureFlash: false })
			passport.authenticate('local', function(err, user, info) {
				if (err) { return next(err) }
				if (!user) {
					req.session.login_error = info.message;
					return res.redirect('/');
				}
				req.logIn(user, function(err) {
					if (err) { return next(err); }
					return res.redirect('/profile');
				});
			})(req, res, next);
		});

		/* GET register page */
		router.get('/register', function(req, res) {
			if (req.isAuthenticated()) {
				return res.redirect('/profile');
			}
			return res.render('register', { title: 'Join Comicon!' });

		});

		/* POST new user into database */
		router.post('/register', function(req, res, next) {
			User.findOne({ username: req.body.newusername }, function(err, user) {
				if (user) {
					return res.render('register', { title: 'Join Comicon!', 'error': 'Sorry, but the user name you selected is already taken.' });
				}
				console.log(req.body.user_type);
				var contributor_selected = (req.body.user_type === "contributor");
				console.log(contributor_selected);
				var newUser = new User({
					username: req.body.newusername, password: req.body.newpassword, userChoice: req.body.user_type, isContributor: contributor_selected
				}); 
				console.log(newUser.isContributor);
				newUser.save(function(err, newUser) {
					if (err) res.redirect('/register');
					req.login(newUser, function(err) {
						if (err) { return next(err); }
						return res.redirect('/profile');
					});
				});
			})

		});
		//PROFILE
		/* GET profile page */
		router.get('/profile', this.ensureAuthenticated, function(req, res) {
			ProfileContent.findOne({ userId: req.user._id }, function(error, profile_content) {
				var text_content = "";
				var host_url = req.get('host');
				if (profile_content) text_content = profile_content.content;
				return res.render('profile', {
					title: 'Profile', 'pp_path': host_url + '/img', 'display_username': req.user.username,
					'display_content': text_content, 'is_editor' : req.user.isContributor
				});
			});
		});

		/* GET gallery page */
		router.get('/gallery', this.ensureAuthenticated, function(req, res) {
			var host_url = req.get('host');
			Comic.find({ owner: req.user._id }, function(e, comics) {
				var published = []
				var unpublished = []

				if (comics) {
					for (var i = 0; i < comics.length; i++) {
						if (comics[i].published == true) {
							published.push(comics[i]);

						}
						else {
							unpublished.push(comics[i]);

						}
					}
					res.render('gallery', {
						title: 'Gallery', 'display_username': req.user.username,
						'published_comics': published, 'inprogress_comics': unpublished,
						'host': host_url, 'is_contributor' : req.user.isContributor
					});
				}
				else { res.render('gallery') }
			});

		});

		/* GET New Comic page */
		router.get('/newComic', this.ensureAuthenticated, function(req, res) {
			res.render('newComic', { title: 'Start a new Comic!' });
		});

		router.get('/otherUserComic', this.ensureAuthenticated, function(req, res) {
			res.render('otherUserComic', { title: 'other comic' });
		});

		/* GET Home page */
		router.get('/home', this.ensureAuthenticated, function(req, res) {
			var host_url = req.get('host');
			Comic.find({ published : true}).populate('owner').exec(function(e, comics) {
				if (comics) {
					res.render('home', {
						title: 'Home', 'display_username': req.user.username,
						'published_comics': comics,
						'host': host_url, 'is_contributor' : req.user.isContributor
					});
				}
				else { res.render('home') }
			})

		});


		/* GET edit page */
		router.get('/editpage', this.ensureAuthenticated, function(req, res) {
			ProfileContent.findOne({ userId: req.user._id }, function(e, profile_content) {
				var text = "";
				var text_content = "";
				var host_url = req.get('host');
				if (profile_content) {
					text = profile_content.content;
				}
				return res.render('editpage', {
					'pp_path': host_url + '/img',
					title: 'Edit Profile', 'display_content': text, 'display_username': req.user.username
				});
			});

		});

		router.post('/editpage', function(req, res) {
			ProfileContent.update({ userId: req.user._id },
				{ userId: req.user._id, content: req.body.profile_content }, { upsert: true }, function(err) { });
			res.redirect('/profile');
		})
		/* Updating Profile pic */
		router.post('/updateProfile', upload.single('profilePicture'), function(req, res) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);
				var tempfile = req.file.path;
				var origname = req.file.originalname;
				conn.collection('fs.files').findOne({ "metadata.user": req.user.username }, function(err, doc) {
					if (doc) {
						console.log('about to delete ' + doc.filename);
						gfs.remove({ _id: doc._id }, function(err) {
							if (!err) console.log('success');
						});
					}
					// streaming to gridfs
					var writestream = gfs.createWriteStream({
						filename: 'pro_pic_' + req.user.username + '.' + req.file.mimetype.split('/')[1],
						mode: "w",
						content_type: req.file.mimetype,
						metadata: { user: req.user.username }
					});
					writestream.on('close', function(file) {
						// do  something with `file` 
						console.log(file.filename + ' written to mongodb.');
						fs.unlink(tempfile);
						res.redirect('/editpage');
					});
					fs.createReadStream(tempfile).pipe(writestream);

				})

			});
		});

		router.get('/logout', function(req, res) {
			req.logout();
			res.redirect('/');
		});

		//Image Reques for profile picture
		router.get('/img/:user_name', function(req, res, next) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);
				var a = req.user.username.trim();
				conn.collection('fs.files').findOne({ "metadata.user": req.params.user_name }, function(err, doc) {
					if (doc) {
						if (err) return next(err);
						var readstream = gfs.createReadStream({
							filename: doc.filename
						});
						//error handling, e.g. file does not exist 
						readstream.on('error', function(err) {
							console.log('An error occurred!', err);
						});
						//readstream.on('finish', function())
						res.set('Content-Type', 'image/jpg');
						readstream.pipe(res);
					}
					else { res.redirect('/images/default.jpg')}
				});

			});
		});

		router.get('/frames/:frame_id', function(req, res, next) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);
				//console.log(req.params.frame_id);
				gfs.findOne({ _id: req.params.frame_id }, function(err, frame) {
					//console.log(frame);
					if (frame) {
						if (err) return next(err);
						var readstream = gfs.createReadStream({
							_id: frame._id
						});
						//error handling, e.g. file does not exist 
						readstream.on('error', function(err) {
							console.log('An error occurred!', err);
						});
						readstream.on('finish', function(err) {
							console.log('Frame successfully read from mongo.')
						})
						//readstream.on('finish', function())
						res.set('Content-Type', 'image/jpg');
						readstream.pipe(res);
					}
					else {
						res.redirect('/images/magazine.png');
					}
				});

			});
		});

		router.post('/myComics', this.ensureAuthenticated, function(req, res) {
			var newComic = new Comic({ name: req.body.projectName, owner: req.user._id, comment: req.body.comic_comments, published: false });
			newComic.save(function(err) {
				if (err) {
					console.log('An error ocurred inserting comic ' + newComic.name + '.');
					res.redirect('/gallery');
				}
				else {
					console.log('Comic ' + newComic.name + ' inserted.');
					User.findOne({ _id: req.user._id }, function(err, user) {
						user.comics.push(newComic._id);
						res.redirect('/myComics/' + newComic._id);
					})
				}

			});
		});

		router.get('/myComics/:id', this.ensureAuthenticated, function(req, res) {
			var host_url = req.get('host');
			var curr_user = req.user._id;
			var is_public = false;
			console.log('current user is ' + curr_user);
			Comic.findOne({ _id: req.params.id }, function(err, comic) {
				if (err || !(comic)) {
					console.log('Requested comic ' + req.params.id + ' does not exist.');
					res.redirect('/gallery');
				} else {
					console.log('comic owner is ' + comic.owner);
					if(comic.owner.equals(curr_user) || !comic.private && req.user.isContributor)
						is_public = true;
					res.render('ComicViewPage', { 'comic_id': req.params.id, 'public': is_public, 'contributor': req.user.isContributor,
					'frame_ids': comic.frames, 'host': host_url ,'name': comic.name, 'comment': comic.comment, 'is_contributor': req.user.isContributor});
				}
			})
		});

		router.get('/Workspace/:id', this.ensureAuthenticated, function(req, res) {
			var host_url = req.get('host')
			var curr_user = req.user._id; 
			var mine = false;
			console.log('current user is ' + curr_user);
			Comic.findOne({ _id: req.params.id }, function(err, comic) {
				//console.log(comic);
				if (err || !(comic)) {
					console.log('Requested comic ' + req.params.id + ' does not exist.');
					res.redirect('/Gallery');
				}else { 
					console.log('comic owner is ' + comic.owner);
					if(comic.owner.equals(curr_user))
						mine = true;
					res.render('Workspace',{'comic_id': req.params.id, 'frame_ids': comic.frames, 'host': host_url,
						'published': comic.published, 'private': comic.private, 'mine': mine,'name': comic.name,
						'comment': comic.comment});
				}
			});
		});

		router.post('/editcomment/:comic_id', this.ensureAuthenticated, function(req, res) {
			Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
				if (req.body.comic_comments) {
					comic.comment = req.body.comic_comments;

				}
				/*
				if(req.body.projectName){
					comic.name = req.body.projectName; 
				}*/
				if (!err) { console.log('comic comment changed'); }
				comic.save(function(err) {
					if (!err) { console.log('successfully changed comic comment'); }
				})
			})
			res.redirect('/Workspace/' + req.params.comic_id);
		});

		router.post('/editprojectname/:comic_id', this.ensureAuthenticated, function(req, res) {
			Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
				/*if (req.body.comic_comments) {
					comic.comment = req.body.comic_comments;

				}*/
				if (req.body.projectName) {
					comic.name = req.body.projectName;
				}
				if (!err) { console.log('comic comment changed'); }
				comic.save(function(err) {
					if (!err) { console.log('successfully changed comic comment'); }
				})
			})
			res.redirect('/Workspace/' + req.params.comic_id);
		});


		router.get('/deletecomic/:comic_id', this.ensureAuthenticated, function(req, res) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);

				gfs.files.find({ "metadata.comic": req.params.comic_id }, function(err, frames) {
					if (err) { console.log('fail'); }
					console.log('frame before deletion');
					console.log(frames);
					if (frames) {
						frames.forEach(function(frame, index, array) {
							gfs.remove({ _id: frame._id }, function(err) {
								if (!err) console.log('Frame ' + frame._id + ' removed.')
							});
						});
					}
				});

				Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
					if (!comic || err) console.log('Error or no comic found with id: ' + req.params.comic_id);
					comic.remove();
					res.redirect('/gallery');
				})
			})
		});

		router.get('/deleteframe/:comic_id/:frame', this.ensureAuthenticated, function(req, res) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);
				console.log('this is what is deleted');

				Comic.findOne({ frames: req.params.frame }, function(err, comic) {
					console.log('this comic'); 
					console.log(comic); 
					for (var i = 0; i < comic.frames.length; i++){
						if(comic.frames[i] == req.params.frame){
							console.log('does it make it in here?');	
							comic.frames.pull(comic.frames[i]);
							gfs.remove({ _id: req.params.frame }, function(err) {
								if (!err) console.log('Frame ' + req.params.frame + ' removed.')
							});
							comic.save(function(err) {
								if (err) return;
								res.redirect('/Workspace/' + req.params.comic_id);
							})
				}
			}
					console.log('this comic is here?');
					console.log(comic); 

				});
				/*gfs.remove({ _id: req.params.frame }, function(err) {
							if (!err) console.log('Frame ' + req.params.frame + ' removed.')
				});*/
					
					
					//res.redirect('/Workspace/' + req.params.comic_id);
			
			})
		});

		
		router.get('/swapleft/:comic_id/:frame', this.ensureAuthenticated, function(req, res) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);
				Comic.findOne({ frames: req.params.frame }, function(err, comic) {
					console.log("the comic to be swapped" + comic); 
					for (var i = 0; i < comic.frames.size; i++) {
						console.log("original frame order"); 
						console.log(comic); 
						if (req.params.frame == comic.frames[i]) {
							if (comic.frames[i - 1]  != null) {
								var temp = comic.frames[i];
								comic.frames[i] = comic.frames[i - 1];
								comic.frames[i - 1] = temp;
								console.log("new frame order"); 
								console.log(comic);
								res.redirect('/Workspace/' + req.params.comic_id);
							}
						}
					}
					res.redirect('/gallery'); 
				})
			})
		});


        // set the published parameter to true when the published button is pressed
		router.post('/publishcomic/:comic_id', this.ensureAuthenticated, function(req, res) {
			Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
				comic.published = true;
				if (!err) { console.log('publish complete'); }
				comic.save(function(err) {
					if (!err) { console.log('successful publish'); }
				})

			})

			res.redirect('/gallery');
		});

		
		// set the private parameter to true when the private button is pressed
		router.post('/privatecomic/:comic_id', ensureAuthenticated, function(req, res) {
			Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
				comic.private = true;
				if (!err) { console.log('comic privatized'); }
				comic.save(function(err) {
					if (!err) { console.log('successfully privatized comic'); }
				})
			})
			console.log('hello');
			res.redirect('/Workspace/'+ req.params.comic_id);
		});
		

        // set the published parameter to false when we want to unpublish a comic
        router.post('/unpublishcomic/:comic_id', this.ensureAuthenticated, function(req, res) {
			Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
				comic.published = false;
				if (!err) { console.log('unpublish complete'); }
				comic.save(function(err) {
					if (!err) { console.log('successful unpublish'); }
				})

			})

			res.redirect('/gallery');
		});

		// set the private parameter to false when the private button is pressed
		router.post('/publiccomic/:comic_id', ensureAuthenticated, function(req, res) {
			Comic.findOne({ _id: req.params.comic_id }, function(err, comic) {
				comic.private = false;
				if (!err) { console.log('comic publicized'); }
				comic.save(function(err) {
					if (!err) { console.log('successfully publicized comic'); }
				})
			})
			res.redirect('/Workspace/'+ req.params.comic_id);
		});


		router.post('/myComics/:comic_id/frames', this.ensureAuthenticated, upload.single('newFrame'), function(req, res) {
			var conn = mongoose.createConnection('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
			conn.once('open', function() {
				var gfs = Grid(conn.db, mongoose.mongo);
				var tempfile = req.file.path;
				var origname = req.file.originalname;
				// streaming to gridfs
				var writestream = gfs.createWriteStream({
					filename: 'frame_' + req.params.comic_id + '.' + req.file.mimetype.split('/')[1],
					mode: "w",
					content_type: req.file.mimetype,
					metadata: { comic: req.params.comic_id }
				});
				writestream.on('close', function(file) {
					// do  something with `file` 
					console.log(file.filename + ' written to mongodb.');
					fs.unlink(tempfile);
					Comic.findById(req.params.comic_id, function(err, comic) {
						if (err) (res.send(300))
						if (comic) {
							if (!comic.frames) {
								comic.frames = [];
							}
							comic.frames.push(file._id);
							comic.save(function(err) {
								if (err) return;
								res.redirect('/Workspace/' + req.params.comic_id);
							})
						}
						else {
							console.log('Did not find comic that frame ' + file._id + ' belongs to.');
						}
					});

				});
				fs.createReadStream(tempfile).pipe(writestream);
			});
		});
		
		router.post('/search', this.ensureAuthenticated, function(req,res,next){
			/*var keywords = req.body.search_params.split(' ');
			var regex = '.*'
			keywords.forEach(function(word,index,array){
				regex = regex + '(' + word + ')*.*'
			});
			console.log(regex);*/
			var host_url = req.get('host');
			if (req.body.search_type === "title") {
				Comic.find({ $or: [{ name: { $regex: ".*" + req.body.search_params, $options: 'i' } }, {comment: { $regex: ".*" + req.body .search_params, $options: 'i' }}] })
				.populate('owner').exec(function(err,comics){
					if (err) return next(err);
					if (comics) {
						console.log('Found comic with name.');
						res.render('search_results', { 'results': comics, 'result_type': 'comics', 'is_contributor': req.user.isContributor, 'host': host_url });
					}
					else {
						res.render('serach_results', {'result_type': 'comics', 'is_contributor': req.user.isContributor, 'host': host_url})}
				});
			}
			else if (req.body.search_type === "author") {
				User.find({ username: { $regex: ".*" + req.body.search_params + ".*", $options: 'i' } }, function(err, users) {
					if (err) return next(err);
					console.log('Searched for user containing ' + req.body.search_params);
					res.render('search_results', { 'results': users, 'result_type': 'users', 'is_contributor': req.user.isContributor, 'host': host_url });
				});
			}
			else res.render('search_results');
		});
		
		router.get('/profile/:username/:user_id', function(req, res, next) {
			ProfileContent.findOne({ userId : req.params.user_id }, function(error, profile_content) {
			var text_content = "";
			var host_url = req.get('host');
			if (profile_content) text_content = profile_content.content;
				return res.render('foreignprofile', {
					title: 'Profile', 'pp_path': host_url + '/img', 'display_username': req.params.username,
					'display_content': text_content, 'is_editor' : req.user.isContributor
				});
			});
		});

		router.post('/profile', function(req, res) {
			res.redirect('/profile');
		});

		router.post('/gallery', function(req, res) {
			res.redirect('/gallery');
		});

		router.get('/return/:comic_id', function(req, res) {
			res.redirect('/myComics/' + req.params.comic_id);
		});

		module.exports = router;
	}

	//Passport Authentication Helper
	ensureAuthenticated(req, res, next) : void {
		if (req.isAuthenticated()) { return next(); };
		//to turn off authenitcation, unomment the following line:
		//return next();
		req.session.error = 'Please sign in!';
		res.redirect(302,'/');
	}

	getHost(req){
		return req.get('host');
	}

}

var router = new Router(); 