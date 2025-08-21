var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SequenceSchema = new Schema({
    name: {type: String, required: true},
    value: {type:Number, required:true},

});

module.exports = mongoose.model('Sequence',SequenceSchema);
