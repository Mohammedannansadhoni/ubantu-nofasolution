var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ExportFilesSchema = new Schema({
    event: {type: Schema.Types.ObjectId, ref:'Event'},
    filename: {type: String, required: true},
    creationDate: {type:Date, required:true},
    rowCount: {type:Number, required:true},
    isCompleted: {type:Boolean, required:true}
});

module.exports = mongoose.model('ExportFiles',ExportFilesSchema);
