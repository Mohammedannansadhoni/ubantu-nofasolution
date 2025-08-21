var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BadgeCategoryCodeSchema = new Schema({
    code: {type: String, required: true},
    desc: {type:String, required:true},

});

module.exports = mongoose.model('BadgeCategoryCode',BadgeCategoryCodeSchema);
