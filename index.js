var express = require('express');
var http = require('http');
var passport = require('passport');

var BearerStrategy = require('passport-http-bearer').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;

var authenticationService = require("soa-example-authentication-service-api");
var authorizationService = require("soa-example-authorization-service-api");
var bannedIpService = require("soa-example-banned-ip-service-api");
var userServiceApi = require('soa-example-user-service-api');
var utils = require('soa-example-core-utils');

var app = express();

passport.use(new BearerStrategy({}, function(token, done) {
	process.nextTick(function () {

		userServiceApi.getUserByToken(token).then(function(user){
			if ( !user ){
				return done(null, false, {type: "bearer", token: token, message: "Unknown access token: " + token});
			}
			return done(null, user);
		});
	});
}));

passport.use(new BasicStrategy({}, function(username, password, done) {
	process.nextTick(function () {
		authenticationService.authenticateUserByEmailAddressAndPassword(username, password).then(function(response){
			if ( !response.success ){
				return done(null, false, {type: "basic", username: username, password: password, message: "Unknown User: " + username} );
      		}
      		var user = response.user;
      		authorizationService.getPermissions(user.accessToken).then(function(permissions){
      			user.permissions = permissions;
      			return done (null, user);
      		}, function(err){
      			return done(null, false, { message: err.toString() });
      		});
		});
	});
}));


var createApiServer = function(port){
	app.configure(function(){
		app.set('port', port  );
		app.use(passport.initialize());
		app.use(express.logger('dev'));
		app.use(express.bodyParser({uploadDir:'./uploads', limit: '50mb'}));
		app.use(express.json({limit: '50mb'}));
		app.use(express.urlencoded({limit: '50mb'}));
		app.use(express.methodOverride());
		app.use(express.cookieParser('asd;lfkajs;ldfkj'));
		app.use(app.router);
	});


	http.createServer(app).listen(app.get('port'), function(){
	  console.log('Node is starting up');
	  console.log('Express server listening on port ' + app.get('port'));
	});

	return app;
};

var getExpressApp = function(){
	return app;
};

function ensureAuthenticated(req, res, next) {
	if ( req.isAuthenticated() ){
		return next();
	}
	
	// check if the ip address making request is banned
	var ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	bannedIpService.isIpAddressBanned(ipAddress).then(function(banned){
		if ( banned ){
			res.statusCode = 401;
			res.send({success:false, errorMessage:"This IP Address is temporarily banned.  Try again later."});
			next("This IP Address is temporarioy banned.  Try again later.");
		}
		else{
			// start checkinging headers for authentication
			if ( req.headers && req.headers.authorization && req.headers.authorization.indexOf("Basic ") >= 0 ){
				// support basic, too
				passport.authenticate('basic', { session: false }, function(err, user, object){
					if (user) {
						req.user = user;
						return next();
					}
					else{
						bannedIpService.invalidBasicCredentials(ipAddress, object.username, object.password);
						res.statusCode = 401;
                        res.send({success: false, errorMessage:"Valid User Credentials are required for Basic authentication"});
                        next("Valid User Credentials are required");
					}
				})(req, res, next);
			}
			else if ( req.headers && req.headers.authorization && req.headers.authorization.indexOf("Bearer ") >= 0 ){
				passport.authenticate('bearer', { session: false }, function (err, user, object) {
					if (user) {
						req.user = user;
						return next();
					}
					else{
						bannedIpService.invalidBearerCredentials(ipAddress, object.token);
						res.statusCode = 401;
                        res.send({success: false, errorMessage:"A Valid Bearer Token is required"});
                        next("A Valid Bearer Token is required");
					}
				})(req, res, next);
			}
			else{
				res.statusCode = 401;
				res.send({success: false, errorMessage:"A Bearer Token is required"});
				next("Missing Bearer Token");
			}
		}
	});
}

module.exports = {
	createApiServer : createApiServer,
	getExpressApp : getExpressApp,
	ensureAuthenticated: ensureAuthenticated
}