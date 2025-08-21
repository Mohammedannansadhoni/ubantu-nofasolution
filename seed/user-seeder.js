var User = require('../models/user');
var mongoose = require('mongoose');

var connString = process.env.MONGODB_URI || 'localhost:27017/events';
mongoose.connect(connString);

var newUser = new User();

var users = [
    new User({
        email:'imran@admin.com',
        password: newUser.encryptPassword('admin123'),
        name: 'Muhammad Imran',
        role: 'admin'
    }),

];


User.remove({email:'imran@admin.com'}, function(err){
    var done=0;
    for(var i=0; i<users.length; i++){
        users[i].save(function(err, result){
            done++;
            if(done===users.length){
                exit();
            }
        });
    }
})



function exit(){
    mongoose.disconnect();
}
