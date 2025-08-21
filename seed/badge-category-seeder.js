var BadgeCategory = require('../models/badge-category');
var mongoose = require('mongoose');

var connString = process.env.MONGODB_URI || 'localhost:27017/events';
mongoose.connect(connString);

var categories = [
    new BadgeCategory({
        code:'01',
        desc:'Visitor'
    }),
    new BadgeCategory({
        code:'02',
        desc:'Judge'
    }),
];

BadgeCategory.remove({}, function(err){
    var done=0;
    for(var i=0; i<categories.length; i++){
        categories[i].save(function(err, result){
            done++;
            if(done===categories.length){
                exit();
            }
        });
    }
})



function exit(){
    mongoose.disconnect();
}