var Sequence = require('../models/sequence');
var mongoose = require('mongoose');

var connString = process.env.MONGODB_URI || 'localhost:27017/events';
mongoose.connect(connString);

var sequences = [
    new Sequence ({name:'barcode', value:'19299259221626'})
];


Sequence.remove({}, function(err){
    var done=0;
    for(var i=0; i<sequences.length; i++){
        sequences[i].save(function(err, result){
            done++;
            if(done===sequences.length){
                exit();
            }
        });
    }
})



function exit(){
    mongoose.disconnect();
}