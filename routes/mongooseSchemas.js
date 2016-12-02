///<reference path='../types/DefinitelyTyped/node/node.d.ts'/>
///<reference path='../types/DefinitelyTyped/express/express.d.ts'/> 
var express = require('express');
//var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://admin:admin@ds059195.mongolab.com:59195/cpsc310');
var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    userChoice: String,
    isContributor: Boolean,
    comics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'comic' }]
});
var profileContentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'dbUser' },
    content: String
});
var comicSchema = new mongoose.Schema({
    name: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'dbUser' },
    frames: [{ type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' }],
    comment: String,
    published: Boolean,
    private: Boolean
});
exports.User = mongoose.model('dbUser', userSchema);
exports.ProfileContent = mongoose.model('profileContent', profileContentSchema);
exports.Comic = mongoose.model('comic', comicSchema);
