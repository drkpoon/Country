var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	iso: String,
	country: String,
	capital: String,
	population: Number,
	area: Number,
	flag: Buffer,	
	flagType: String,
	anthem: String,
	anthemType: String
});

var AnchorPorfile = mongoose.model('profile', userSchema);

module.exports = AnchorPorfile;