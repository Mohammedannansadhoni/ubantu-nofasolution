var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');

var User = require('../models/user');
var Event = require('../models/event');

var csrfProtection = csrf();
router.use(csrfProtection);

router.get('/', function(req,res){
    var messages=[];
    
    User.find({role:'user'})
    .populate('event') 
    .exec(function(err, data){
        if(err) throw err;

        

        res.render('user/index', {messages: messages, users:data});
        
    });

  });
  
  router.get('/create', function(req,res,next){
    var messages = req.flash('error');

    Event.find({}, function(err, data){
        if(err) throw err;

        res.render('user/create', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0, events:data});
    });

    
  });  

  router.post('/create', passport.authenticate('local.signup', {
    successRedirect: '/user',
    failureRedirect: '/user/create',
    failureFlash: true
  }));

  router.get('/edit/:id', function(req,res){
    var messages=[];

    var userId = req.params.id;
    User.findById(userId, function(err, userdata){
        if(err) throw err;

        Event.find({}, function(err, data){
            if(err) throw err;
    
            res.render('user/edit', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0, events:data, edituser:userdata});
        });

        
    });
  });

  router.post('/edit', function(req,res){
    var messages=[];

    var userId = req.body.userId;

    User.findById(userId, function(err, userdata){
        if(err) throw err;

        userdata.name = req.body.name;
        userdata.email = req.body.email;
        userdata.password = userdata.encryptPassword(req.body.password);
        userdata.event = req.body.event;

        userdata.save(function(err, result){
            res.redirect('/user');
        });

        
    });
  });  

  router.get('/change-password', function(req,res){
    var messages=[];

    res.render('user/change-password', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
    
  });

  router.post('/change-password', function(req,res){
    var messages=[];

    var userId = req.user._id;

    if(req.body.password != req.body.confirmPassword){
      messages.push('New Password and Confirm Password do not match');
      res.render('user/change-password', {messages:messages, hasErrors: messages.length>0});
      return;
    }

    User.findById(userId, function(err, userdata){
        if(err){
          messages.push(err);
          res.render('user/change-password', {messages:messages, hasErrors: messages.length>0});
          return;
        }

        userdata.password = userdata.encryptPassword(req.body.password);

        userdata.save(function(err, result){
          if(err){
            messages.push(err);
            res.render('user/change-password', {messages:messages, hasErrors: messages.length>0});
            return;
          }

            res.redirect('/event');
        });

        
    });


   
  }); 

  router.get('/delete/:id', function(req,res){
    var messages=[];

    var userId = req.params.id;
    User.findById(userId, function(err, userdata){
        if(err) throw err;

        res.render('user/delete', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0, user:userdata});

    });
  });

  router.post('/delete', function(req,res){
    var messages=[];

    var userId = req.body.userId;

    User.findByIdAndRemove(userId, function(err, result){
        console.log(`deleted user ${result.name}`);
        res.redirect('/user')
    });
  }); 

  router.get('/delete-all', function(req,res){

    User.remove({email:{$ne:'admin@admin.com'} }, function(err){
      res.redirect('/user');
    })

  });


router.get('/profile', isLoggedIn ,function(req,res,next){
    res.render('user/profile');
  
  });

  router.get('/logout',isLoggedIn ,function(req,res,next){

    

    req.logout();
    res.redirect('/');
  });

router.use('/', notLoggedIn, function(req,res,next){
    next();
})

router.get('/signup', function(req,res,next){
    var messages = req.flash('error');
  
    res.render('user/signup', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
  
  });
  
  router.post('/signup', passport.authenticate('local.signup', {
    successRedirect: '/event',
    failureRedirect: '/user/signup',
    failureFlash: true
  }));
  

  


  router.get('/signin', function(req,res,next){
    var messages = req.flash('error');
      req.session.eventLogo = 'nofa_solutions_logo.png';

      res.render('user/signin', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
  })
  
  router.post('/signin', passport.authenticate('local.signin', {
    successRedirect: '/event',
    failureRedirect: '/user/signin',
    failureFlash: true
  }));
  


  module.exports = router;

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/');
    
}

function notLoggedIn(req, res, next){
    if(!req.isAuthenticated()){
        return next();
    }
    res.redirect('/');
    
}