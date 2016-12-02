var request = require('request');
var assert = require('assert');
var chai = require('chai');

describe('Array', function() {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function (done) {
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
      done();
    });
  });
  describe('#LogInTests', function() {
  	it('login page should be accessible', function(done){
  		request.get('http://localhost:3000', function(error, response, body) {
  			//console.log(response);
  			if (!error && response.statusCoode == 200) {
    			console.log('requested'); // Show the HTML for the Google homepage.
    			chai.expect(response.statusCode).to.equal(200);
  			}
  			done();
  		})
  	});
  	it('logging in as valid user should result in redirec to /profile', function(done){
  		request.post({url: 'http://localhost:3000/login', form: { 'password':'ariel', 'username':'mermaid'}}, function(error, response,body){
  			if (error) assert.fail(0,1,'Unknown error.');
  			chai.expect(response.body).to.contain('Redirecting to /profile');
  			chai.expect(response.statusCode).to.equal(302);
  			done();
  		});
  	});
  	it('logging in as invalid user should result in redirecti to /', function(done){
  		request.post({url: 'http://localhost:3000/login', form: {password:'aaa', username:'invalid'}}, function(error, response,body){
  			if (error) assert.fail(0,1,'Unknownn error.');
  			chai.expect(response.body).to.contain('Redirecting to /');
  			chai.expect(response.statusCode).to.equal(302);
  			done();
  		});

  	});
  	it('logging in as valid user, wront password', function(done){
  		request.post({url: 'http://localhost:3000/login', form: {password:'aaa', username:'mermaid'}}, function(error, response,body){
  			if (error) assert.fail(0,1,'Unknownn error.');
  			chai.expect(response.body).to.contain('Redirecting to /');
  			chai.expect(response.statusCode).to.equal(302);
  			done();
  		});
  	it('logging in as invalid user, correct password /', function(done){
  		request.post({url: 'http://localhost:3000/login', form: {password:'ariel', username:'mermid'}}, function(error, response,body){
  			if (error) assert.fail(0,1,'Unknownn error.');
  			chai.expect(response.body).to.contain('Redirecting to /');
  			chai.expect(response.statusCode).to.equal(302);
  			done();
  		});

  	});
  	});
  });

  describe('#RegisterTests', function(){
  	it('taken username done in manual testing', function(){
  		chai.expect(true).to.be.true;
  	})
  	it('registering with taken username', function(done) {
  		request.post({url: 'http://localhost:3000/register', form: {newpassword:'testpw', newusername:'mermaid'}}, function(error, response,body){
  			if (error) assert.fail(0,1,'Unknownn error.');
  			//no redirect, but render page again
  			chai.expect(response.statusCode).to.equal(200);
  			done();
  		});
  	});
  });

  describe('#autenticationRedirectTest', function(){
  	it('request /profile', function(done) {
  		request.get('http://localhost:3000/profile', function(err,res,body){
  			if (err) assert.fail(0,1,'Unknownn error.');
  			console.log(res.statusCode);
  			chai.expect(res.body).to.contain('<title>Welcome to Comicon!');
  			done();
  		});
  	});
  	it('request /gallery', function(done) {
  		request.get('http://localhost:3000/gallery', function(err,res,body){
  			if (err) assert.fail(0,1,'Unknownn error.');
  			chai.expect(res.body).to.contain('<title>Welcome to Comicon!');
  			done();
  		});
  	});
  	it('request /editpage', function(done) {
  		request.get('http://localhost:3000/editpage', function(err,res,body){
  			if (err) assert.fail(0,1,'Unknownn error.');
  			chai.expect(res.body).to.contain('<title>Welcome to Comicon!');
  			done();
  		});
  	});
  	it('request /profile', function(done) {
  		request.get('http://localhost:3000/home', function(err,res,body){
  			if (err) assert.fail(0,1,'Unknownn error.');
  			chai.expect(res.body).to.contain('<title>Welcome to Comicon!');
  			done();
  		});
  	});  	
  });	
});
