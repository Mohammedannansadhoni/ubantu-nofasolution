var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var Schema = mongoose.Schema;

var userSchema = new Schema({
    email: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    role: {type: String, required: true},/* admin or user */
    event: {type: Schema.Types.ObjectId, ref: 'Event'}
});

userSchema.methods.encryptPassword = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(5), null);

}

userSchema.methods.validPassword = function(password){
    return bcrypt.compareSync(password, this.password);
}

module.exports = mongoose.model('User', userSchema);

