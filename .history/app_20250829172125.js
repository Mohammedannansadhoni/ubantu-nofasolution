require('dotenv').config();
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var Handlebars = require('handlebars');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var flash = require('connect-flash');
var validator = require('express-validator');
var MongoStore = require('connect-mongo')(session);
var cache = require('memory-cache');
var moment = require('moment');
var json2xls = require('json2xls');
//var timeout = require('connect-timeout');
//var upload = require('jquery-file-upload-middleware');

var Country = require('./models/country');
var BadgeCategory = require('./models/badge-category');
var Lookups = require('./models/lookups');
var BadgeCategoryCode = require('./models/badge-category-code');

//heroku_141w6cdm

var connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/events';
var options = {
  "server" : {
    "socketOptions" : {
      "keepAlive" : 300000,
      "connectTimeoutMS" : 30000
    }
  },
  "replset" : {
    formField: function(fieldName, fieldLabel, fieldType, fieldValue, fieldMandatory, badgeCategories){
      var results='';
      results+='<div class="form-group">';
      results+='<label for="' + fieldName + '">' + fieldLabel + '</label>';
      if(fieldType=='countries'){
        results+='<select class="form-control" id="' + fieldName + '" name="' + fieldName + '" ' + (fieldMandatory ? 'required':'') +  '>';
        results+='<option value="">Select Country</option>';
        var lookups = new Lookups();
        for(var i=0; i<lookups.countries.length; i++){
          results += '<option value="' + lookups.countries[i].desc + '" ' + (fieldValue == lookups.countries[i].desc ? 'selected' : '') + '>' + lookups.countries[i].desc + '</option>\n';
        }
        results+='</select>';
      }
      else if(fieldType=='badgeCategories'){
        results+='<select class="form-control" id="' + fieldName + '" name="' + fieldName + '" ' + (fieldMandatory ? 'required':'') +  '>';
        results+='<option value="">Select Badge Category</option>';
        for(var i=0; i<badgeCategories.length; i++){
          results += '<option value="' + badgeCategories[i].desc + '" ' + (fieldValue == badgeCategories[i].desc ? 'selected' : '') + '>' + badgeCategories[i].desc + '</option>\n';
        }
        results+='</select>';
      }
      else if(fieldType=='titles'){
        results+='<select class="form-control" id="' + fieldName + '" name="' + fieldName + '" ' + (fieldMandatory ? 'required':'') +  '>';
        results+='<option value="">Select Title</option>';
        var lookups = new Lookups();
        for(var i=0; i<lookups.titles.length; i++){
          results += '<option value="' + lookups.titles[i] + '" ' + (fieldValue == lookups.titles[i] ? 'selected' : '') + '>' + lookups.titles[i] + '</option>\n';
        }
        results+='</select>';
      }
      else if(fieldType=='file'){
        results+='<input type="file" id="' + fieldName + '" name="' + fieldName + '" accept="image/*" ' + (fieldMandatory ? 'required':'') +  ' class="form-control">';
        if(fieldValue) {
          results+='<br><small>Current file: ' + fieldValue + '</small>';
          results+='<br><img src="/uploads/' + fieldValue + '" style="max-width: 100px; max-height: 100px;" />';
        }
      }
      else {
        results+='<input type="text" id="' + fieldName + '" name="' + fieldName + '" value="' + fieldValue + '" ' + (fieldMandatory ? 'required':'') +  '  class="form-control">';
      }
      results+='</div>';
      return new Handlebars.SafeString(results);
    },

    eq: function(a, b) {
      return a === b;
    },
    option: function (codes, selectedValue) {
      var results ='';
      for(var i=0; i<codes.length; i++){
        results += '<option value="' + codes[i]._id + '" ' + (selectedValue == codes[i]._id ? 'selected' : '') + '>' + codes[i].desc + '</option>\n';
  
      }
      return new Handlebars.SafeString(results);
    },

    eventOption: function (codes, selectedValue) {
      var results ='';
      for(var i=0; i<codes.length; i++){
        results += '<option value="' + codes[i]._id + '" ' + (selectedValue && selectedValue.equals(codes[i]._id) ? 'selected' : '') + '>' + codes[i].eventName + '</option>\n';
  
      }
      return new Handlebars.SafeString(results);
    },

    badgeCategoryOption: function (selectedValues, badgeCategorycodes) {
      


      var results ='';
      for(var i=0; i<badgeCategorycodes.length; i++){
        var isChecked = '';
        for(var j=0; j<selectedValues.length; j++){
          if(selectedValues[j].code == badgeCategorycodes[i].code)
            isChecked='checked';
        }

        var oddEven = i % 2 == 0 ? 'even':'odd';

        results += '<tr class="' + oddEven + '">';
        results += '<td class="col-xs-3">' + badgeCategorycodes[i].desc + '</td>';
        results += '<td class="col-xs-9"><input type="checkbox" class="form-control" name="' + badgeCategorycodes[i].code + '_badgeCategory" ' + isChecked + '></td>';
        results += '</tr>';

        //results += '<tr><td><input type="checkbox"  name="' + lookups.badgeCategories[i].code + '_badgeCategory" ' + isChecked + '> &nbsp;' + lookups.badgeCategories[i].desc + '</td></tr>\n';
  
      }
      return new Handlebars.SafeString(results);
     

    },

    formField: function(fieldName, fieldLabel, fieldType, fieldValue, fieldMandatory, badgeCategories){
      var results='';

      results+='<div class="form-group">';
      results+='<label for="' + fieldName + '">' + fieldLabel + '</label>';


      if(fieldType=='countries'){
  results+='<select class="form-control" id="' + fieldName + '" name="' + fieldName + '" ' + (fieldMandatory ? 'required':'') +  '>';
  results+='<option value="">Select Country</option>';

        var lookups = new Lookups();
        
        for(var i=0; i<lookups.countries.length; i++){
          results += '<option value="' + lookups.countries[i].desc + '" ' + (fieldValue == lookups.countries[i].desc ? 'selected' : '') + '>' + lookups.countries[i].desc + '</option>\n';
    
        }
        
        results+='</select>';
      }

      
      else if(fieldType=='badgeCategories'){
  results+='<select class="form-control" id="' + fieldName + '" name="' + fieldName + '" ' + (fieldMandatory ? 'required':'') +  '>';
  results+='<option value="">Select Badge Category</option>';

        for(var i=0; i<badgeCategories.length; i++){
          results += '<option value="' + badgeCategories[i].desc + '" ' + (fieldValue == badgeCategories[i].desc ? 'selected' : '') + '>' + badgeCategories[i].desc + '</option>\n';
    
        }
        results+='</select>';
      }

      else if(fieldType=='titles'){
  results+='<select class="form-control" id="' + fieldName + '" name="' + fieldName + '" ' + (fieldMandatory ? 'required':'') +  '>';
  results+='<option value="">Select Title</option>';

        var lookups = new Lookups();

        for(var i=0; i<lookups.titles.length; i++){
          results += '<option value="' + lookups.titles[i] + '" ' + (fieldValue == lookups.titles[i] ? 'selected' : '') + '>' + lookups.titles[i] + '</option>\n';
    
        }
        results+='</select>';
      }

      else if(fieldType=='file'){
        results+='<input type="file" id="' + fieldName + '" name="' + fieldName + '" accept="image/*" ' + (fieldMandatory ? 'required':'') +  ' class="form-control">';
        if(fieldValue) {
          results+='<br><small>Current file: ' + fieldValue + '</small>';
          results+='<br><img src="/uploads/' + fieldValue + '" style="max-width: 100px; max-height: 100px;" />';
        }
      }

      else {
        results+='<input type="text" id="' + fieldName + '" name="' + fieldName + '" value="' + fieldValue + '" ' + (fieldMandatory ? 'required':'') +  '  class="form-control">';
      }
      

      results+='</div>';

      return new Handlebars.SafeString(results);
    },

    formatDate: function(datetime, format){
      var DateFormats = {
        short: "DD MMMM - YYYY",
        long: "dddd DD.MM.YYYY HH:mm",
        custom: "DD/MM/YYYY",
        custom2: "DD/MM/YYYY HH:mm",
      };
      // Default to 'YYYY-MM-DD' if format is not a string
      if (!format || typeof format !== 'string') {
        format = 'YYYY-MM-DD';
      } else {
        format = DateFormats[format] || format;
      }
      return moment(datetime).format(format);
    },

    add: function(a, b) {
      return a + b;
    }

  },
  defaultLayout:'layout',
  extname:'.hbs'
});


app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser());
app.use(session({
  secret:'mysupersecret', 
  resave:false, 
  saveUninitialized:false ,
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  cookie: {maxAge: 180 * 60 * 1000}
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(json2xls.middleware);


app.use(function(req,res,next){
  res.locals.login = req.isAuthenticated();
  res.locals.session = req.session;
  res.locals.user = req.user;
  
  if(req.user != null)
    res.locals.isAdmin = req.user.role=='admin';


  if(cache.get('countries') && cache.get('badgeCategories')){
    res.locals.countries = cache.get('countries');
    res.locals.badgeCategories = cache.get('badgeCategories');
    console.log('finished loading cache');
    next();
  }
  else {
    Country.find(function(err,countries){
      BadgeCategory.find(function(err,badgeCategories){
          cache.put('countries',countries);
          cache.put('badgeCategories', badgeCategories);

          res.locals.countries = cache.get('countries');
          res.locals.badgeCategories = cache.get('badgeCategories');
          
          console.log('finished loading lookup tables');

          next();
      });//badge categories
    });//countries
  }



  
});

app.use('/user', userRoutes);
//app.use(haltOnTimedout);
app.use('/event', eventRoutes);
app.use('/backup', backupRoutes);
//app.use(haltOnTimedout);
app.use('/', index);
//app.use(haltOnTimedout);



function haltOnTimedout (req, res, next) {
  if (!req.timedout) next()
}


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
/*
upload.configure({
  uploadDir: __dirname + '/public/backup-files',
  uploadUrl: '/file-upload',
  imageVersions: {
      thumbnail: {
          width: 80,
          height: 80
      }
  }
});

app.use('/file-upload', upload.fileHandler());
*/
module.exports = app;
