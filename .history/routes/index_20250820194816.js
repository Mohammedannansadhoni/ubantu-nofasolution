var express = require('express');
var router = express.Router();
var csrf = require('csurf');

// Public registration route (MUST be before CSRF protection)
router.get('/register/:id', function(req, res) {
    var eventId = req.params.id;
    console.log('✅ Public registration request for event:', eventId);
    
    // Redirect to the full event registration route
    res.redirect(`/event/public-registration/${eventId}`);
});

// Apply CSRF protection to all other routes
var csrfProtection = csrf();
router.use(csrfProtection);

  router.get('/', function(req,res,next){
    var messages = req.flash('error');
    
    req.session.eventLogo = 'nofa_solutions_logo.png';
      //if(req.isAuthenticated())
      //  res.redirect('/event');
      //else
      req.logout();
        res.render('user/signin', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
  })

  module.exports = router;