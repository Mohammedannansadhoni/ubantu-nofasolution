var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BadgeCategorySchema = new Schema({
    event: {type:Schema.Types.ObjectId, ref:'Event'},
    code: {type: String, required: true},
    desc: {type:String, required:true},

});

module.exports = mongoose.model('BadgeCategory',BadgeCategorySchema);
