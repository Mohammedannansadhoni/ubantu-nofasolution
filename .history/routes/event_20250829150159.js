const formidable = require('express-formidable');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var XLSX = require('xlsx');
var moment = require('moment');
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');

// Email configuration
var nodemailer = require('nodemailer');
var transporter = null;

// Email configuration page for specific event
router.get('/online-registration/:id/email-config', function(req, res) {
    const eventId = req.params.id;
    res.render('event/email_configuration', {
        title: 'Email Configuration',
        eventId: eventId
    });
});

// General email configuration page
router.get('/email-configuration', function(req, res) {
    res.render('event/email_configuration', {
        title: 'Email Configuration'
    });
});

// Only configure email if credentials are provided
if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
    process.env.EMAIL_USER !== '' && process.env.EMAIL_PASS !== '' &&
    process.env.EMAIL_USER !== 'your-email@gmail.com') {
    transporter = nodemailer.createTransport({
        service: 'gmail', // You can change this to your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    console.log('✅ Email transporter configured with user:', process.env.EMAIL_USER);
} else {
    console.log('⚠️ Email credentials not configured. Emails will not be sent.');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    console.log('   To enable emails, set EMAIL_USER and EMAIL_PASS environment variables in .env file.');
}


var Event = require('../models/event');
var EventData = require('../models/event-data');
var BadgeCategory = require('../models/badge-category');
var Sequence = require('../models/sequence');
var ExportFiles = require('../models/export-files');
var BadgeCategoryCode = require('../models/badge-category-code');

router.use(function(req,res,next){
    // Exempt public registration routes from authentication
    var publicRoutes = [
        /^\/public-registration\/.+$/,
        /^\/public-registration\/.+\/confirmation$/,  // Add specific confirmation route
        /^\/.+\/public-register$/,
        /^\/event-designs\/.+$/,
        /^\/register\/.+$/  // Add direct register route
    ];
    
    var isPublicRoute = publicRoutes.some(function(pattern) {
        return pattern.test(req.path);
    });
    
    console.log('🔍 Auth check - Path:', req.path, 'IsPublic:', isPublicRoute, 'IsAuthenticated:', req.isAuthenticated());
    
    if(isPublicRoute) {
        console.log('✅ Public route access allowed:', req.path);
        return next();
    }
    
    if(!req.isAuthenticated()){
        console.log('❌ Authentication required for:', req.path);
        return res.redirect('/');
    }
    next();
})

router.get('/badge-categories/:id', function(req,res){
    var messages = req.flash('error');
    var eventId = req.params.id;
    req.session.eventId = eventId;

    BadgeCategory.find({event:eventId}, function(err, badgecategories){

        BadgeCategoryCode.find({}, function(err, badgecategorycodes){
            res.render('event/badge-categories', {messages:messages, hasErrors:messages.length>0, badgecategories:badgecategories, badgecategorycodes:badgecategorycodes});
        });

        
    });



});



router.post('/badge-categories', function(req,res){
    var messages = [];

    var eventId=req.session.eventId;
    var selectedItems=[];
    

    for(var key in req.body) {
        
          //do something with e.g. req.body[key]
          if(key.indexOf('_badgeCategory') > -1){
            //console.log(`${key}=${req.body[key]}`);
            var item=key.substring(0,key.indexOf('_badgeCategory'));
         
            selectedItems.push(new BadgeCategory({event:eventId, code:item, desc:item}));
            
          }
          
      }

    if(selectedItems.length==0){
        req.flash('error', 'Please select atleast 1 badge category');
        return res.redirect('/event/badge-categories/' + req.session.eventId )

    }
        
    BadgeCategory.remove({event:eventId}, function(err){
        var done=0;
        for(var i=0; i<selectedItems.length; i++){
            selectedItems[i].save(function(err, result){
                done++;
                if(done===selectedItems.length){
                    console.info('%d items were successfully stored.', selectedItems.length);
                    res.redirect('/event/badge-layout');
                    //res.render('event/badge-categories', {messages:messages, hasErrors:messages.length>0, badgecategories:selectedItems});
                }
            });
        }
    });        



   
////////////////////////////////////
    /*
    BadgeCategory.find({event:eventId}).count().exec(function(err, c){
        console.log(`c=${c}`);

        if(c==0){
            messages.push('Please add atleast 1 badge category');

            BadgeCategory.find({event:eventId}, function(err, badgecategories){
                res.render('event/badge-categories', {messages:messages, hasErrors:messages.length>0, badgecategories:badgecategories});
                return;
            });
        }
        else {
            res.redirect('/event/badge-layout');
        }
    });
    */

})

router.get('/badge-layout', function(req,res){
    var messages=[];
    //var scripts = [{ script: '/library/fabric.min.js' },{script:'/javascripts/badgelayout.js'}];
    var eventId=req.session.eventId;
    var Font = require('../models/font');

    Event.findById(eventId, function (err, event) {
        var fields=[];
        var showBarcode=false;
        var barcodeTop = 10;
        var barcodeLeft = 10;
        var showQrCode=false;
        var qrCodeTop = 10;
        var qrCodeLeft = 10;
        var uploadImageFields = [];
        var uploadLogoFields = [];
        var fieldIndex = 0;

        Object.keys(event.toJSON()).forEach(function(item){
            

            if(item.indexOf('_showInPrint')>-1 && event[item]==true ){
                fieldIndex = fieldIndex + 1;

                var fieldName = item.substring(0, item.indexOf('_showInPrint') ) ;
                var fieldLabel = item.substring(0, item.indexOf('_showInPrint') ) + '_label';
                var fieldType = item.substring(0, item.indexOf('_showInPrint') ) + '_fieldType';
                var fieldValue = '';//eventData[fieldName] == undefined ? '':eventData[fieldName];
                var fieldMandatory = item.substring(0, item.indexOf('_showInPrint') ) + '_isMandatory';
                var fieldTop = item.substring(0, item.indexOf('_showInPrint') ) + '_top';
            
                var fieldLeft = item.substring(0, item.indexOf('_showInPrint') ) + '_left';
                var fieldWidth = item.substring(0, item.indexOf('_showInPrint') ) + '_width';
                var fieldHeight = item.substring(0, item.indexOf('_showInPrint') ) + '_height';
                var fieldRotate = item.substring(0, item.indexOf('_showInPrint') ) + '_rotate';
                var fieldFontFamily = item.substring(0, item.indexOf('_showInPrint') ) + '_fontFamily';
                var fieldFontSize = item.substring(0, item.indexOf('_showInPrint') ) + '_fontSize';
                var fieldFontWeight = item.substring(0, item.indexOf('_showInPrint') ) + '_fontWeight';
                var fieldFontStyle = item.substring(0, item.indexOf('_showInPrint') ) + '_fontStyle';
                var fieldTextAlign = item.substring(0, item.indexOf('_showInPrint') ) + '_textAlign';


                //console.log(`fieldName=${fieldName}, fieldLabel=${fieldLabel}, fieldType=${fieldType}, fieldValue=${fieldValue}`)
                var field={};
                field['fieldName']=fieldName;
                field['fieldLabel']=event[fieldLabel];
                field['fieldType']=event[fieldType];
                field['fieldValue']=fieldValue;
                field['fieldMandatory']=event[fieldMandatory];

                if(event[fieldTop]==10){
                    var fieldTopValue = fieldIndex * 20;
                    event[fieldTop] = fieldTopValue.toString();
                }
                
                if(event[fieldLeft]==10){
                    event[fieldLeft] = 20;
                }

                field['fieldTop']=event[fieldTop];
                field['fieldLeft']=event[fieldLeft];
                field['fieldWidth']=event[fieldWidth];
                field['fieldRotate']=event[fieldRotate];
                field['fieldFontFamily']=event[fieldFontFamily];
                field['fieldFontSize']=event[fieldFontSize];
                field['fieldFontWeight']=event[fieldFontWeight];
                field['fieldFontStyle']=event[fieldFontStyle];
                field['fieldTextAlign']=event[fieldTextAlign];

                if(fieldName=='barcode'){
                    showBarcode=true;
                    barcodeLeft=event[fieldLeft];
                    barcodeTop=event[fieldTop];

                } else if(fieldName=='qrCode'){
                    showQrCode=true;
                    qrCodeLeft=event[fieldLeft];
                    qrCodeTop=event[fieldTop];

                } else if(fieldName=='uploadImage'){
                    var imageField = {
                        fieldName: fieldName,
                        fieldLeft: event[fieldLeft],
                        fieldTop: event[fieldTop],
                        fieldWidth: event[fieldWidth],
                        fieldHeight: event[fieldHeight] || 100
                    };
                    uploadImageFields.push(imageField);
                } else if(fieldName=='uploadLogo'){
                    var logoField = {
                        fieldName: fieldName,
                        fieldLeft: event[fieldLeft],
                        fieldTop: event[fieldTop],
                        fieldWidth: event[fieldWidth],
                        fieldHeight: event[fieldHeight] || 100
                    };
                    uploadLogoFields.push(logoField);
                } else {
                    //console.log('field=' + JSON.stringify(field));
                    fields.unshift(field);
                }
            }
        });

        // Get custom fonts
        Font.find({isActive: true}).sort({created: -1}).exec(function(err, customFonts) {
            if(err) {
                customFonts = [];
            }

            var eventIdForPrint='';
            var scripts=[];
            if(req.session.eventIdForPrint){
                scripts = [{ script: '/javascripts/printbadgelayout.js' }];
                eventIdForPrint = req.session.eventIdForPrint;
                delete req.session.eventIdForPrint;
            }
          

            res.render('event/badge-layout', {eventIdForPrint:eventIdForPrint, scripts:scripts, messages:messages, hasErrors:messages.length>0, fields:fields, 
                showBarcode:showBarcode, barcodeLeft:barcodeLeft, barcodeTop:barcodeTop, showQrCode:showQrCode, qrCodeLeft:qrCodeLeft, qrCodeTop:qrCodeTop, uploadImageFields:uploadImageFields, uploadLogoFields:uploadLogoFields, customFonts:customFonts});
        });
        
    });

    
});



router.get('/print-badge-layout/:id', function(req,res){
    var messages=[];
    //var scripts = [{ script: '/library/fabric.min.js' },{script:'/javascripts/badgelayout.js'}];
    var eventId=req.params.id;
    var Font = require('../models/font');

    Event.findById(eventId, function (err, event) {
        var fields=[];
        var showBarcode=false;
        var barcodeTop = 10;
        var barcodeLeft = 10;
        var showQrCode=false;
        var qrCodeTop = 10;
        var qrCodeLeft = 10;
        var fieldIndex = 0;

        Object.keys(event.toJSON()).forEach(function(item){
            

            if(item.indexOf('_showInPrint')>-1 && event[item]==true ){
                fieldIndex = fieldIndex + 1;

                var fieldName = item.substring(0, item.indexOf('_showInPrint') ) ;
                var fieldLabel = item.substring(0, item.indexOf('_showInPrint') ) + '_label';
                var fieldType = item.substring(0, item.indexOf('_showInPrint') ) + '_fieldType';
                var fieldValue = '';//eventData[fieldName] == undefined ? '':eventData[fieldName];
                var fieldMandatory = item.substring(0, item.indexOf('_showInPrint') ) + '_isMandatory';
                var fieldTop = item.substring(0, item.indexOf('_showInPrint') ) + '_top';
            
                var fieldLeft = item.substring(0, item.indexOf('_showInPrint') ) + '_left';
                var fieldWidth = item.substring(0, item.indexOf('_showInPrint') ) + '_width';
                var fieldRotate = item.substring(0, item.indexOf('_showInPrint') ) + '_rotate';
                var fieldFontFamily = item.substring(0, item.indexOf('_showInPrint') ) + '_fontFamily';
                var fieldFontSize = item.substring(0, item.indexOf('_showInPrint') ) + '_fontSize';
                var fieldFontWeight = item.substring(0, item.indexOf('_showInPrint') ) + '_fontWeight';
                var fieldFontStyle = item.substring(0, item.indexOf('_showInPrint') ) + '_fontStyle';
                var fieldTextAlign = item.substring(0, item.indexOf('_showInPrint') ) + '_textAlign';


                //console.log(`fieldName=${fieldName}, fieldLabel=${fieldLabel}, fieldType=${fieldType}, fieldValue=${fieldValue}`)
                var field={};
                field['fieldName']=fieldName;
                field['fieldLabel']=event[fieldLabel];
                field['fieldType']=event[fieldType];
                field['fieldValue']=fieldValue;
                field['fieldMandatory']=event[fieldMandatory];

                if(event[fieldTop]==10){
                    var fieldTopValue = fieldIndex * 20;
                    event[fieldTop] = fieldTopValue.toString();
                }
                
                field['fieldTop']=event[fieldTop];
                field['fieldLeft']=event[fieldLeft];
                field['fieldWidth']=event[fieldWidth];
                field['fieldRotate']=event[fieldRotate];
                field['fieldFontFamily']=event[fieldFontFamily];
                field['fieldFontSize']=event[fieldFontSize];
                field['fieldFontWeight']=event[fieldFontWeight];
                field['fieldFontStyle']=event[fieldFontStyle];
                field['fieldTextAlign']=event[fieldTextAlign];

                if(fieldName=='barcode'){
                    showBarcode=true;
                    barcodeLeft=event[fieldLeft];
                    barcodeTop=event[fieldTop];

                } else if(fieldName=='qrCode'){
                    showQrCode=true;
                    qrCodeLeft=event[fieldLeft];
                    qrCodeTop=event[fieldTop];

                } else {
                    //console.log('field=' + JSON.stringify(field));
                    fields.unshift(field);
                }
            }
        });

        // Get custom fonts
        Font.find({isActive: true, fontName: {$exists: true, $ne: null, $ne: ''}}).sort({created: -1}).exec(function(err, customFonts) {
            if(err) {
                customFonts = [];
            }

            res.render('event/print-badge-layout', {layout:'print-layout', messages:messages, hasErrors:messages.length>0, fields:fields, 
                showBarcode:showBarcode, barcodeLeft:barcodeLeft, barcodeTop:barcodeTop, showQrCode:showQrCode, qrCodeLeft:qrCodeLeft, qrCodeTop:qrCodeTop, customFonts:customFonts});
        });

        
    });

    
});

router.post('/badge-layout', function(req,res){
    var messages = [];
    var eventId=req.session.eventId;

    console.log(`top=${req.body.fullName_top},left=${req.body.fullName_left},width=${req.body.fullName_width}`);


    Event.findById(eventId, function(err,event){
        if(err) throw err;

        Object.keys(event.toJSON()).forEach(function(item){
            

            if(item.indexOf('_showInPrint')>-1 && event[item]==true ){
                var fieldName = item.substring(0, item.indexOf('_showInPrint') ) ;

                event[fieldName + '_top']=req.body[fieldName + '_top'];
                event[fieldName + '_left']=req.body[fieldName + '_left'];

                if(fieldName!='barcode' && fieldName!='qrCode' && fieldName!='uploadImage' && fieldName!='uploadLogo'){
                    event[fieldName + '_width']=req.body[fieldName + '_width'];
                    event[fieldName + '_rotate']=req.body[fieldName + '_rotate'];
                    event[fieldName + '_fontFamily']=req.body[fieldName + '_fontFamily'];
                    event[fieldName + '_fontSize']=req.body[fieldName + '_fontSize'];
                    event[fieldName + '_fontWeight']=req.body[fieldName + '_fontWeight'];
                    event[fieldName + '_fontStyle']=req.body[fieldName + '_fontStyle'];
                    event[fieldName + '_textAlign']=req.body[fieldName + '_textAlign'];
                } else if(fieldName=='uploadImage' || fieldName=='uploadLogo'){
                    // Handle image field dimensions
                    event[fieldName + '_width']=req.body[fieldName + '_width'];
                    event[fieldName + '_height']=req.body[fieldName + '_height'];
                    event[fieldName + '_rotate']=req.body[fieldName + '_rotate'];
                }
                
            }
        });


        event.setupComplete = true;
        event.save(function(err, result){
            if(err){
                console.log(err);
            }

            if(req.body.action == 'testprint'){
                req.session.eventIdForPrint = eventId;
                res.redirect('/event/badge-layout');
            }
            else if(req.body.action=='finish'){
                res.redirect('/event');
            }
        });
    });
});

router.get('/badge-categories-list', function(req,res){
    var messages = [];

    BadgeCategoryCode.find({}, function(err, badgecategorycodes){
        res.render('event/badge-categories-list', {messages:messages, hasErrors:messages.length>0, badgecategorycodes:badgecategorycodes});
    });


});

router.get('/badge-category-create', function(req,res){
    var messages=[];

    res.render('event/badge-category-create', {messages:messages, hasErrors:messages.length>0});
});

router.post('/badge-category-create', function(req,res){
    var badgeCategoryCode = new BadgeCategoryCode();
    badgeCategoryCode.desc=req.body.badgeCategory;
    badgeCategoryCode.code=req.body.badgeCategory;

    badgeCategoryCode.save(function(err, result){
        if(err) throw err;

        //res.redirect('/event/badge-categories/' + req.session.eventId);
        res.redirect('/event/badge-categories-list');
    })
})

router.get('/badge-category-delete/:id', function(req,res){
    var messages=[];

    var badgeCategoryId = req.params.id;

    BadgeCategoryCode.findById(badgeCategoryId, function(err, badgeCategory){
        res.render('event/badge-category-delete', {messages:messages, hasErrors:messages.length>0, badgeCategory:badgeCategory} );
    });

    
});

router.post('/badge-category-delete', function(req,res){
    
        var badgeCategoryId = req.body.badgeCategoryId;
    
        BadgeCategoryCode.findByIdAndRemove(badgeCategoryId, function(err, result){
            if(err) throw err;

            console.log(`deleted category ${result.desc}`);
            
            res.redirect('/event/badge-categories-list');
        })

    
    })


router.get('/badge-category-edit/:id', function(req,res){
    var messages=[];

    var badgeCategoryId = req.params.id;

    BadgeCategoryCode.findById(badgeCategoryId, function(err, badgeCategory){
        res.render('event/badge-category-edit', {messages:messages, hasErrors:messages.length>0, badgeCategory:badgeCategory} );
    });

    
});

router.post('/badge-category-edit', function(req,res){

    var badgeCategoryId = req.body.badgeCategoryId;

    BadgeCategoryCode.findById(badgeCategoryId, function(err, badgeCategory){
        badgeCategory.desc=req.body.badgeCategory;
        badgeCategory.code=req.body.badgeCategory;

        badgeCategory.save(function(err, result){
            if(err) throw err;
    
            res.redirect('/event/badge-categories-list');
        })
    });



})



    var sheet2arr = function(sheet){
        var headers = ['A','B','C','D','E','F','G','H','I',
            'J','K','L','M','N','O','P','Q','R','S','T',
            'U','V','W','X','Y','Z','AA','AB','AC',
            'AD','AE','AF','AG','AH','AI','AJ','AK','AL',
            'AM','AN','AO'
        ];
    
    
        var result = [];
       
        var rowNum;
        var colNum;
        var range = XLSX.utils.decode_range(sheet['!ref']);
        for(rowNum = range.s.r; rowNum <= range.e.r; rowNum++){
           
           result[rowNum]={};
    
            for(colNum=range.s.c; colNum<=range.e.c; colNum++){
               var nextCell = sheet[
                  XLSX.utils.encode_cell({r: rowNum, c: colNum})
               ];
    
                //skip first row which contains header
                if(rowNum>0 && colNum < 41){
                    if( typeof nextCell === 'undefined' ){
                        result[rowNum][headers[colNum]] = '';
                    } else {
                        result[rowNum][headers[colNum]] = nextCell.v;
                    }
                }
            }
         
        }
        result.shift();//remove first item from array which is empty row
        return result;
     };






//express validation
/*
req.checkBody('fullName','Full Name should be alphanumeric').isAlpha();
req.checkBody('fullName','Full Name is required').notEmpty()
 
var errors = req.validationErrors();

if(errors){
    
    errors.forEach(function(error){
        messages.push(error.msg);
    });
    return res.render('event/register', {messages:messages, hasErrors: messages.length>0, eventData:eventData, countries: countries, badgeCategories:badgeCategories });
    
}
*/

//model validation
/*
var error = eventData.validateSync();
 
if(error && error.errors){
    for(field in error.errors){
        messages.push(error.errors[field].message);
    }

    return res.render('event/register', {messages:messages, hasErrors: messages.length>0, eventData:eventData, countries: countries, badgeCategories:badgeCategories });

}
*/
//end model validation

router.get('/register', function (req, res) {

    var messages = [];
    var eventId = req.session.eventId;


    Event.findById(eventId, function (err, event) {
        var fields=[];

        Object.keys(event.toJSON()).forEach(function(item){
            

            if(item.indexOf('_showInRegister')>-1 && event[item]==true ){
                var fieldName = item.substring(0, item.indexOf('_showInRegister') ) ;
                var fieldLabel = item.substring(0, item.indexOf('_showInRegister') ) + '_label';
                var fieldType = item.substring(0, item.indexOf('_showInRegister') ) + '_fieldType';
                var fieldValue = '';//eventData[fieldName] == undefined ? '':eventData[fieldName];
                var fieldMandatory = item.substring(0, item.indexOf('_showInRegister') ) + '_isMandatory';

                //console.log(`fieldName=${fieldName}, fieldLabel=${fieldLabel}, fieldType=${fieldType}, fieldValue=${fieldValue}`)
                var field={};
                field['fieldName']=fieldName;
                field['fieldLabel']=event[fieldLabel];
                field['fieldType']=event[fieldType];
                field['fieldValue']=fieldValue;
                field['fieldMandatory']=event[fieldMandatory];

                //console.log('field=' + JSON.stringify(field));
                fields.unshift(field);
            }
        });

        var fieldChunks=[];
        var chunkSize = 2;
        for(var i=0; i<fields.length; i+=chunkSize){
            fieldChunks.push(fields.slice(i,i+chunkSize));
        }
       
        BadgeCategory.find({event:eventId}, function(err, badgeCategories){

            //console.log('badgecategories = ' + badgeCategories);
            res.render('event/register', { messages: messages, hasErrors: messages.length > 0, fields:fieldChunks, badgeCategories:badgeCategories });
        });

        
    });



});


router.get('/attended/:id', function(req,res){
    var messages = [];
    var eventId = req.session.eventId;
    var eventDataId = req.params.id;

    var query = {_id:eventDataId};
    var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
    var update = {badgePrintDate:currentDate, statusFlag:'Attended', username: req.user.email};
    var options = {new:true};

    EventData.findOneAndUpdate(query, update, options, function(err, eventData){
        if(err) throw err;
        
        res.redirect('/event/registration/' + eventId);
    });

});

router.get('/didnotattend/:id', function(req,res){
    var messages = [];
    var eventId = req.session.eventId;
    var eventDataId = req.params.id;

    var query = {_id:eventDataId};
    var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
    var update = {badgePrintDate:null,modifiedDate:null, statusFlag:'Did Not Attend', username: req.user.email};
    var options = {new:true};

    EventData.findOneAndUpdate(query, update, options, function(err, eventData){
        if(err) throw err;
        
        res.redirect('/event/registration/' + eventId);
    });

});

router.get('/print-badge/:id', function(req,res){
    var messages = [];
    var eventId = req.session.eventId;
    var eventDataId = req.params.id;
    var Font = require('../models/font');

    //var scripts = [{script:'/javascripts/badgeprint.js'}];
    Event.findById(eventId, function(err,event){

        var fields=[];
        var showBarcode=false;
        var barcodeTop = 10;
        var barcodeLeft = 10;
        var showQrCode=false;
        var qrCodeTop = 10;
        var qrCodeLeft = 10;
        var uploadImageFields = [];
        var uploadLogoFields = [];
       
        EventData.findById(eventDataId, function(err,result){
            if(err) throw err;
                if(item.endsWith('_showInRegister') && event[item] === true) {
                    var fieldName = item.replace('_showInRegister', '');
                    var fieldLabel = fieldName + '_label';
                    var fieldType = fieldName + '_fieldType';
                    var fieldValue = '';
                    var fieldMandatory = fieldName + '_isMandatory';
                    var field = {
                        fieldName: fieldName,
                        fieldLabel: event[fieldLabel],
                        fieldType: event[fieldType],
                        fieldValue: fieldValue,
                        fieldMandatory: event[fieldMandatory]
                    };
                    fields.unshift(field);
                    var fieldFontStyle = item.substring(0, item.indexOf('_showInPrint') ) + '_fontStyle';
                    var fieldTextAlign = item.substring(0, item.indexOf('_showInPrint') ) + '_textAlign';

    
                    //console.log(`fieldName=${fieldName}, fieldLabel=${fieldLabel}, fieldType=${fieldType}, fieldValue=${fieldValue}`)
                    var field={};
                    field['fieldName']=fieldName;
                    field['fieldLabel']=event[fieldLabel];
                    field['fieldType']=event[fieldType];
                    field['fieldValue']=fieldValue;
                    field['fieldMandatory']=event[fieldMandatory];
                    field['fieldTop']=event[fieldTop];
                    field['fieldLeft']=event[fieldLeft];
                    field['fieldWidth']=event[fieldWidth];
                    field['fieldRotate']=event[fieldRotate];
                    field['fieldFontFamily']=event[fieldFontFamily];
                    field['fieldFontSize']=event[fieldFontSize];
                    field['fieldFontWeight']=event[fieldFontWeight];
                    field['fieldFontStyle']=event[fieldFontStyle];
                    field['fieldTextAlign']=event[fieldTextAlign];
    
                    if(fieldName=='barcode'){
                        showBarcode=true;
                        barcodeLeft=event[fieldLeft];
                        barcodeTop=event[fieldTop];
    
                    } else if(fieldName=='qrCode'){
                        showQrCode=true;
                        qrCodeLeft=event[fieldLeft];
                        qrCodeTop=event[fieldTop];
    
                    } else if(fieldName=='uploadImage'){
                        if(fieldValue) {
                            var imageField = {
                                fieldName: fieldName,
                                fieldValue: fieldValue,
                                fieldTop: event[fieldTop],
                                fieldLeft: event[fieldLeft],
                                fieldWidth: event[fieldWidth],
                                fieldHeight: event[fieldName + '_height'] || 100,
                                fieldRotate: event[fieldRotate]
                            };
                            uploadImageFields.push(imageField);
                        }
                    } else if(fieldName=='uploadLogo'){
                        if(fieldValue) {
                            var logoField = {
                                fieldName: fieldName,
                                fieldValue: fieldValue,
                                fieldTop: event[fieldTop],
                                fieldLeft: event[fieldLeft],
                                fieldWidth: event[fieldWidth],
                                fieldHeight: event[fieldName + '_height'] || 100,
                                fieldRotate: event[fieldRotate]
                            };
                            uploadLogoFields.push(logoField);
                        }
                    } else {
                        //console.log('field=' + JSON.stringify(field));
                        fields.unshift(field);
                    }
                }
            });

            // Get custom fonts
            Font.find({isActive: true}).sort({created: -1}).exec(function(err, customFonts) {
                if(err) {
                    customFonts = [];
                }

                var needsBarcodeGeneration = result.barcode==null && showBarcode;
                var needsQrCodeGeneration = result.qrCode==null && showQrCode;
                
                if(needsBarcodeGeneration && needsQrCodeGeneration){
                    // Generate both barcode and qrCode
                    Sequence.findOneAndUpdate({name:'barcode'}, {$inc:{value:1}}, {new:true}, function(err, barcodeSeq){
                        if(!barcodeSeq){
                            barcodeSeq = new Sequence ({name:'barcode', value:'19299259221626'});
                        }
                        
                        Sequence.findOneAndUpdate({name:'qrCode'}, {$inc:{value:1}}, {new:true}, function(err, qrCodeSeq){
                            if(!qrCodeSeq){
                                qrCodeSeq = new Sequence ({name:'qrCode', value:'10000000000001'});
                            }
                            
                            var query = {_id:eventDataId};
                            var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
                            
                            var update={};
                            if(result.statusFlag!='Attended'){
                                update = {badgePrintDate:currentDate, statusFlag:'Attended', barcode:barcodeSeq.value, qrCode:qrCodeSeq.value, username: req.user.email};
                            }
                            else {
                                update = {modifiedDate:currentDate, barcode:barcodeSeq.value, qrCode:qrCodeSeq.value, username: req.user.email};
                            }

                            var options = {new:true};
                        
                            EventData.findOneAndUpdate(query, update, options, function(err, eventData){
                                if(err) throw err;
                                
                                res.render('event/print-badge', {layout:'print-layout', messages: messages, hasErrors: messages.length > 0,  
                                    fields:fields, showBarcode:showBarcode, barcodeLeft:barcodeLeft, barcodeTop:barcodeTop, barcode:eventData.barcode, showQrCode:showQrCode, qrCodeLeft:qrCodeLeft, qrCodeTop:qrCodeTop, qrCode:eventData.qrCode, uploadImageFields:uploadImageFields, uploadLogoFields:uploadLogoFields, customFonts:customFonts});
                            });
                        });
                    });
                }
                else if(needsBarcodeGeneration){
                    Sequence.findOneAndUpdate({name:'barcode'}, {$inc:{value:1}}, {new:true}, function(err, seq){
                        if(!seq){
                            seq = new Sequence ({name:'barcode', value:'19299259221626'});
                        }
        
                        var query = {_id:eventDataId};
                        var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
                        
                        var update={};
                        if(result.statusFlag!='Attended'){
                            update = {badgePrintDate:currentDate, statusFlag:'Attended', barcode:seq.value, username: req.user.email};
                        }
                        else {
                            update = {modifiedDate:currentDate, barcode:seq.value, username: req.user.email};
                        }

                        
                        var options = {new:true};
                    
                        EventData.findOneAndUpdate(query, update, options, function(err, eventData){
                            if(err) throw err;
                            
                            res.render('event/print-badge', {layout:'print-layout', messages: messages, hasErrors: messages.length > 0,  
                                fields:fields, showBarcode:showBarcode, barcodeLeft:barcodeLeft, barcodeTop:barcodeTop, barcode:eventData.barcode, showQrCode:showQrCode, qrCodeLeft:qrCodeLeft, qrCodeTop:qrCodeTop, qrCode:eventData.qrCode, uploadImageFields:uploadImageFields, uploadLogoFields:uploadLogoFields, customFonts:customFonts});
                        });
                    });
                }
                else if(needsQrCodeGeneration){
                    Sequence.findOneAndUpdate({name:'qrCode'}, {$inc:{value:1}}, {new:true}, function(err, seq){
                        if(!seq){
                            seq = new Sequence ({name:'qrCode', value:'10000000000001'});
                        }
        
                        var query = {_id:eventDataId};
                        var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
                        
                        var update={};
                        if(result.statusFlag!='Attended'){
                            update = {badgePrintDate:currentDate, statusFlag:'Attended', qrCode:seq.value, username: req.user.email};
                        }
                        else {
                            update = {modifiedDate:currentDate, qrCode:seq.value, username: req.user.email};
                        }

                        
                        var options = {new:true};
                    
                        EventData.findOneAndUpdate(query, update, options, function(err, eventData){
                            if(err) throw err;
                            
                            res.render('event/print-badge', {layout:'print-layout', messages: messages, hasErrors: messages.length > 0,  
                                fields:fields, showBarcode:showBarcode, barcodeLeft:barcodeLeft, barcodeTop:barcodeTop, barcode:eventData.barcode, showQrCode:showQrCode, qrCodeLeft:qrCodeLeft, qrCodeTop:qrCodeTop, qrCode:eventData.qrCode, uploadImageFields:uploadImageFields, uploadLogoFields:uploadLogoFields, customFonts:customFonts});
                        });
                    });
                }
                
                else {
                    var query = {_id:eventDataId};
                    var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');

                    var update={};
                    if(result.statusFlag!='Attended'){
                        update = {badgePrintDate:currentDate, statusFlag:'Attended', username: req.user.email};
                    }
                    else {
                        update = {modifiedDate:currentDate, username: req.user.email};
                    }

                    
                    var options = {new:true};
                
                    EventData.findOneAndUpdate(query, update, options, function(err, eventData){
                        if(err) throw err;
                        
                        res.render('event/print-badge', {layout:'print-layout', messages: messages, hasErrors: messages.length > 0,  
                            fields:fields, showBarcode:showBarcode, barcodeLeft:barcodeLeft, barcodeTop:barcodeTop, barcode:eventData.barcode, showQrCode:showQrCode, qrCodeLeft:qrCodeLeft, qrCodeTop:qrCodeTop, qrCode:eventData.qrCode, uploadImageFields:uploadImageFields, uploadLogoFields:uploadLogoFields, customFonts:customFonts});
                    });
                }
            });
            
        });
    });







  

router.get('/edit-registration/:id', function (req, res) {
    
        var messages = [];
        var eventId = req.session.eventId;
        var eventDataId = req.params.id;
    

    
        EventData.findById(eventDataId, function(err, eventData){
            if(err) throw err;

            Event.findById(eventId, function (err, event) {
                var fields=[];
        
                Object.keys(event.toJSON()).forEach(function(item){
                    
        
                    if(item.indexOf('_showInRegister')>-1 && event[item]==true ){
                        var fieldName = item.substring(0, item.indexOf('_showInRegister') ) ;
                        var fieldLabel = item.substring(0, item.indexOf('_showInRegister') ) + '_label';
                        var fieldType = item.substring(0, item.indexOf('_showInRegister') ) + '_fieldType';
                        var fieldValue = eventData[fieldName] == undefined ? '':eventData[fieldName];
                        var fieldMandatory = item.substring(0, item.indexOf('_showInRegister') ) + '_isMandatory';
        
                        //console.log(`fieldName=${fieldName}, fieldLabel=${fieldLabel}, fieldType=${fieldType}, fieldValue=${fieldValue}`)
                        var field={};
                        field['fieldName']=fieldName;
                        field['fieldLabel']=event[fieldLabel];
                        field['fieldType']=event[fieldType];
                        field['fieldValue']=fieldValue;
                        field['fieldMandatory']=event[fieldMandatory];
        
                        //console.log('field=' + JSON.stringify(field));
                        fields.unshift(field);
                    }
                })

                var fieldChunks=[];
                var chunkSize = 2;
                for(var i=0; i<fields.length; i+=chunkSize){
                    fieldChunks.push(fields.slice(i,i+chunkSize));
                }
               
                BadgeCategory.find({event:eventId}, function(err, badgeCategories){
                    
              
                    res.render('event/edit-registration', { messages: messages, hasErrors: messages.length > 0, fields:fieldChunks, badgeCategories:badgeCategories, eventDataId:eventDataId });
                });

        
                
            });
        })

    });

router.post('/register', function (req, res) {
    var messages = [];
    var eventId = req.session.eventId;

    // Use formidable to handle file uploads
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../public/uploads/');
    form.keepExtensions = true;

    form.parse(req, function (err, fields, files) {
        if (err) {
            messages.push('Error processing form data');
            return res.render('event/register', { messages: messages, hasErrors: messages.length > 0 });
        }

        var eventData = new EventData();
        eventData.event = eventId;

        Event.findById(eventId, function (err, event) {
            Object.keys(event.toJSON()).forEach(function(item){
                if(item.indexOf('_showInRegister')>-1 && event[item]==true ){
                    var fieldName = item.substring(0, item.indexOf('_showInRegister') ) ;
                    var fieldType = event[fieldName + '_fieldType'];
                    
                    if(fieldType === 'file') {
                        // Handle file upload
                        if(files[fieldName] && files[fieldName].name) {
                            var oldpath = files[fieldName].path;
                            var newFilename = Date.now() + '_' + files[fieldName].name;
                            var newpath = path.join(__dirname, '../public/uploads/') + newFilename;
                            
                            fs.rename(oldpath, newpath, function (err) {
                                if (err) {
                                    console.log('File upload error:', err);
                                } else {
                                    eventData[fieldName] = newFilename;
                                }
                            });
                        }
                    } else {
                        // Handle regular fields
                        eventData[fieldName] = fields[fieldName];
                    }
                }
            });
           
            eventData.regDate=moment().format('YYYY-MM-DD HH:mm:ss');
            eventData.regType='Onsite';

            if(fields.save){
                eventData.statusFlag='Did Not Attend';
            }
            else if(fields.attendAndSave){ 
                eventData.badgePrintDate = moment().format('YYYY-MM-DD HH:mm:ss');
                eventData.statusFlag = 'Attended';
            }

            eventData.username = req.user.email;

            eventData.save(function(err, result){
                if(err) throw err;

                if(fields.save || fields.attendAndSave){
                    res.redirect('/event/registration/' + eventId);
                }
                else if(fields.printAndSave){    
                    req.session.eventDataIdForPrint = result._id;

                    res.redirect('/event/registration/' + eventId);
                }
            });
        });
    });
});



router.post('/edit-registration', function (req, res) {
    var messages = [];
    var eventId = req.session.eventId;
    
    // Use formidable to handle file uploads
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../public/uploads/');
    form.keepExtensions = true;

    form.parse(req, function (err, fields, files) {
        if (err) {
            messages.push('Error processing form data');
            return res.render('event/register', { messages: messages, hasErrors: messages.length > 0 });
        }

        var eventDataId = fields.eventDataId;

        EventData.findById(eventDataId, function(err, eventData){
            Event.findById(eventId, function (err, event) {
                Object.keys(event.toJSON()).forEach(function(item){
                    if(item.indexOf('_showInRegister')>-1 && event[item]==true ){
                        var fieldName = item.substring(0, item.indexOf('_showInRegister') ) ;
                        var fieldType = event[fieldName + '_fieldType'];
                        
                        if(fieldType === 'file') {
                            // Handle file upload
                            if(files[fieldName] && files[fieldName].name) {
                                var oldpath = files[fieldName].path;
                                var newFilename = Date.now() + '_' + files[fieldName].name;
                                var newpath = path.join(__dirname, '../public/uploads/') + newFilename;
                                
                                fs.rename(oldpath, newpath, function (err) {
                                    if (err) {
                                        console.log('File upload error:', err);
                                    } else {
                                        eventData[fieldName] = newFilename;
                                    }
                                });
                            }
                        } else {
                            // Handle regular fields
                            eventData[fieldName] = fields[fieldName];
                        }
                    }
                });

                eventData.modifiedDate=moment().format('YYYY-MM-DD HH:mm:ss');
                

                if(fields.attendAndSave){ 
                    eventData.badgePrintDate = moment().format('YYYY-MM-DD HH:mm:ss');
                    eventData.statusFlag = 'Attended';
                    
                }
                eventData.username = req.user.email;

                eventData.save(function(err, result){
                    if(err) throw err;

                    if(fields.save || fields.attendAndSave){
                        res.redirect('/event/registration/' + eventId);
                    }
                    else if(fields.printAndSave){    
                        req.session.eventDataIdForPrint = result._id;

                        res.redirect('/event/registration/' + eventId);
                    }
                });
            });
        });
    });
});



router.get('/download/:id', function(req,res){
    var messages = [];
    
        var eventId = req.params.id;
        req.session.eventId = eventId;

        const excel = require('node-excel-export');
        // You can define styles as json object 
        // More info: https://github.com/protobi/js-xlsx#cell-styles 
        const styles = {
            headerDark: {
            fill: {
                fgColor: {
                rgb: 'FF000000'
                }
            },
            font: {
                color: {
                rgb: 'FFFFFFFF'
                },
                sz: 14,
                bold: true,
                underline: true
            }
            },
            cellPink: {
            fill: {
                fgColor: {
                rgb: 'FFFFCCFF'
                }
            }
            },
            cellGreen: {
            fill: {
                fgColor: {
                rgb: 'FF00FF00'
                }
            }
            }
        };
   
        //Array of objects representing heading rows (very top) 
        const heading = [
            [{value: 'a1', style: styles.headerDark}, {value: 'b1', style: styles.headerDark}, {value: 'c1', style: styles.headerDark}],
            ['a2', 'b2', 'c2'] // <-- It can be only values 
        ];
    
        //Here you specify the export structure 
        const specification = {
            uniqueId: {displayName: 'Unique Id', headerStyle: styles.headerDark, width: 120},
            barcode: {displayName: 'Barcode', headerStyle: styles.headerDark, width: 120},
            sno: {displayName: 'SNo', headerStyle: styles.headerDark, width: 120},
            title: {displayName: 'Title', headerStyle: styles.headerDark, width: 120},
            firstName: {displayName: 'First Name', headerStyle: styles.headerDark, width: 120},
            middleName: {displayName: 'Middle Name', headerStyle: styles.headerDark, width: 120},
            lastName: {displayName: 'Last Name', headerStyle: styles.headerDark, width: 120},
            fullName: {displayName: 'Full Name', headerStyle: styles.headerDark, width: 120},
            jobTitle: {displayName: 'Job Title', headerStyle: styles.headerDark, width: 120},
            department: {displayName: 'Department', headerStyle: styles.headerDark, width: 120},
            companyName: {displayName: 'Company Name', headerStyle: styles.headerDark, width: 120},
            mobile1: {displayName: 'Mobile 1', headerStyle: styles.headerDark, width: 120},
            mobile2: {displayName: 'Mobile 2', headerStyle: styles.headerDark, width: 120},
            tel1: {displayName: 'Tel 1', headerStyle: styles.headerDark, width: 120},
            tel2: {displayName: 'Tel 2', headerStyle: styles.headerDark, width: 120},
            fax: {displayName: 'Fax', headerStyle: styles.headerDark, width: 120},
            email: {displayName: 'Email', headerStyle: styles.headerDark, width: 120},
            website: {displayName: 'Website', headerStyle: styles.headerDark, width: 120},
            address1: {displayName: 'Address 1', headerStyle: styles.headerDark, width: 120},
            address2: {displayName: 'Address 2', headerStyle: styles.headerDark, width: 120},
            city: {displayName: 'City', headerStyle: styles.headerDark, width: 120},
            country: {displayName: 'Country', headerStyle: styles.headerDark, width: 120},
            poBox: {displayName: 'P.O.Box', headerStyle: styles.headerDark, width: 120},
            postalCode: {displayName: 'Postal Code', headerStyle: styles.headerDark, width: 120},
            badgeCategory: {displayName: 'Badge Category', headerStyle: styles.headerDark, width: 120},
            regType: {displayName: 'Reg Type', headerStyle: styles.headerDark, width: 120},
            regDate: {displayName: 'Reg Date', headerStyle: styles.headerDark, width: 120},
            badgePrintDate: {displayName: 'Badge Print Date', headerStyle: styles.headerDark, width: 120},
            modifiedDate: {displayName: 'Modified Date', headerStyle: styles.headerDark, width: 120},
            statusFlag: {displayName: 'Status Flag', headerStyle: styles.headerDark, width: 120},
            backoffice: {displayName: 'Back Office', headerStyle: styles.headerDark, width: 120},
            comment1: {displayName: 'Comment 1', headerStyle: styles.headerDark, width: 120},
            comment2: {displayName: 'Comment 2', headerStyle: styles.headerDark, width: 120},
            comment3: {displayName: 'Comment 3', headerStyle: styles.headerDark, width: 120},
            comment4: {displayName: 'Comment 4', headerStyle: styles.headerDark, width: 120},
            comment5: {displayName: 'Comment 5', headerStyle: styles.headerDark, width: 120},
            comment6: {displayName: 'Comment 6', headerStyle: styles.headerDark, width: 120},
            comment7: {displayName: 'Comment 7', headerStyle: styles.headerDark, width: 120},
            comment8: {displayName: 'Comment 8', headerStyle: styles.headerDark, width: 120},
            comment9: {displayName: 'Comment 9', headerStyle: styles.headerDark, width: 120},
            comment10: {displayName: 'Comment 10', headerStyle: styles.headerDark, width: 120},
            username: {displayName: 'Username', headerStyle: styles.headerDark, width: 120},
            
        }
  
        // The data set should have the following shape (Array of Objects) 
        // The order of the keys is irrelevant, it is also irrelevant if the 
        // dataset contains more fields as the report is build based on the 
        // specification provided above. But you should have all the fields 
        // that are listed in the report specification 

        EventData.find({event:eventId}, function(err, eventData){
            if(err) throw err;

            const dataset = [
                {customer_name: 'IBM', status_id: 1, note: 'some note', misc: 'not shown'},
                {customer_name: 'HP', status_id: 0, note: 'some note'},
                {customer_name: 'MS', status_id: 0, note: 'some note', misc: 'not shown'}
            ]
      
            // Define an array of merges. 1-1 = A:1 
            // The merges are independent of the data. 
            // A merge will overwrite all data _not_ in the top-left cell. 
            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } },
                { start: { row: 2, column: 1 }, end: { row: 2, column: 5 } },
                { start: { row: 2, column: 6 }, end: { row: 2, column: 10 } }
            ]
      
    
            // Create the excel report. 
            // This function will return Buffer 
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report 
                {
                    name: 'Report', // <- Specify sheet name (optional) 
                    //heading: heading, // <- Raw heading array (optional) 
                    //merges: merges, // <- Merge cell ranges 
                    specification: specification, // <- Report specification 
                    data: eventData // <-- Report data 
                }
                ]
            );
      
            // You can then return this straight 
            res.attachment('report.xlsx'); // This is sails.js specific (in general you need to set headers) 
            return res.send(report);
            
            // OR you can save this buffer to the disk by creating a file.

        });



        /*
        EventData.find({event:eventId}, function(err, eventData){
            if(err) throw err;
    
            var rows=[];
            eventData.forEach(function(eventData){
    
                var row={};
                var keys = Object.keys(eventData.toJSON());
                for(var i=keys.length-1; i>0; i--){
                    if(keys[i]!='__v' && keys[i]!='_id' && keys[i]!='event')
                    row[keys[i]]=eventData[keys[i]];
                }

                rows.push(row);
                
            });
            
            
            res.xls('data.xlsx', rows);
           
        });
        */
});

router.get('/upload/:id', function (req, res) {
    
    var messages = [];

    var eventId = req.params.id;
    req.session.eventId = eventId;

    res.render('event/upload', { messages: messages, hasErrors: messages.length > 0});
    

    
});

router.post('/upload', function(req,res){
    var messages = [];
    var eventId = req.session.eventId;

    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {

        if(files.filetoupload==null || files.filetoupload.name==''){
            messages.push('Please select a file to upload');
            res.render('event/upload', { messages: messages, hasErrors: messages.length > 0 });
            return;
        }

        var oldpath = files.filetoupload.path;
        var newpath = path.join(__dirname, '../public/uploads/') + files.filetoupload.name;
        //var newpath = path.join(__dirname, '../public/uploads/') + 'Report.xlsx';


        // Read the file
        //fs.rename(oldpath, newpath, function (err) { //doesn't work on Heroku

        fs.readFile(oldpath, function (err, data) {
            if (err) throw err;
            console.log('File read!');

            fs.writeFile(newpath, data, function (err) {
                if (err) throw err;

                var data = {eventId:eventId, newpath:newpath};
                importExcel(data, function(){
                    res.redirect('/event');
                });


 



            });
            // Delete the file
            fs.unlink(oldpath, function (err) {
               if (err) throw err;
               console.log('File deleted!');
            });



        });




    });


  
});


function importExcel(data,callback){

    var workbook = XLSX.readFile(data.newpath);
    var sheet_name_list = workbook.SheetNames;

    var first_sheet_name = workbook.SheetNames[0];
    var sheet = workbook.Sheets[first_sheet_name];
    var dataArray = sheet2arr(sheet);


    var done=0;
    var eventId = data.eventId;
    Event.findById(eventId, function(err,event){

        dataArray.forEach(function(item){
            var eventData = new EventData();
            eventData.event = eventId;

            eventData.uniqueId = item[event.uniqueId_columnInExcel];
            eventData.barcode = item[event.barcode_columnInExcel];
            eventData.sno = item[event.sno_columnInExcel];
            eventData.title = item[event.title_columnInExcel];
            eventData.firstName = item[event.firstName_columnInExcel];
            eventData.middleName = item[event.middleName_columnInExcel];
            eventData.lastName = item[event.lastName_columnInExcel];
            eventData.fullName = item[event.fullName_columnInExcel];
            eventData.jobTitle = item[event.jobTitle_columnInExcel];
            eventData.department = item[event.department_columnInExcel];
            eventData.companyName = item[event.companyName_columnInExcel];
            eventData.mobile1 = item[event.mobile1_columnInExcel];
            eventData.mobile2 = item[event.mobile2_columnInExcel];
            eventData.tel1 = item[event.tel1_columnInExcel];
            eventData.tel2 = item[event.tel2_columnInExcel];
            eventData.fax = item[event.fax_columnInExcel];
            eventData.email = item[event.email_columnInExcel];
            eventData.website = item[event.website_columnInExcel];
             eventData.address1 = item[event.address1_columnInExcel];
            eventData.address2 = item[event.address2_columnInExcel];
            eventData.city = item[event.city_columnInExcel];
            eventData.country = item[event.country_columnInExcel];
            eventData.poBox = item[event.poBox_columnInExcel];
            eventData.postalCode = item[event.postalCode_columnInExcel];
            eventData.badgeCategory = item[event.badgeCategory_columnInExcel];
            eventData.regType = 'Online';//item[event.regType_columnInExcel];
            eventData.regDate = moment().format('YYYY-MM-DD HH:mm:ss');//item[event.regDate_columnInExcel];
            eventData.badgePrintDate = item[event.badgePrintDate_columnInExcel];
            eventData.modifiedDate = item[event.modifiedDate_columnInExcel];
            eventData.statusFlag = 'Did Not Attend';//data[event.statusFlag_columnInExcel];
            eventData.backoffice = item[event.backoffice_columnInExcel];
            eventData.comment1 = item[event.comment1_columnInExcel];
            eventData.comment2 = item[event.comment2_columnInExcel];
            eventData.comment3 = item[event.comment3_columnInExcel];
            eventData.comment4 = item[event.comment4_columnInExcel];
            eventData.comment5 = item[event.comment5_columnInExcel];
            eventData.comment6 = item[event.comment6_columnInExcel];
            eventData.comment7 = item[event.comment7_columnInExcel];
            eventData.comment8 = item[event.comment8_columnInExcel];
            eventData.comment9 = item[event.comment9_columnInExcel];
            eventData.comment10 = item[event.comment10_columnInExcel];

            

            eventData.save(function(err, result){
                if(err)
                    throw err;
                    done++;
                    if(done==dataArray.length){
                        console.log('done');
                        //res.redirect('/event');
                        var query = {event:data.eventId};
                        var currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
                        var update = {isCompleted:true, rowCount:dataArray.length};
                        var options = {new:true};
                    
                        ExportFiles.findOneAndUpdate(query, update, options, function(err, eventData){
                            //if(err) throw err;
                            
                            console.log(`Process1 wants me to say: "${data.eventId}"`);
                            callback();
                        
                        });
                    }
                    
            })
        })
    });//Event.findById
    console.log('File written!');




}



router.get('/edit/:id', function (req, res) {
    var scripts = [{ script: '/javascripts/datepicker.js' }];
    var messages = [];
    var eventId = req.params.id;

    Event.findById(eventId, function(err, event){
        res.render('event/edit', { scripts: scripts, messages: messages, hasErrors: messages.length > 0, event: event });
    })

    
});




router.post('/edit', function (req, res) {
    
        var messages = [];
    
    var IncomingForm = require('formidable').IncomingForm;
    var form = new IncomingForm();
        form.parse(req, function (err, fields, files) {
            var eventId = fields.eventId;

            Event.findById(eventId, function(err, event){
                event.eventName = fields.eventName;
                
                if(files.filetoupload.name!=""){
                    event.eventLogo = files.filetoupload.name.replace(' ','_');
                }
                
                event.fromDate = moment(fields.fromDate,'DD/MM/YYYY').toISOString();
                event.toDate = moment(fields.toDate,'DD/MM/YYYY').toISOString();

                event.save(function(err, result){
                    if(files.filetoupload.name!=""){
                        var oldpath = files.filetoupload.path;
                        var newpath = path.join(__dirname, '../public/images/') + files.filetoupload.name.replace(' ','_');


                        // Read the file
                        fs.readFile(oldpath, function (err, data) {
                            if (err) throw err;
                            console.log('File read!');

                            // Write the file
                            fs.writeFile(newpath, data, function (err) {
                                if (err) throw err;
                                res.redirect('/event/event-fields/' + eventId);
                                console.log('File written!');
                            });

                            // Delete the file
                            fs.unlink(oldpath, function (err) {
                                if (err) throw err;
                                console.log('File deleted!');
                            });
                        });


                    }
                    else {
                        res.redirect('/event/event-fields/' + eventId);
                    }//files.filetoupload.name!=""
                })
            })


        });//form.parse
    });

router.get('/dashboard/:id', function (req, res) {
    
        var messages = [];
        var eventId = req.params.id;
    
        var styles = [{ style: '/stylesheets/dashboard.css' }];

        Event.findById(eventId, function(err, event){
            EventData.find({ event: eventId
            }).count().exec(function(err, countTotal){
    
                EventData.find({ event: eventId, 
                    statusFlag:'Attended'
                }).count().exec(function(err, countAttended){
                    res.render('event/dashboard', { styles:styles,  messages: messages, hasErrors: messages.length > 0,event:event, countTotal:countTotal, countAttended:countAttended });
        
                })
               
    
            })


        })








    
        
    });

router.get('/delete-all', function(req,res){
    EventData.remove({}, function(err, eventData){
        if(err) throw err;
        Event.remove({}, function(err, event){
            if(err) throw err;
            

           
            
            
            Event.db.db.command({repairDatabase:1}, function (err,result)
            {
                if(err) throw err;
                console.log('repairDatabase',result);

                Event.db.db.command({compact:'eventdatas'}, function (err,result){
                    if(err) throw err;
                    console.log('compact eventdatas',result);

                    Event.db.db.command({compact:'events'}, function (err,result){
                        if(err) throw err;
                        console.log('compact events', result);

                        res.redirect('/event');
                    });

                });

                
            });
            


            /*
            mongoose.connection.db.admin().command({setParameter: 1, internalQueryExecMaxBlockingSortBytes: 268435456}, function (err,result)
            {
                console.log(result);
            });
            */

            
        });

        
    });
});

router.get('/delete/:id', function (req, res) {
    
        var messages = [];
        var eventId = req.params.id;
    
        Event.findById(eventId, function(err, event){
            res.render('event/delete', { messages: messages, hasErrors: messages.length > 0, event: event });
        })
    
        
    });

router.get('/delete-data/:id', function(req,res){
    var eventId = req.params.id;

    EventData.remove({event:eventId}, function(err, eventData){
        if(err) throw err;

        res.redirect('/event');
    });
});

router.get('/delete-event/:id', function(req,res){
    var eventId = req.params.id;

    EventData.remove({event:eventId}, function(err, eventData){
        if(err) throw err;
        Event.remove({_id:eventId}, function(err, event){
            if(err) throw err;
            
            res.redirect('/event');
        });

        
    });
});

router.get('/create', function (req, res) {
    var scripts = [{ script: '/javascripts/datepicker.js' }];
    var messages = [];
    var event = new Event();


    res.render('event/create', { scripts: scripts, messages: messages, hasErrors: messages.length > 0, event: event });
});

router.post('/create', function (req, res) {

    var scripts = [{ script: '/javascripts/datepicker.js' }];
    var messages = [];
    var event = new Event();

    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        
        if(files.filetoupload.name==''){
            messages.push('Please select a logo for the event');
            res.render('event/create', { scripts: scripts, messages: messages, hasErrors: messages.length > 0, event: event });
            return;
        }

        var oldpath = files.filetoupload.path;
        var newpath = path.join(__dirname, '../public/images/') + files.filetoupload.name.replace(' ','_');



        /*
        req.checkBody('eventName','Event Name is required').notEmpty();
        req.checkBody('fromDate','From Date is required').notEmpty();
        req.checkBody('toDate','To Date is required').notEmpty();
        
        var errors = req.validationErrors();
      
        if(errors){
            
            errors.forEach(function(error){
                messages.push(error.msg);
            });
            var scripts = [{ script: '/javascripts/datepicker.js' }];
            return res.render('event/create', {scripts: scripts, messages:messages, hasErrors: messages.length>0, event:event});
            
        }
        */
        // Read the file
        fs.readFile(oldpath, function (err, data) {
            if (err) throw err;
            console.log('File read!');

            // Write the file
            fs.writeFile(newpath, data, function (err) {
                if (err) throw err;

                //file uploaded, now save form fields data
                            
                event.eventName = fields.eventName;
                event.eventLogo = files.filetoupload.name;
                event.fromDate = moment(fields.fromDate,'DD/MM/YYYY').toISOString();
                event.toDate = moment(fields.toDate,'DD/MM/YYYY').toISOString();

                event.save(function (err, result) {
                    if (err)
                        throw err;

                    //event is created, now add default badge categories using the newly generated event id
                    var categories = [
                        new BadgeCategory({
                            code:'Visitor',
                            desc:'Visitor',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Delegate',
                            desc:'Delegate',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Participant',
                            desc:'Participant',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Media',
                            desc:'Media',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Press',
                            desc:'Press',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Vip',
                            desc:'Vip',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Vvip',
                            desc:'Vvip',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Exhibitor',
                            desc:'Exhibitor',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Sponsor',
                            desc:'Sponsor',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Buyer',
                            desc:'Buyer',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Host',
                            desc:'Host',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Organizer',
                            desc:'Organizer',
                            event: result._id
                        }),

                        new BadgeCategory({
                            code:'Speaker',
                            desc:'Speaker',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Student',
                            desc:'Student',
                            event: result._id
                        }),
                        new BadgeCategory({
                            code:'Member',
                            desc:'Member',
                            event: result._id
                        }),
                    ];
                    var eventId = result._id;
                 
                    var done=0;
                    for(var i=0; i<categories.length; i++){
                        categories[i].save(function(err, result){
                            done++;
                            if(done===categories.length){
                                //exit();
                                res.redirect('/event/event-fields/' + eventId);
                            }
                        });
                    }
               
                    //end badge categories


                    
                })//event.save

                console.log('File written!');
            });

            // Delete the file
            fs.unlink(oldpath, function (err) {
                if (err) throw err;
                console.log('File deleted!');
            });
        });


        //fs.rename(oldpath, newpath, function (err) {
        //    if (err) throw err;


            //start
            //end

        //});//fs.rename
    });//form.parse







});

router.get('/event-fields/:id', function (req, res) {
    var messages = [];

    var eventId = req.params.id;


    Event.findById(eventId, function (err, event) {
        /*
        Event.schema.eachPath(function(path) {
            console.log(path);
        });
        */

        eventJSON = event.toJSON();
        var eventFields = [];
        Object.keys(eventJSON).forEach(function(item){
            
            var eventField={};
            eventField['key']=item;
            eventField['value']=eventJSON[item];
            eventFields.push(eventField);

            console.log(`${eventField.key} - ${eventField.value}`);
        });
        

    

        res.render('event/event-fields', { messages: messages, hasErrors: messages.length > 0, event: event });
    })

    /*
    InputField.find({}, function(err,result){
        if(err)
            throw err;

        res.render('event/event-fields', {messages:messages, hasErrors: messages.length>0, inputFields:result})
    })
    */



})


router.post('/event-fields', function (req, res) {
    var messages = [];

    var eventId = req.body['eventId'];

    Event.findById(eventId, function (err, event) {

        event.uniqueId_label = req.body['uniqueId_label'];
        event.uniqueId_isMandatory = req.body['uniqueId_isMandatory'] ? true : false;
        event.uniqueId_showInSearch = req.body['uniqueId_showInSearch'] ? true : false;
        event.uniqueId_showInRegister = req.body['uniqueId_showInRegister'] ? true : false;
        event.uniqueId_showInOnlineRegistration = req.body['uniqueId_showInOnlineRegistration'] ? true : false;
        event.uniqueId_showInPrint = req.body['uniqueId_showInPrint'] ? true : false;
        event.uniqueId_includeInSearch = req.body['uniqueId_includeInSearch'] ? true : false;
        event.uniqueId_columnInExcel = req.body['uniqueId_columnInExcel'];

        event.barcode_label = req.body['barcode_label'];
        event.barcode_isMandatory = req.body['barcode_isMandatory'] ? true : false;
        event.barcode_showInSearch = req.body['barcode_showInSearch'] ? true : false;
        event.barcode_showInRegister = req.body['barcode_showInRegister'] ? true : false;
        event.barcode_showInOnlineRegistration = req.body['barcode_showInOnlineRegistration'] ? true : false;
        event.barcode_showInPrint = req.body['barcode_showInPrint'] ? true : false;
        event.barcode_includeInSearch = req.body['barcode_includeInSearch'] ? true : false;
        event.barcode_columnInExcel = req.body['barcode_columnInExcel'];
      
        event.qrCode_label = req.body['qrCode_label'];
        event.qrCode_isMandatory = req.body['qrCode_isMandatory'] ? true : false;
        event.qrCode_showInSearch = req.body['qrCode_showInSearch'] ? true : false;
        event.qrCode_showInRegister = req.body['qrCode_showInRegister'] ? true : false;
        event.qrCode_showInOnlineRegistration = req.body['qrCode_showInOnlineRegistration'] ? true : false;
        event.qrCode_showInPrint = req.body['qrCode_showInPrint'] ? true : false;
        event.qrCode_includeInSearch = req.body['qrCode_includeInSearch'] ? true : false;
        event.qrCode_columnInExcel = req.body['qrCode_columnInExcel'];

        event.uploadImage_label = req.body['uploadImage_label'];
        event.uploadImage_isMandatory = req.body['uploadImage_isMandatory'] ? true : false;
        event.uploadImage_showInSearch = req.body['uploadImage_showInSearch'] ? true : false;
        event.uploadImage_showInRegister = req.body['uploadImage_showInRegister'] ? true : false;
        event.uploadImage_showInOnlineRegistration = req.body['uploadImage_showInOnlineRegistration'] ? true : false;
        event.uploadImage_showInPrint = req.body['uploadImage_showInPrint'] ? true : false;
        event.uploadImage_includeInSearch = req.body['uploadImage_includeInSearch'] ? true : false;
        event.uploadImage_columnInExcel = req.body['uploadImage_columnInExcel'];

        event.uploadLogo_label = req.body['uploadLogo_label'];
        event.uploadLogo_isMandatory = req.body['uploadLogo_isMandatory'] ? true : false;
        event.uploadLogo_showInSearch = req.body['uploadLogo_showInSearch'] ? true : false;
        event.uploadLogo_showInRegister = req.body['uploadLogo_showInRegister'] ? true : false;
        event.uploadLogo_showInOnlineRegistration = req.body['uploadLogo_showInOnlineRegistration'] ? true : false;
        event.uploadLogo_showInPrint = req.body['uploadLogo_showInPrint'] ? true : false;
        event.uploadLogo_includeInSearch = req.body['uploadLogo_includeInSearch'] ? true : false;
        event.uploadLogo_columnInExcel = req.body['uploadLogo_columnInExcel'];

        event.sno_label = req.body['sno_label'];
        event.sno_isMandatory = req.body['sno_isMandatory'] ? true : false;
        event.sno_showInSearch = req.body['sno_showInSearch'] ? true : false;
        event.sno_showInRegister = req.body['sno_showInRegister'] ? true : false;
        event.sno_showInOnlineRegistration = req.body['sno_showInOnlineRegistration'] ? true : false;
        event.sno_showInPrint = req.body['sno_showInPrint'] ? true : false;
        event.sno_includeInSearch = req.body['sno_includeInSearch'] ? true : false;
        event.sno_columnInExcel = req.body['sno_columnInExcel'];

        event.title_label = req.body['title_label'];
        event.title_isMandatory = req.body['title_isMandatory'] ? true : false;
        event.title_showInSearch = req.body['title_showInSearch'] ? true : false;
        event.title_showInRegister = req.body['title_showInRegister'] ? true : false;
        event.title_showInOnlineRegistration = req.body['title_showInOnlineRegistration'] ? true : false;
        event.title_showInPrint = req.body['title_showInPrint'] ? true : false;
        event.title_includeInSearch = req.body['title_includeInSearch'] ? true : false;
        event.title_columnInExcel = req.body['title_columnInExcel'];


        event.firstName_label = req.body['firstName_label'];
        event.firstName_isMandatory = req.body['firstName_isMandatory'] ? true : false;
        event.firstName_showInSearch = req.body['firstName_showInSearch'] ? true : false;
        event.firstName_showInRegister = req.body['firstName_showInRegister'] ? true : false;
        event.firstName_showInOnlineRegistration = req.body['firstName_showInOnlineRegistration'] ? true : false;
        event.firstName_showInPrint = req.body['firstName_showInPrint'] ? true : false;
        event.firstName_includeInSearch = req.body['firstName_includeInSearch'] ? true : false;
        event.firstName_columnInExcel = req.body['firstName_columnInExcel'];

        event.middleName_label = req.body['middleName_label'];
        event.middleName_isMandatory = req.body['middleName_isMandatory'] ? true : false;
        event.middleName_showInSearch = req.body['middleName_showInSearch'] ? true : false;
        event.middleName_showInRegister = req.body['middleName_showInRegister'] ? true : false;
        event.middleName_showInOnlineRegistration = req.body['middleName_showInOnlineRegistration'] ? true : false;
        event.middleName_showInPrint = req.body['middleName_showInPrint'] ? true : false;
        event.middleName_includeInSearch = req.body['middleName_includeInSearch'] ? true : false;
        event.middleName_columnInExcel = req.body['middleName_columnInExcel'];

        event.lastName_label = req.body['lastName_label'];
        event.lastName_isMandatory = req.body['lastName_isMandatory'] ? true : false;
        event.lastName_showInSearch = req.body['lastName_showInSearch'] ? true : false;
        event.lastName_showInRegister = req.body['lastName_showInRegister'] ? true : false;
        event.lastName_showInOnlineRegistration = req.body['lastName_showInOnlineRegistration'] ? true : false;
        event.lastName_showInPrint = req.body['lastName_showInPrint'] ? true : false;
        event.lastName_includeInSearch = req.body['lastName_includeInSearch'] ? true : false;
        event.lastName_columnInExcel = req.body['lastName_columnInExcel'];

        event.fullName_label = req.body['fullName_label'];
        event.fullName_isMandatory = req.body['fullName_isMandatory'] ? true : false;
        event.fullName_showInSearch = req.body['fullName_showInSearch'] ? true : false;
        event.fullName_showInRegister = req.body['fullName_showInRegister'] ? true : false;
        event.fullName_showInOnlineRegistration = req.body['fullName_showInOnlineRegistration'] ? true : false;
        event.fullName_showInPrint = req.body['fullName_showInPrint'] ? true : false;
        event.fullName_includeInSearch = req.body['fullName_includeInSearch'] ? true : false;
        event.fullName_columnInExcel = req.body['fullName_columnInExcel'];

        event.jobTitle_label = req.body['jobTitle_label'];
        event.jobTitle_isMandatory = req.body['jobTitle_isMandatory'] ? true : false;
        event.jobTitle_showInSearch = req.body['jobTitle_showInSearch'] ? true : false;
        event.jobTitle_showInRegister = req.body['jobTitle_showInRegister'] ? true : false;
        event.jobTitle_showInOnlineRegistration = req.body['jobTitle_showInOnlineRegistration'] ? true : false;
        event.jobTitle_showInPrint = req.body['jobTitle_showInPrint'] ? true : false;
        event.jobTitle_includeInSearch = req.body['jobTitle_includeInSearch'] ? true : false;
        event.jobTitle_columnInExcel = req.body['jobTitle_columnInExcel'];

        event.department_label = req.body['department_label'];
        event.department_isMandatory = req.body['department_isMandatory'] ? true : false;
        event.department_showInSearch = req.body['department_showInSearch'] ? true : false;
        event.department_showInRegister = req.body['department_showInRegister'] ? true : false;
        event.department_showInOnlineRegistration = req.body['department_showInOnlineRegistration'] ? true : false;
        event.department_showInPrint = req.body['department_showInPrint'] ? true : false;
        event.department_includeInSearch = req.body['department_includeInSearch'] ? true : false;
        event.department_columnInExcel = req.body['department_columnInExcel'];


        event.companyName_label = req.body['companyName_label'];
        event.companyName_isMandatory = req.body['companyName_isMandatory'] ? true : false;
        event.companyName_showInSearch = req.body['companyName_showInSearch'] ? true : false;
        event.companyName_showInRegister = req.body['companyName_showInRegister'] ? true : false;
        event.companyName_showInOnlineRegistration = req.body['companyName_showInOnlineRegistration'] ? true : false;
        event.companyName_showInPrint = req.body['companyName_showInPrint'] ? true : false;
        event.companyName_includeInSearch = req.body['companyName_includeInSearch'] ? true : false;
        event.companyName_columnInExcel = req.body['companyName_columnInExcel'];


        event.mobile1_label = req.body['mobile1_label'];
        event.mobile1_isMandatory = req.body['mobile1_isMandatory'] ? true : false;
        event.mobile1_showInSearch = req.body['mobile1_showInSearch'] ? true : false;
        event.mobile1_showInRegister = req.body['mobile1_showInRegister'] ? true : false;
        event.mobile1_showInOnlineRegistration = req.body['mobile1_showInOnlineRegistration'] ? true : false;
        event.mobile1_showInPrint = req.body['mobile1_showInPrint'] ? true : false;
        event.mobile1_includeInSearch = req.body['mobile1_includeInSearch'] ? true : false;
        event.mobile1_columnInExcel = req.body['mobile1_columnInExcel'];

        event.mobile2_label = req.body['mobile2_label'];
        event.mobile2_isMandatory = req.body['mobile2_isMandatory'] ? true : false;
        event.mobile2_showInSearch = req.body['mobile2_showInSearch'] ? true : false;
        event.mobile2_showInRegister = req.body['mobile2_showInRegister'] ? true : false;
        event.mobile2_showInOnlineRegistration = req.body['mobile2_showInOnlineRegistration'] ? true : false;
        event.mobile2_showInPrint = req.body['mobile2_showInPrint'] ? true : false;
        event.mobile2_includeInSearch = req.body['mobile2_includeInSearch'] ? true : false;
        event.mobile2_columnInExcel = req.body['mobile2_columnInExcel'];

        event.tel1_label = req.body['tel1_label'];
        event.tel1_isMandatory = req.body['tel1_isMandatory'] ? true : false;
        event.tel1_showInSearch = req.body['tel1_showInSearch'] ? true : false;
        event.tel1_showInRegister = req.body['tel1_showInRegister'] ? true : false;
        event.tel1_showInOnlineRegistration = req.body['tel1_showInOnlineRegistration'] ? true : false;
        event.tel1_showInPrint = req.body['tel1_showInPrint'] ? true : false;
        event.tel1_includeInSearch = req.body['tel1_includeInSearch'] ? true : false;
        event.tel1_columnInExcel = req.body['tel1_columnInExcel'];

        event.tel2_label = req.body['tel2_label'];
        event.tel2_isMandatory = req.body['tel2_isMandatory'] ? true : false;
        event.tel2_showInSearch = req.body['tel2_showInSearch'] ? true : false;
        event.tel2_showInRegister = req.body['tel2_showInRegister'] ? true : false;
        event.tel2_showInOnlineRegistration = req.body['tel2_showInOnlineRegistration'] ? true : false;
        event.tel2_showInPrint = req.body['tel2_showInPrint'] ? true : false;
        event.tel2_includeInSearch = req.body['tel2_includeInSearch'] ? true : false;
        event.tel2_columnInExcel = req.body['tel2_columnInExcel'];

        event.fax_label = req.body['fax_label'];
        event.fax_isMandatory = req.body['fax_isMandatory'] ? true : false;
        event.fax_showInSearch = req.body['fax_showInSearch'] ? true : false;
        event.fax_showInRegister = req.body['fax_showInRegister'] ? true : false;
        event.fax_showInOnlineRegistration = req.body['fax_showInOnlineRegistration'] ? true : false;
        event.fax_showInPrint = req.body['fax_showInPrint'] ? true : false;
        event.fax_includeInSearch = req.body['fax_includeInSearch'] ? true : false;
        event.fax_columnInExcel = req.body['fax_columnInExcel'];

        event.email_label = req.body['email_label'];
        event.email_isMandatory = req.body['email_isMandatory'] ? true : false;
        event.email_showInSearch = req.body['email_showInSearch'] ? true : false;
        event.email_showInRegister = req.body['email_showInRegister'] ? true : false;
        event.email_showInOnlineRegistration = req.body['email_showInOnlineRegistration'] ? true : false;
        event.email_showInPrint = req.body['email_showInPrint'] ? true : false;
        event.email_includeInSearch = req.body['email_includeInSearch'] ? true : false;
        event.email_columnInExcel = req.body['email_columnInExcel'];

        event.website_label = req.body['website_label'];
        event.website_isMandatory = req.body['website_isMandatory'] ? true : false;
        event.website_showInSearch = req.body['website_showInSearch'] ? true : false;
        event.website_showInRegister = req.body['website_showInRegister'] ? true : false;
        event.website_showInOnlineRegistration = req.body['website_showInOnlineRegistration'] ? true : false;
        event.website_showInPrint = req.body['website_showInPrint'] ? true : false;
        event.website_includeInSearch = req.body['website_includeInSearch'] ? true : false;
        event.website_columnInExcel = req.body['website_columnInExcel'];

        event.address1_label = req.body['address1_label'];
        event.address1_isMandatory = req.body['address1_isMandatory'] ? true : false;
        event.address1_showInSearch = req.body['address1_showInSearch'] ? true : false;
        event.address1_showInRegister = req.body['address1_showInRegister'] ? true : false;
        event.address1_showInOnlineRegistration = req.body['address1_showInOnlineRegistration'] ? true : false;
        event.address1_showInPrint = req.body['address1_showInPrint'] ? true : false;
        event.address1_includeInSearch = req.body['address1_includeInSearch'] ? true : false;
        event.address1_columnInExcel = req.body['address1_columnInExcel'];

        event.address2_label = req.body['address2_label'];
        event.address2_isMandatory = req.body['address2_isMandatory'] ? true : false;
        event.address2_showInSearch = req.body['address2_showInSearch'] ? true : false;
        event.address2_showInRegister = req.body['address2_showInRegister'] ? true : false;
        event.address2_showInOnlineRegistration = req.body['address2_showInOnlineRegistration'] ? true : false;
        event.address2_showInPrint = req.body['address2_showInPrint'] ? true : false;
        event.address2_includeInSearch = req.body['address2_includeInSearch'] ? true : false;
        event.address2_columnInExcel = req.body['address2_columnInExcel'];

        event.city_label = req.body['city_label'];
        event.city_isMandatory = req.body['city_isMandatory'] ? true : false;
        event.city_showInSearch = req.body['city_showInSearch'] ? true : false;
        event.city_showInRegister = req.body['city_showInRegister'] ? true : false;
        event.city_showInOnlineRegistration = req.body['city_showInOnlineRegistration'] ? true : false;
        event.city_showInPrint = req.body['city_showInPrint'] ? true : false;
        event.city_includeInSearch = req.body['city_includeInSearch'] ? true : false;
        event.city_columnInExcel = req.body['city_columnInExcel'];

        event.country_label = req.body['country_label'];
        event.country_isMandatory = req.body['country_isMandatory'] ? true : false;
        event.country_showInSearch = req.body['country_showInSearch'] ? true : false;
        event.country_showInRegister = req.body['country_showInRegister'] ? true : false;
    event.country_showInOnlineRegistration = req.body['country_showInOnlineRegistration'] ? true : false;
        event.country_showInPrint = req.body['country_showInPrint'] ? true : false;
        event.country_includeInSearch = req.body['country_includeInSearch'] ? true : false;
        event.country_columnInExcel = req.body['country_columnInExcel'];

        event.poBox_label = req.body['poBox_label'];
        event.poBox_isMandatory = req.body['poBox_isMandatory'] ? true : false;
        event.poBox_showInSearch = req.body['poBox_showInSearch'] ? true : false;
        event.poBox_showInRegister = req.body['poBox_showInRegister'] ? true : false;
        event.poBox_showInOnlineRegistration = req.body['poBox_showInOnlineRegistration'] ? true : false;
        event.poBox_showInPrint = req.body['poBox_showInPrint'] ? true : false;
        event.poBox_includeInSearch = req.body['poBox_includeInSearch'] ? true : false;
        event.poBox_columnInExcel = req.body['poBox_columnInExcel'];

        event.postalCode_label = req.body['postalCode_label'];
        event.postalCode_isMandatory = req.body['postalCode_isMandatory'] ? true : false;
        event.postalCode_showInSearch = req.body['postalCode_showInSearch'] ? true : false;
        event.postalCode_showInRegister = req.body['postalCode_showInRegister'] ? true : false;
        event.postalCode_showInOnlineRegistration = req.body['postalCode_showInOnlineRegistration'] ? true : false;
        event.postalCode_showInPrint = req.body['postalCode_showInPrint'] ? true : false;
        event.postalCode_includeInSearch = req.body['postalCode_includeInSearch'] ? true : false;
        event.postalCode_columnInExcel = req.body['postalCode_columnInExcel'];

        event.badgeCategory_label = req.body['badgeCategory_label'];
        event.badgeCategory_isMandatory = req.body['badgeCategory_isMandatory'] ? true : false;
        event.badgeCategory_showInSearch = req.body['badgeCategory_showInSearch'] ? true : false;
        event.badgeCategory_showInRegister = req.body['badgeCategory_showInRegister'] ? true : false;
    event.badgeCategory_showInOnlineRegistration = req.body['badgeCategory_showInOnlineRegistration'] ? true : false;
        event.badgeCategory_showInPrint = req.body['badgeCategory_showInPrint'] ? true : false;
        event.badgeCategory_includeInSearch = req.body['badgeCategory_includeInSearch'] ? true : false;
        event.badgeCategory_columnInExcel = req.body['badgeCategory_columnInExcel'];


        event.regType_label = req.body['regType_label'];
        event.regType_isMandatory = req.body['regType_isMandatory'] ? true : false;
        event.regType_showInSearch = req.body['regType_showInSearch'] ? true : false;
        event.regType_showInRegister = req.body['regType_showInRegister'] ? true : false;
        event.regType_showInOnlineRegistration = req.body['regType_showInOnlineRegistration'] ? true : false;
        event.regType_showInPrint = req.body['regType_showInPrint'] ? true : false;
        event.regType_includeInSearch = req.body['regType_includeInSearch'] ? true : false;
        event.regType_columnInExcel = req.body['regType_columnInExcel'];

        event.regDate_label = req.body['regDate_label'];
        event.regDate_isMandatory = req.body['regDate_isMandatory'] ? true : false;
        event.regDate_showInSearch = req.body['regDate_showInSearch'] ? true : false;
        event.regDate_showInRegister = req.body['regDate_showInRegister'] ? true : false;
        event.regDate_showInOnlineRegistration = req.body['regDate_showInOnlineRegistration'] ? true : false;
        event.regDate_showInPrint = req.body['regDate_showInPrint'] ? true : false;
        event.regDate_includeInSearch = req.body['regDate_includeInSearch'] ? true : false;
        event.regDate_columnInExcel = req.body['regDate_columnInExcel'];

        event.badgePrintDate_label = req.body['badgePrintDate_label'];
        event.badgePrintDate_isMandatory = req.body['badgePrintDate_isMandatory'] ? true : false;
        event.badgePrintDate_showInSearch = req.body['badgePrintDate_showInSearch'] ? true : false;
        event.badgePrintDate_showInRegister = req.body['badgePrintDate_showInRegister'] ? true : false;
        event.badgePrintDate_showInOnlineRegistration = req.body['badgePrintDate_showInOnlineRegistration'] ? true : false;
        event.badgePrintDate_showInPrint = req.body['badgePrintDate_showInPrint'] ? true : false;
        event.badgePrintDate_includeInSearch = req.body['badgePrintDate_includeInSearch'] ? true : false;
        event.badgePrintDate_columnInExcel = req.body['badgePrintDate_columnInExcel'];

        event.modifiedDate_label = req.body['modifiedDate_label'];
        event.modifiedDate_isMandatory = req.body['modifiedDate_isMandatory'] ? true : false;
        event.modifiedDate_showInSearch = req.body['modifiedDate_showInSearch'] ? true : false;
        event.modifiedDate_showInRegister = req.body['modifiedDate_showInRegister'] ? true : false;
        event.modifiedDate_showInOnlineRegistration = req.body['modifiedDate_showInOnlineRegistration'] ? true : false;
        event.modifiedDate_showInPrint = req.body['modifiedDate_showInPrint'] ? true : false;
        event.modifiedDate_includeInSearch = req.body['modifiedDate_includeInSearch'] ? true : false;
        event.modifiedDate_columnInExcel = req.body['modifiedDate_columnInExcel'];

        event.statusFlag_label = req.body['statusFlag_label'];
        event.statusFlag_isMandatory = req.body['statusFlag_isMandatory'] ? true : false;
        event.statusFlag_showInSearch = req.body['statusFlag_showInSearch'] ? true : false;
        event.statusFlag_showInRegister = req.body['statusFlag_showInRegister'] ? true : false;
        event.statusFlag_showInOnlineRegistration = req.body['statusFlag_showInOnlineRegistration'] ? true : false;
        event.statusFlag_showInPrint = req.body['statusFlag_showInPrint'] ? true : false;
        event.statusFlag_includeInSearch = req.body['statusFlag_includeInSearch'] ? true : false;
        event.statusFlag_columnInExcel = req.body['statusFlag_columnInExcel'];


        event.backoffice_label = req.body['backoffice_label'];
        event.backoffice_isMandatory = req.body['backoffice_isMandatory'] ? true : false;
        event.backoffice_showInSearch = req.body['backoffice_showInSearch'] ? true : false;
        event.backoffice_showInRegister = req.body['backoffice_showInRegister'] ? true : false;
        event.backoffice_showInOnlineRegistration = req.body['backoffice_showInOnlineRegistration'] ? true : false;
        event.backoffice_showInPrint = req.body['backoffice_showInPrint'] ? true : false;
        event.backoffice_includeInSearch = req.body['backoffice_includeInSearch'] ? true : false;
        event.backoffice_columnInExcel = req.body['backoffice_columnInExcel'];


        event.comment1_label = req.body['comment1_label'];
        event.comment1_isMandatory = req.body['comment1_isMandatory'] ? true : false;
        event.comment1_showInSearch = req.body['comment1_showInSearch'] ? true : false;
        event.comment1_showInRegister = req.body['comment1_showInRegister'] ? true : false;
        event.comment1_showInOnlineRegistration = req.body['comment1_showInOnlineRegistration'] ? true : false;
        event.comment1_showInPrint = req.body['comment1_showInPrint'] ? true : false;
        event.comment1_includeInSearch = req.body['comment1_includeInSearch'] ? true : false;
        event.comment1_columnInExcel = req.body['comment1_columnInExcel'];

        event.comment2_label = req.body['comment2_label'];
        event.comment2_isMandatory = req.body['comment2_isMandatory'] ? true : false;
        event.comment2_showInSearch = req.body['comment2_showInSearch'] ? true : false;
        event.comment2_showInRegister = req.body['comment2_showInRegister'] ? true : false;
        event.comment2_showInOnlineRegistration = req.body['comment2_showInOnlineRegistration'] ? true : false;
        event.comment2_showInPrint = req.body['comment2_showInPrint'] ? true : false;
        event.comment2_includeInSearch = req.body['comment2_includeInSearch'] ? true : false;
        event.comment2_columnInExcel = req.body['comment2_columnInExcel'];

        event.comment3_label = req.body['comment3_label'];
        event.comment3_isMandatory = req.body['comment3_isMandatory'] ? true : false;
        event.comment3_showInSearch = req.body['comment3_showInSearch'] ? true : false;
        event.comment3_showInRegister = req.body['comment3_showInRegister'] ? true : false;
        event.comment3_showInOnlineRegistration = req.body['comment3_showInOnlineRegistration'] ? true : false;
        event.comment3_showInPrint = req.body['comment3_showInPrint'] ? true : false;
        event.comment3_includeInSearch = req.body['comment3_includeInSearch'] ? true : false;
        event.comment3_columnInExcel = req.body['comment3_columnInExcel'];

        event.comment4_label = req.body['comment4_label'];
        event.comment4_isMandatory = req.body['comment4_isMandatory'] ? true : false;
        event.comment4_showInSearch = req.body['comment4_showInSearch'] ? true : false;
        event.comment4_showInRegister = req.body['comment4_showInRegister'] ? true : false;
        event.comment4_showInOnlineRegistration = req.body['comment4_showInOnlineRegistration'] ? true : false;
        event.comment4_showInPrint = req.body['comment4_showInPrint'] ? true : false;
        event.comment4_includeInSearch = req.body['comment4_includeInSearch'] ? true : false;
        event.comment4_columnInExcel = req.body['comment4_columnInExcel'];


        event.comment5_label = req.body['comment5_label'];
        event.comment5_isMandatory = req.body['comment5_isMandatory'] ? true : false;
        event.comment5_showInSearch = req.body['comment5_showInSearch'] ? true : false;
        event.comment5_showInRegister = req.body['comment5_showInRegister'] ? true : false;
        event.comment5_showInOnlineRegistration = req.body['comment5_showInOnlineRegistration'] ? true : false;
        event.comment5_showInPrint = req.body['comment5_showInPrint'] ? true : false;
        event.comment5_includeInSearch= req.body['comment5_includeInSearch'] ? true : false;
        event.comment5_columnInExcel = req.body['comment5_columnInExcel'];

        event.comment6_label = req.body['comment6_label'];
        event.comment6_isMandatory = req.body['comment6_isMandatory'] ? true : false;
        event.comment6_showInSearch = req.body['comment6_showInSearch'] ? true : false;
        event.comment6_showInRegister = req.body['comment6_showInRegister'] ? true : false;
        event.comment6_showInPrint = req.body['comment6_showInPrint'] ? true : false;
        event.comment6_includeInSearch = req.body['comment6_includeInSearch'] ? true : false;
        event.comment6_columnInExcel = req.body['comment6_columnInExcel'];

        event.comment7_label = req.body['comment7_label'];
        event.comment7_isMandatory = req.body['comment7_isMandatory'] ? true : false;
        event.comment7_showInSearch = req.body['comment7_showInSearch'] ? true : false;
        event.comment7_showInRegister = req.body['comment7_showInRegister'] ? true : false;
        event.comment7_showInPrint = req.body['comment7_showInPrint'] ? true : false;
        event.comment7_includeInSearch = req.body['comment7_includeInSearch'] ? true : false;
        event.comment7_columnInExcel = req.body['comment7_columnInExcel'];

        event.comment8_label = req.body['comment8_label'];
        event.comment8_isMandatory = req.body['comment8_isMandatory'] ? true : false;
        event.comment8_showInSearch = req.body['comment8_showInSearch'] ? true : false;
        event.comment8_showInRegister = req.body['comment8_showInRegister'] ? true : false;
        event.comment8_showInPrint = req.body['comment8_showInPrint'] ? true : false;
        event.comment8_includeInSearch = req.body['comment8_includeInSearch'] ? true : false;
        event.comment8_columnInExcel = req.body['comment8_columnInExcel'];

        event.comment9_label = req.body['comment9_label'];
        event.comment9_isMandatory = req.body['comment9_isMandatory'] ? true : false;
        event.comment9_showInSearch = req.body['comment9_showInSearch'] ? true : false;
        event.comment9_showInRegister = req.body['comment9_showInRegister'] ? true : false;
        event.comment9_showInPrint = req.body['comment9_showInPrint'] ? true : false;
        event.comment9_includeInSearch = req.body['comment9_includeInSearch'] ? true : false;
        event.comment9_columnInExcel = req.body['comment9_columnInExcel'];

        event.comment10_label = req.body['comment10_label'];
        event.comment10_isMandatory = req.body['comment10_isMandatory'] ? true : false;
        event.comment10_showInSearch = req.body['comment10_showInSearch'] ? true : false;
        event.comment10_showInRegister = req.body['comment10_showInRegister'] ? true : false;
        event.comment10_showInOnlineRegistration = req.body['comment10_showInOnlineRegistration'] ? true : false;
        event.comment10_showInPrint = req.body['comment10_showInPrint'] ? true : false;
        event.comment10_includeInSearch = req.body['comment10_includeInSearch'] ? true : false;
        event.comment10_columnInExcel = req.body['comment10_columnInExcel'];

        // Handle all showInOnlineRegistration fields that might be missing
        var fieldNames = [
            'firstName', 'middleName', 'lastName', 'fullName', 'jobTitle', 'department', 
            'companyName', 'mobile1', 'mobile2', 'tel1', 'tel2', 'fax', 'email', 'website',
            'address1', 'address2', 'city', 'country', 'poBox', 'postalCode', 'badgeCategory',
            'regType', 'regDate', 'comment1', 'comment2', 'comment3', 'comment4', 'comment5',
            'comment6', 'comment7', 'comment8', 'comment9'
        ];
        
        fieldNames.forEach(function(fieldName) {
            var fieldKey = fieldName + '_showInOnlineRegistration';
            if (typeof event[fieldKey] === 'undefined') {
                event[fieldKey] = req.body[fieldKey] ? true : false;
            } else {
                event[fieldKey] = req.body[fieldKey] ? true : false;
            }
        });

        event.save(function (err, result) {
            //res.render('event/event-fields', {messages:messages, hasErrors: messages.length>0,  event:event})
            res.redirect('/event/badge-categories/' + eventId);
        });
    })



    /*
    InputField.find({}, function(err,inputFields){
        if(err)
            throw err;

            var done=0;
            var newInputFields = [];

            inputFields.forEach(function(field){
                console.log(field.fieldName + ': ' + req.body[field._id + '-label']);

                var eventField = new EventField();
                eventField.eventId = eventId;
                eventField.fieldId = field._id;
                eventField.fieldLabel = req.body[field._id + '-label'];
                eventField.isMandatory = req.body[field._id + '-isMandatory'] ? true: false;
                eventField.showInSearch = req.body[field._id + '-showInSearch'] ? true: false;
                eventField.showInRegister = req.body[field._id + '-showInRegister'] ? true: false;
                eventField.showInPrint = req.body[field._id + '-showInPrint'] ? true: false;

                field.fieldLabel = req.body[field._id + '-label'];
                field.isMandatory = req.body[field._id + '-isMandatory'] ? true: false;
                field.showInSearch = req.body[field._id + '-showInSearch'] ? true: false;
                field.showInRegister = req.body[field._id + '-showInRegister'] ? true: false;
                field.showInPrint = req.body[field._id + '-showInPrint'] ? true: false;

                newInputFields.push(field);

                eventField.save(function(err,result){
                    if(err)
                        throw err;
                    done++;

                    if(done===3){
                        res.render('event/event-fields', {messages:messages, hasErrors: messages.length>0,  inputFields:newInputFields})
                    }
                    
                });
            });//inputFields.forEach
    });//InputField.find
    */


})

router.get('/', function (req, res) {
    var messages = [];
    req.session.eventLogo=null;
    req.session.eventId=null;

    if(req.user.role=='user')
        return res.redirect('/event/registration/' + req.user.event);


    Event.find({}, function (err, result) {
        if (err)
            throw err;

        res.render('event/index', { messages: messages, events: result });

    })
})

router.get('/getregistration', function(req,res){
    var messages = [];
    
        var scripts = [{ script: '/javascripts/registration.js' }];
    
        var eventId = req.session.eventId;
        var startIndex = parseInt(req.query.start);
        var pageSize = parseInt(req.query.length);
        var draw = req.query.draw;
        var search = req.query.search.value;
        var searchArray = search.split(' ');

        if(search==''){
            var result= {
                "draw": draw,
                "recordsTotal": 0,
                "recordsFiltered": 0,
                "data": [],
                };
            
                return res.json(result);
        }

        //console.log(`search=${search}`);

        Event.findById(eventId, function (err, event) {
    
            var searchColumns=[];
            
            
            Object.keys(event.toJSON()).forEach(function(item){
                if(item.indexOf('_includeInSearch')>-1 && event[item]==true ){
                    var key = item.substring(0, item.indexOf('_includeInSearch') );

                        var regexObj = {};
                        regexObj[key] = {};
                        regexObj[key]['$regex']='.*' + searchArray[0] + '.*';
                        regexObj[key]['$options']='i';
                        searchColumns.push(regexObj);

                }
            });
            //console.log(`search columns = ${searchColumns}`);


    
            EventData
                .find({ event: eventId, 
                    /*
                    $or:[  
                        {fullName: { $regex: '.*' + search + '.*', $options:'i' }},
                        {email: { $regex: '.*' + search + '.*', $options:'i' }},
                    ] })
                    */
                    $or:searchColumns
                 })
                .skip(startIndex)
                .limit(50000)
                //.populate('event')
                //.populate('country').populate('badgeCategory')
                .exec(function (err, eventData) {
                    if (err)
                        throw err;
    
                        var rows=[];

                        eventData.forEach(function(data){
                            var columns=[];


                            Object.keys(event.toJSON()).forEach(function(item){
                                if(item.indexOf('_showInSearch')>-1 && event[item]==true ){
                                    var key = item.substring(0, item.indexOf('_showInSearch') );
                               
                                    columns.unshift(data[key]);
                                    //console.log(`key=${key};event=${data[key]}`)
                                }
                            });
                            columns.unshift(data._id);

                            //if search coloumns more than 1
                            var includeRow=false;
                            
                            /*
                            console.log(`search array len=${searchArray.length}`);
                            if(searchArray.length==1){
                                includeRow=true;                                    
                            }

                            if(searchArray.length>1){
                                

                                Object.keys(event.toJSON()).forEach(function(item){
                                    if(item.indexOf('_includeInSearch')>-1 && event[item]==true ){
                                        var key = item.substring(0, item.indexOf('_includeInSearch') );
                                            console.log(`searchArray=${searchArray[1]}, datakey=${data[key]}`);
                                            if(data[key] && searchArray[1] &&  data[key].toUpperCase().indexOf(searchArray[1].toUpperCase())>-1){
                                                includeRow=true;
                                            }
                                    }
                                });
                            }
                            */
                            var eventKeys = Object.keys(event.toJSON());
                            for(var i=0; i < searchArray.length; i++){
                                if(searchArray[i]=='') continue;

                                includeRow=false;

                                for(var j=0; j < eventKeys.length; j++){
                                    var item = eventKeys[j];

                                    if(item.indexOf('_includeInSearch')>-1 && event[item]==true ){
                                        var key = item.substring(0, item.indexOf('_includeInSearch') );
                                            console.log(`searchArray=${searchArray[i]}, datakey=${data[key]}`);

                                            var re = new RegExp('(?:^|\\s)' + searchArray[i] + '(?=\\s|$)','gi');

                                            if(data[key] && searchArray[i] &&  data[key].toUpperCase().indexOf(searchArray[i].toUpperCase())>-1){
                                            //if(data[key] && searchArray[i] &&  re.test(data[key]) ){
                                                includeRow=true;
                                            }
                                        
                                    }
                                }

                            }

                       
                           
                            //end if search columns more than 1
                            if(includeRow)
                                rows.push(columns);
                        });



                        /*
                        EventData.find({ event: eventId, 
                            $or:searchColumns
                        }).count().exec(function(err, count){
                        var result= {
                            "draw": draw,
                            "recordsTotal": count,
                            "recordsFiltered": count,
                            "data": rows,
                            };

                            res.json(result);

                        })
                        */
                       var result= {
                        "draw": draw,
                        "recordsTotal": rows.length,
                        "recordsFiltered": rows.length,
                        "data": rows,
                        };

                        res.json(result);
                        
                   
    
                })
        })
})

router.get('/registration/:id', function (req, res) {
    var messages = [];
    var eventId = req.params.id;
    req.session.eventId = eventId;

    var scripts = [{ script: '/javascripts/registration.js' }];

    Event.findById(eventId, function (err, event) {
        var columns=[];

        Object.keys(event.toJSON()).forEach(function(item){
            

            if(item.indexOf('_showInSearch')>-1 && event[item]==true ){
                var key = item.substring(0, item.indexOf('_showInSearch') ) + '_label';
           
                columns.unshift(event[key]);
            }
        })

        columns.unshift('Key');
        var eventDataIdForPrint='';

        if(req.session.eventDataIdForPrint){
            scripts = [{ script: '/javascripts/printbadge.js' }];
            eventDataIdForPrint = req.session.eventDataIdForPrint;
            delete req.session.eventDataIdForPrint;
        }
      
        req.session.eventLogo = event.eventLogo;
        res.render('event/registration', { eventDataIdForPrint:eventDataIdForPrint, scripts:scripts, messages: messages, event: event, columns:columns });

    });
    



});

router.get('/registration2/:id', function (req, res) {
    var messages = [];
    var eventId = req.params.id;
    req.session.eventId = eventId;

    var scripts = [{ script: '/javascripts/registration2.js' }];




    Event.findById(eventId, function (err, event) {
        var columns=[];
        var columnKeys=[];

        Object.keys(event.toJSON()).forEach(function(item){
            

            if(item.indexOf('_showInSearch')>-1 && event[item]==true ){
                var key = item.substring(0, item.indexOf('_showInSearch') ) ;
           
                columns.unshift(event[key + '_label' ]);
                columnKeys.unshift(key);
            }
        })

        columns.unshift('Key');
        columnKeys.unshift('_id');

        var rows=[];
        EventData.find({event:eventId}, function(err, eventData){
            
            eventData.forEach(function(r){
                var row=[];
                columnKeys.forEach(function(c){
                    row.push({key:c, value:r[c]});
                });
                rows.push(row);
            });

            res.render('event/registration2', {scripts:scripts, messages: messages, event: event, columns:columns, rows:rows });
        });

        

    });
    



});

router.get('/export-files', function(req,res){
    var messages=[];
   
    
    ExportFiles.findOne({event:req.session.eventId}, function(err, data){
        if(err) throw err;
        var autorefresh=true;

        if(data==null){
            autorefresh=false;
        }

        else if(data.isCompleted){
            autorefresh=false;
        }
        else {
            messages.push('This page will auto refresh after every 30 seconds with updated Status. Do not refresh manually.');
        }

        res.render('event/export-files',{messages:messages,hasErrors:messages.length>0, data:data, autorefresh:autorefresh});
    });



  });


  router.get('/import-files', function(req,res){
    var messages=[];
   
    
    ExportFiles.findOne({event:req.session.eventId}, function(err, data){
        if(err) throw err;
        var autorefresh=true;

        if(data==null){
            autorefresh=false;
        }

        else if(data.isCompleted){
            autorefresh=false;
        }
        else {
            messages.push('This page will auto refresh after every 30 seconds with updated Status. Do not refresh manually.');
        }

        res.render('event/import-files',{messages:messages,hasErrors:messages.length>0, data:data, autorefresh:autorefresh});
    });



  });  

router.get('/manage-fonts', function(req, res) {
    var Font = require('../models/font');
    
    console.log('Loading manage fonts page...');
    
    Font.find({isActive: true}).sort({created: -1}).exec(function(err, fonts) {
        if(err) {
            console.error('Error loading fonts:', err);
            fonts = [];
        }
        
        console.log('Raw fonts from database:', fonts.length);
        fonts.forEach(function(font, index) {
            console.log(`Font ${index + 1}:`, font.fontName, font.fontType, font.googleFontApi ? 'hasAPI' : 'noAPI', font.fontFile ? 'hasFile' : 'noFile');
        });
        
        // Transform fonts for the simplified display
        var displayFonts = fonts.map(function(font) {
            return {
                name: font.fontName,
                type: font.fontType === 'google' ? 'Google Fonts API' : 'Custom Font',
                url: font.fontType === 'google' ? font.googleFontApi : '/uploads/fonts/' + font.fontFile,
                isGoogleFont: font.fontType === 'google'
            };
        });
        
        console.log('Transformed fonts for display:', displayFonts.length);
        displayFonts.forEach(function(font, index) {
            console.log(`Display Font ${index + 1}:`, font.name, font.type, font.url);
        });
        
        res.render('event/manage-fonts', { 
            fonts: displayFonts
        });
    });
});

// Simplified POST route for testing
router.post('/manage-fonts-simple', function(req, res) {
    var Font = require('../models/font');
    var messages = [];
    
    console.log('=== SIMPLE FONT UPLOAD STARTED ===');
    console.log('Body:', req.body);
    
    // Simple body parser approach for testing
    var fontName = req.body.fontName;
    var fontType = req.body.fontType;
    var fontApi = req.body.fontApi;
    
    console.log('Simple data:', {fontName, fontType, fontApi});
    
    if(!fontName) {
        messages.push('Font name is required');
        return res.redirect('/event/manage-fonts');
    }
    
    var newFont = new Font({
        fontName: fontName,
        fontFamily: fontName,
        fontType: fontType || 'google',
        googleFontApi: fontApi || 'https://fonts.googleapis.com/css2?family=Open+Sans',
        isActive: true
    });
    
    console.log('Saving font:', newFont);
    
    newFont.save(function(err, result) {
        if(err) {
            console.error('Save error:', err);
            messages.push('Error: ' + err.message);
        } else {
            console.log('Font saved successfully:', result._id);
            messages.push('Font added successfully!');
        }
        res.redirect('/event/manage-fonts');
    });
});

router.post('/manage-fonts', function(req, res) {
    var Font = require('../models/font');
    var form = new formidable.IncomingForm();
    
    console.log('Font upload request received');
    
    form.parse(req, function (err, fields, files) {
        if(err) {
            console.error('Form parse error:', err);
            return res.redirect('/event/manage-fonts');
        }
        
        console.log('Form fields:', fields);
        console.log('Form files:', Object.keys(files));
        
        var fontName = fields.fontName;
        var fontApi = fields.fontApi;
        
        if(!fontName || fontName.trim() === '') {
            console.log('Font name is empty');
            return res.redirect('/event/manage-fonts');
        }
        
        console.log('Creating font:', fontName);
        
        var newFont = new Font({
            fontName: fontName.trim(),
            fontFamily: fontName.trim(),
            isActive: true
        });
        
        // If API link provided, use Google Fonts
        if(fontApi && fontApi.trim() !== '') {
            console.log('Processing Google Font API:', fontApi);
            newFont.fontType = 'google';
            newFont.googleFontApi = fontApi.trim();
            saveFont();
        }
        // If file uploaded, handle file upload
        else if(files.fontFile && files.fontFile.name) {
            console.log('Processing font file upload:', files.fontFile.name);
            newFont.fontType = 'custom';
            handleFileUpload(files.fontFile);
        }
        else {
            console.log('No API link or file provided');
            return res.redirect('/event/manage-fonts');
        }
        
        function handleFileUpload(fileObj) {
            var oldpath = fileObj.path;
            var fileName = Date.now() + '_' + fileObj.name.replace(/\s+/g, '_');
            var newpath = path.join(__dirname, '../public/uploads/fonts/') + fileName;
            
            // Create fonts directory
            var fontsDir = path.join(__dirname, '../public/uploads/fonts/');
            if (!fs.existsSync(fontsDir)) {
                fs.mkdirSync(fontsDir, { recursive: true });
            }
            
            // Copy file
            fs.readFile(oldpath, function (err, data) {
                if (!err) {
                    fs.writeFile(newpath, data, function (err) {
                        if (!err) {
                            newFont.fontFile = fileName;
                            console.log('File saved successfully');
                            saveFont();
                        } else {
                            console.error('Error saving file:', err);
                        }
                        fs.unlink(oldpath, function () {});
                    });
                } else {
                    console.error('Error reading file:', err);
                }
            });
        }
        
        function saveFont() {
            console.log('Saving font to database:', newFont);
            newFont.save(function(err, savedFont) {
                if(err) {
                    console.error('Database save error:', err);
                } else {
                    console.log('Font saved successfully:', savedFont.fontName, savedFont._id);
                }
                res.redirect('/event/manage-fonts');
            });
        }
    });
});

// Font delete route for AJAX
router.post('/delete-font', function(req, res) {
    var Font = require('../models/font');
    var fontName = req.body.fontName;
    
    Font.findOneAndUpdate({fontName: fontName}, {isActive: false}, function(err) {
        if(err) {
            return res.status(500).json({error: 'Error deleting font'});
        }
        res.json({success: true});
    });
});

router.get('/test-fonts', function(req, res) {
    var Font = require('../models/font');
    
    Font.find({}).exec(function(err, fonts) {
        if(err) {
            return res.json({error: err.message});
        }
        
        res.json({
            totalFonts: fonts.length,
            activeFonts: fonts.filter(f => f.isActive).length,
            fonts: fonts.map(f => ({
                fontName: f.fontName,
                fontType: f.fontType,
                fontFamily: f.fontFamily,
                isActive: f.isActive,
                hasGoogleApi: !!f.googleFontApi,
                hasFontFile: !!f.fontFile
            }))
        });
    });
});

// Route to create test font
router.get('/create-test-font', function(req, res) {
    var Font = require('../models/font');
    
    console.log('Creating test font');
    
    var testFont = new Font({
        fontName: 'Test Arial',
        fontFamily: 'Arial, sans-serif',
        fontType: 'google',
        googleFontApi: 'https://fonts.googleapis.com/css2?family=Arial',
        isActive: true
    });
    
    testFont.save(function(err, result) {
        if(err) {
            console.error('Error creating test font:', err);
            return res.json({error: 'Error creating test font', details: err.message});
        }
        
        console.log('Test font created successfully:', result);
        res.json({success: true, font: result});
    });
});

// Simple route to manually add a font (for testing)
router.get('/add-simple-font/:name', function(req, res) {
    var Font = require('../models/font');
    var fontName = req.params.name || 'Test Font';
    
    console.log('Adding simple font:', fontName);
    
    var newFont = new Font({
        fontName: fontName,
        fontFamily: fontName,
        fontType: 'google',
        googleFontApi: 'https://fonts.googleapis.com/css2?family=Open+Sans',
        isActive: true
    });
    
    newFont.save(function(err, result) {
        if(err) {
            console.error('Error saving simple font:', err);
            return res.json({error: 'Error saving font', details: err.message});
        }
        
        console.log('Simple font saved successfully:', result);
        res.redirect('/event/manage-fonts');
    });
});

// Route to clean up invalid fonts
router.get('/cleanup-fonts', function(req, res) {
    var Font = require('../models/font');
    
    console.log('Cleaning up invalid fonts...');
    
    // Remove fonts without fontName
    Font.deleteMany({
        $or: [
            {fontName: {$exists: false}},
            {fontName: null},
            {fontName: ''}
        ]
    }, function(err, result) {
        if(err) {
            console.error('Error cleaning up fonts:', err);
            return res.json({error: 'Error cleaning up fonts', details: err.message});
        }
        
        console.log('Cleanup result:', result);
        res.json({
            success: true, 
            deletedCount: result.deletedCount,
            message: `Cleaned up ${result.deletedCount} invalid fonts`
        });
    });
});

router.get('/delete-font/:id', function(req, res) {
    var Font = require('../models/font');
    var fontId = req.params.id;
    
    Font.findByIdAndUpdate(fontId, {isActive: false}, function(err, font) {
        if(err || !font) {
            console.log('Error deleting font:', err);
        }
        res.redirect('/event/manage-fonts');
    });
});

// Route to toggle online registration for an event
router.post('/toggle-online-registration/:id', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    var enabled = req.body.enabled;
    
    console.log(`Toggling online registration for event ${eventId} to ${enabled}`);
    
    Event.findByIdAndUpdate(eventId, {onlineRegistrationEnabled: enabled}, {new: true}, function(err, event) {
        if(err) {
            console.error('Error updating online registration status:', err);
            return res.status(500).json({success: false, error: 'Database error'});
        }
        
        if(!event) {
            return res.status(404).json({success: false, error: 'Event not found'});
        }
        
        console.log(`Online registration ${enabled ? 'enabled' : 'disabled'} for event: ${event.eventName}`);
        res.json({success: true, enabled: event.onlineRegistrationEnabled});
    });
});

// Route to display online registration management system
router.get('/online-registration/:id', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err) {
            console.error('Error loading event for online registration:', err);
            return res.status(500).send('Error loading event');
        }
        
        if(!event) {
            return res.status(404).send('Event not found');
        }
        
        if(!event.onlineRegistrationEnabled) {
            return res.status(403).send('Online registration is not enabled for this event');
        }
        
        console.log(`Loading online registration management for event: ${event.eventName}`);
        
        // Create event folder structure if it doesn't exist
        var fs = require('fs');
        var path = require('path');
        var eventFolder = path.join(__dirname, '../public/registration/', eventId);
        
        if (!fs.existsSync(eventFolder)) {
            fs.mkdirSync(eventFolder, { recursive: true });
            fs.mkdirSync(path.join(eventFolder, 'assets'), { recursive: true });
        }
        
        res.render('event/online_registration_manager', { 
            event: event,
            eventId: eventId
        });
    });
});

// Route to display registration page designer
router.get('/online-registration/:id/design-registration', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            return res.status(404).send('Event not found');
        }
        
        res.render('event/online_registration', { 
            event: event,
            eventId: eventId,
            pageType: 'registration'
        });
    });
});

// Route to display confirmation page designer
router.get('/online-registration/:id/design-confirmation', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            return res.status(404).send('Event not found');
        }
        
        res.render('event/confirmation_page_designer', { 
            event: event,
            eventId: eventId,
            pageType: 'confirmation'
        });
    });
});

// Route to display email template designer
router.get('/online-registration/:id/design-email', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            return res.status(404).send('Event not found');
        }
        
        res.render('event/email_template_designer', { 
            event: event,
            eventId: eventId
        });
    });
});

// Route to display email configuration
// Route to save page design (registration or confirmation)

// Function to generate complete registration HTML with embedded form
function generateCompleteRegistrationHTML(designData, event, eventId) {
    // Get form fields in the correct order based on event configuration
    var fieldDefinitions = [
        {name: 'uniqueId', label: event.uniqueId_label || 'Unique ID', type: 'text'},
        {name: 'title', label: event.title_label || 'Title', type: 'titles'},
        {name: 'firstName', label: event.firstName_label || 'First Name', type: 'text'},
        {name: 'middleName', label: event.middleName_label || 'Middle Name', type: 'text'},
        {name: 'lastName', label: event.lastName_label || 'Last Name', type: 'text'},
        {name: 'fullName', label: event.fullName_label || 'Full Name', type: 'text'},
        {name: 'jobTitle', label: event.jobTitle_label || 'Job Title', type: 'text'},
        {name: 'department', label: event.department_label || 'Department', type: 'text'},
        {name: 'companyName', label: event.companyName_label || 'Company Name', type: 'text'},
        {name: 'mobile1', label: event.mobile1_label || 'Mobile 1', type: 'tel'},
        {name: 'mobile2', label: event.mobile2_label || 'Mobile 2', type: 'tel'},
        {name: 'tel1', label: event.tel1_label || 'Phone 1', type: 'tel'},
        {name: 'tel2', label: event.tel2_label || 'Phone 2', type: 'tel'},
        {name: 'fax', label: event.fax_label || 'Fax', type: 'text'},
        {name: 'email', label: event.email_label || 'Email', type: 'email'},
        {name: 'website', label: event.website_label || 'Website', type: 'url'},
        {name: 'address1', label: event.address1_label || 'Address 1', type: 'text'},
        {name: 'address2', label: event.address2_label || 'Address 2', type: 'text'},
        {name: 'city', label: event.city_label || 'City', type: 'text'},
        {name: 'country', label: event.country_label || 'Country', type: 'countries'},
        {name: 'badgeCategory', label: event.badgeCategory_label || 'Badge Category', type: 'badgeCategories'}
    ];
    
    // Filter fields that should be shown in online registration
    var visibleFields = [];
    fieldDefinitions.forEach(function(fieldDef) {
        var showInOnlineRegistration = event[fieldDef.name + '_showInOnlineRegistration'];
        if(showInOnlineRegistration) {
            visibleFields.push(fieldDef);
        }
    });
    
    // Apply saved field order if available
    if(event.fieldsOrder && Array.isArray(event.fieldsOrder)) {
        var orderedFields = [];
        event.fieldsOrder.forEach(function(orderItem) {
            var field = visibleFields.find(f => f.name === orderItem.fieldName);
            if(field) {
                orderedFields.push(field);
            }
        });
        // Add any remaining fields that weren't in the order
        visibleFields.forEach(function(field) {
            if(!orderedFields.find(f => f.name === field.name)) {
                orderedFields.push(field);
            }
        });
        visibleFields = orderedFields;
    }
    
    // Generate form fields HTML using the same pattern as the designer template
    var formFieldsHtml = '';
    visibleFields.forEach(function(fieldDef, index) {
        var isMandatory = event[fieldDef.name + '_isMandatory'];
        var requiredAttr = isMandatory ? 'required' : '';
        var fieldHtml = '';
        
        // Generate field HTML based on type
        switch(fieldDef.type) {
            case 'text':
            case 'tel':
            case 'email':
            case 'url':
                fieldHtml = '<input type="' + fieldDef.type + '" name="' + fieldDef.name + '" ' + requiredAttr + '>';
                break;
            case 'titles':
                fieldHtml = '<select name="' + fieldDef.name + '" ' + requiredAttr + '>' +
                    '<option value="">Select Title</option>' +
                    '<option value="Mr">Mr</option>' +
                    '<option value="Mrs">Mrs</option>' +
                    '<option value="Ms">Ms</option>' +
                    '<option value="Dr">Dr</option>' +
                    '<option value="Prof">Prof</option>' +
                    '</select>';
                break;
            case 'countries':
                fieldHtml = '<select name="' + fieldDef.name + '" ' + requiredAttr + '>' +
                    '<option value="">Select Country</option>' +
                    '<option value="UAE">UAE</option>' +
                    '<option value="USA">USA</option>' +
                    '<option value="UK">UK</option>' +
                    '</select>';
                break;
            case 'badgeCategories':
                fieldHtml = '<select name="' + fieldDef.name + '" ' + requiredAttr + '>' +
                    '<option value="">Select Badge Category</option>' +
                    '<option value="VIP">VIP</option>' +
                    '<option value="Regular">Regular</option>' +
                    '<option value="Student">Student</option>' +
                    '</select>';
                break;
            default:
                fieldHtml = '<input type="text" name="' + fieldDef.name + '" ' + requiredAttr + '>';
        }
        
        formFieldsHtml += '<div class="form-field" data-field-name="' + fieldDef.name + '">' +
            '<label>' + fieldDef.label + (isMandatory ? ' <span class="required">*</span>' : '') + '</label>' +
            fieldHtml +
            '</div>';
    });
    
    // Extract custom content from the design data
    var eventTitle = (designData && designData.content && designData.content.eventTitle) || event.eventName || 'Sample Event Name';
    var eventHeader = (designData && designData.content && designData.content.eventHeader) || 'Welcome to Our Event Registration';
    var eventFooter = (designData && designData.content && designData.content.eventFooter) || 'Thank you for registering!';
    var logoUrl = (designData && designData.header && designData.header.logo) || 'https://via.placeholder.com/150x60?text=Event+Logo';
    var backgroundImage = (designData && designData.background) || '';
    var logoAlignment = (designData && designData.header && designData.header.logoAlignment) || 'center';
    var headerExists = (designData && designData.header && designData.header.exists) || false;
    var footerExists = (designData && designData.footer && designData.footer.exists) || false;
    
    // Create background style
    var backgroundStyle = '';
    if(backgroundImage) {
        backgroundStyle = 'background-image: url(' + backgroundImage + '); background-size: cover; background-position: center; background-repeat: no-repeat;';
    }
    
    // Create the complete HTML structure matching the editor layout
    return '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <title>' + eventTitle + ' - Registration</title>' +
'  <style>' +
'    body { margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; }' +
'    .page-wrapper { display: flex; flex-direction: column; height: 100vh; margin: 0; }' +
'    header, footer { background: #fff; flex-shrink: 0; border: 1px solid #ccc; display: flex; align-items: center; justify-content: ' + logoAlignment + '; padding: 0 20px; }' +
'    header { height: 15%; ' + (headerExists ? '' : 'display: none;') + ' }' +
'    header img { max-height: 80%; max-width: 90%; object-fit: contain; }' +
'    footer { height: 15%; font-size: 1rem; font-weight: 500; color: #333; ' + (footerExists ? '' : 'display: none;') + ' }' +
'    .canvas-container { flex: 1; padding: 20px; background-color: #fff; ' + backgroundStyle + ' overflow-y: auto; transition: all 0.3s ease; }' +
'    .registration-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }' +
'    .registration-card { background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18); padding: 48px 36px 36px 36px; max-width: 440px; width: 100%; border: 1.5px solid #e0e0e0; }' +
'    .event-title { font-size: 1.45rem; font-weight: 700; margin-bottom: 18px; text-align: center; color: #222; }' +
'    .event-header { font-size: 1.1rem; font-weight: 500; text-align: center; margin-bottom: 18px; color: #333; }' +
'    .registration-form label { font-weight: 500; margin-bottom: 4px; color: #222; display: block; }' +
'    .registration-form input, .registration-form select { width: 100%; padding: 13px 14px; border: 1.5px solid #cfd8dc; border-radius: 7px; margin-bottom: 20px; font-size: 1.07rem; background: #f7fafd; transition: border 0.2s; }' +
'    .registration-form input:focus, .registration-form select:focus { border: 1.5px solid #0a1931; outline: none; }' +
'    .registration-form input[type="submit"] { background: #0a1931; color: #fff; border: none; border-radius: 7px; font-size: 1.13rem; font-weight: 700; padding: 14px 0; margin-top: 10px; cursor: pointer; }' +
'    .registration-form input[type="submit"]:hover { background: #1a2951; }' +
'    .required { color: #d32f2f; margin-left: 2px; }' +
'    .form-note { font-size: 0.97em; color: #888; margin-bottom: 12px; text-align: left; }' +
'    .event-footer { font-size: 1rem; text-align: center; margin-top: 22px; color: #666; }' +
'    @media (max-width: 600px) { .registration-card { padding: 24px 8px 18px 8px; max-width: 98vw; } }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="page-wrapper">' +
(headerExists ? '    <header><img src="' + logoUrl + '" alt="Event Logo"></header>' : '') +
'    <div class="canvas-container">' +
'      <div class="registration-container">' +
'        <div class="registration-card">' +
'          <div class="event-title">' + eventTitle + '</div>' +
'          <div class="event-header">' + eventHeader + '</div>' +
'          <form class="registration-form" action="/event/' + eventId + '/public-register" method="POST">' +
            formFieldsHtml +
'            <div class="form-note">Please provide the correct email address you would like to receive your confirmation email.</div>' +
'            <input type="submit" value="REGISTER">' +
'          </form>' +
'          <div class="event-footer">' + eventFooter + '</div>' +
'        </div>' +
'      </div>' +
'    </div>' +
(footerExists ? '    <footer>' + (designData && designData.footer && designData.footer.content ? designData.footer.content : 'Footer Text') + '</footer>' : '') +
'  </div>' +
'</body>' +
'</html';
'    .page-wrapper { display: flex; flex-direction: column; margin: 20px; border: 2px solid #aaa; transition: all 0.3s ease; }' +
'    .canvas-container { flex: 1; padding: 20px; min-height: 400px; background-size: cover; background-position: center; background-repeat: no-repeat; background-color: #ffffff; transition: all 0.3s ease; ' + backgroundStyle + ' }' +
'    .canvas-content { padding: 20px; color: #000; }' +
'    .registration-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }' +
'    .registration-card { background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18); padding: 48px 36px 36px 36px; max-width: 440px; width: 100%; border: 1.5px solid #e0e0e0; }' +
'    .event-logo { max-width: 110px; margin: 0 auto 18px auto; display: block; }' +
'    .event-title { font-size: 1.45rem; font-weight: 700; margin-bottom: 18px; text-align: center; color: #222; }' +
'    .event-header { font-size: 1.1rem; font-weight: 500; text-align: center; margin-bottom: 18px; color: #333; }' +
'    .registration-form label { font-weight: 500; margin-bottom: 4px; color: #222; display: block; }' +
'    .registration-form input, .registration-form select { width: 100%; padding: 13px 14px; border: 1.5px solid #cfd8dc; border-radius: 7px; margin-bottom: 20px; font-size: 1.07rem; background: #f7fafd; transition: border 0.2s; box-sizing: border-box; }' +
'    .registration-form input:focus, .registration-form select:focus { border: 1.5px solid #0a1931; outline: none; }' +
'    .registration-form input[type="submit"] { background: #0a1931; color: #fff; border: none; border-radius: 7px; font-size: 1.13rem; font-weight: 700; padding: 14px 0; margin-top: 10px; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(10, 25, 49, 0.08); transition: background 0.2s; cursor: pointer; }' +
'    .registration-form input[type="submit"]:hover { background: #1a2951; }' +
'    .registration-form .required { color: #d32f2f; margin-left: 2px; }' +
'    .registration-form .form-note { font-size: 0.97em; color: #888; margin-bottom: 12px; text-align: left; }' +
'    .event-footer { font-size: 1rem; text-align: center; margin-top: 22px; color: #666; }' +
'    .form-field { position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }' +
'    @media (max-width: 600px) { .registration-card { padding: 24px 8px 18px 8px; max-width: 98vw; } }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="page-wrapper">' +
'    <div class="canvas-container">' +
'      <div class="canvas-content">' +
'        <div class="registration-container">' +
'          <div class="registration-card">' +
'            <img src="' + logoUrl + '" class="event-logo" alt="Event Logo">' +
'            <div class="event-title">' + eventTitle + '</div>' +
'            <div class="event-header">' + eventHeader + '</div>' +
'            <form class="registration-form" action="/event/' + eventId + '/public-register" method="POST">' +
              formFieldsHtml +
'              <div class="form-note">Please provide the correct email address you would like to receive your confirmation email.</div>' +
'              <input type="submit" value="REGISTER">' +
'            </form>' +
'            <div class="event-footer">' + eventFooter + '</div>' +
'          </div>' +
'        </div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';
}

router.post('/online-registration/:id/save-design', formidable(), function(req, res) {
    var Event = require('../models/event');
    var fs = require('fs');
    var path = require('path');
    var eventId = req.params.id;
    var pageType = req.body.pageType || 'registration';
    
    console.log('Saving design for event:', eventId, 'Page type:', pageType);
    console.log('Request body keys:', Object.keys(req.body));
    
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            console.error('Error finding event:', err);
            return res.status(404).json({success: false, message: 'Event not found'});
        }
        
        // Create event-specific folder structure
        var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
        
        // Create directories if they don't exist
        if (!fs.existsSync(eventFolder)) {
            fs.mkdirSync(eventFolder, { recursive: true });
            console.log('Created event folder:', eventFolder);
        }
        
        try {
            // Handle image saving function
            function saveBase64Image(dataUrl, filename) {
                if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
                
                var matches = dataUrl.match(/data:image\/([a-zA-Z]*);base64,([^\"]*)/);
                if (!matches) return null;
                
                var ext = matches[1];
                var data = matches[2];
                var fullFilename = filename + '.' + ext;
                var filePath = path.join(eventFolder, fullFilename);
                
                fs.writeFileSync(filePath, data, 'base64');
                console.log('Saved image:', fullFilename);
                return `/event-designs/${eventId}/${fullFilename}`;
            }
            
            // Create design data object
            var designData = {
                header: {
                    exists: (req.fields.headerExists === 'true' || req.fields.headerExists === true),
                    logoAlignment: req.fields.logoAlignment || 'center',
                    logo: null
                },
                footer: {
                    exists: (req.fields.footerExists === 'true' || req.fields.footerExists === true),
                    content: req.fields.footerContent || ''
                },
                background: null,
                content: {
                    eventTitle: req.fields.eventTitle || event.eventName || 'Sample Event',
                    eventHeader: req.fields.eventHeader || 'Welcome to Our Event Registration',
                    eventFooter: req.fields.eventFooter || 'Thank you for registering!'
                },
                savedAt: new Date().toISOString()
            };
            
            // Save header logo if provided
            if (req.fields.logoUrl && req.fields.logoUrl.startsWith('data:')) {
                designData.header.logo = saveBase64Image(req.fields.logoUrl, 'header-logo');
            }
            
            // Save background image if provided
            if (req.fields.backgroundImage && req.fields.backgroundImage.startsWith('data:')) {
                designData.background = saveBase64Image(req.fields.backgroundImage, 'background');
            }
            
            // Save design.json file
            var designJsonPath = path.join(eventFolder, 'design.json');
            fs.writeFileSync(designJsonPath, JSON.stringify(designData, null, 2));
            console.log('✅ Saved design.json to:', designJsonPath);

            // Generate complete registration HTML file
            var completeRegistrationHtml = generateCompleteRegistrationHTML(designData, event, eventId);
            var registrationHtmlPath = path.join(eventFolder, 'registration.html');
            fs.writeFileSync(registrationHtmlPath, completeRegistrationHtml);
            console.log('✅ Saved registration.html to:', registrationHtmlPath);

            // Update database with basic info
            var updateData = {
                customEventTitle: designData.content.eventTitle,
                customEventHeader: designData.content.eventHeader,
                customEventFooter: designData.content.eventFooter,
                customLogoUrl: designData.header.logo,
                customBackground: designData.background,
                canvasHtml: req.fields.canvasHtml
            };

            Event.findByIdAndUpdate(eventId, updateData, {new: true}, function(err, updatedEvent) {
                if(err) {
                    console.error('Error updating event in database:', err);
                    return res.status(500).json({success: false, message: 'Error saving to database'});
                }
                
                console.log('✅ Design saved successfully for event:', eventId);
                res.json({
                    success: true, 
                    message: 'Design saved successfully!',
                    publicUrl: `/event/public-registration/${eventId}`,
                    designData: designData
                });
            });
            
        } catch (error) {
            console.error('Error saving design:', error);
            res.status(500).json({success: false, message: 'Error saving design: ' + error.message});
        }
    });
});
// Route to save email template
router.post('/online-registration/:id/save-email-template', function(req, res) {
    var Event = require('../models/event');
    var fs = require('fs');
    var path = require('path');
    var eventId = req.params.id;
    
    console.log('Saving email template for event:', eventId);
    
    // Create event-specific folder structure
    var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
    
    // Create directories if they don't exist
    if (!fs.existsSync(eventFolder)) {
        fs.mkdirSync(eventFolder, { recursive: true });
    }
    
    // Prepare email template data
    var emailTemplate = {
        emailSubject: req.body.emailSubject,
        emailHeader: req.body.emailHeader,
        emailGreeting: req.body.emailGreeting,
        emailFooter: req.body.emailFooter,
        primaryColor: req.body.primaryColor,
        backgroundColor: req.body.backgroundColor,
        htmlTemplate: req.body.htmlTemplate
    };
    
    // Save email template to file
    var templatePath = path.join(eventFolder, 'email-template.json');
    fs.writeFileSync(templatePath, JSON.stringify(emailTemplate, null, 2));
    
    // Update event in database
    Event.findByIdAndUpdate(eventId, {
        emailTemplate: emailTemplate
    }, {new: true}, function(err, event) {
        if(err) {
            console.error('Error saving email template to database:', err);
            return res.status(500).json({success: false, message: 'Error saving email template'});
        }
        
        console.log('✅ Email template saved successfully for event:', eventId);
        res.json({success: true, message: 'Email template saved successfully!'});
    });
});

// Route to get email template
router.get('/online-registration/:id/get-email-template', function(req, res) {
    var Event = require('../models/event');
    var fs = require('fs');
    var path = require('path');
    var eventId = req.params.id;
    
    // Try to load from file first, then from database
    var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
    var templatePath = path.join(eventFolder, 'email-template.json');
    
    if (fs.existsSync(templatePath)) {
        try {
            var templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
            return res.json({success: true, template: templateData});
        } catch (error) {
            console.warn('Error reading email template file:', error);
        }
    }
    
    // Fallback to database
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            return res.json({success: false, message: 'Event not found'});
        }
        
        res.json({
            success: true, 
            template: event.emailTemplate || {}
        });
    });
});

// Route to send test email
router.post('/online-registration/:id/send-test-email', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    var testEmail = req.body.testEmail;
    
    if (!testEmail || !testEmail.includes('@')) {
        return res.status(400).json({success: false, message: 'Valid email address required'});
    }
    
    if (!transporter) {
        return res.status(500).json({success: false, message: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.'});
    }
    
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            return res.status(404).json({success: false, message: 'Event not found'});
        }
        
        // Get email template
        var fs = require('fs');
        var path = require('path');
        var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
        var templatePath = path.join(eventFolder, 'email-template.json');
        
        var emailTemplate = {};
        if (fs.existsSync(templatePath)) {
            try {
                emailTemplate = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
            } catch (error) {
                emailTemplate = event.emailTemplate || {};
            }
        } else {
            emailTemplate = event.emailTemplate || {};
        }
        
        // Generate test email HTML with sample data
        var testHTML = (emailTemplate.htmlTemplate || generateDefaultEmailHTML())
            .replace(/\{\{fullName\}\}/g, 'John Doe')
            .replace(/\{\{firstName\}\}/g, 'John')
            .replace(/\{\{lastName\}\}/g, 'Doe')
            .replace(/\{\{email\}\}/g, testEmail)
            .replace(/\{\{eventName\}\}/g, event.eventName)
            .replace(/\{\{registrationId\}\}/g, '12345')
            .replace(/\{\{companyName\}\}/g, 'Test Company')
            .replace(/\{\{badgeCategory\}\}/g, 'VIP')
            .replace(/\{\{registrationDate\}\}/g, new Date().toLocaleDateString())
            .replace(/\{\{confirmationUrl\}\}/g, `${req.protocol}://${req.get('host')}/event/public-registration/${eventId}/confirmation?reg=12345`);
        
        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: testEmail,
            subject: (emailTemplate.emailSubject || 'Registration Confirmation - {{eventName}}').replace(/\{\{eventName\}\}/g, event.eventName),
            html: testHTML
        };
        
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.error('❌ Error sending test email:', error);
                res.status(500).json({success: false, message: 'Error sending test email: ' + error.message});
            } else {
                console.log('✅ Test email sent successfully:', info.response);
                res.json({success: true, message: 'Test email sent successfully!'});
            }
        });
    });
});


function generateDefaultEmailHTML() {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 28px;">Registration Confirmed!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="color: #333; line-height: 1.6; font-size: 16px;">
                Dear {{fullName}},<br><br>
                Thank you for registering for {{eventName}}. Your registration has been successfully submitted.
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Registration Details:</h3>
                <p><strong>Registration ID:</strong> REG-{{registrationId}}</p>
                <p><strong>Event:</strong> {{eventName}}</p>
                <p><strong>Name:</strong> {{fullName}}</p>
                <p><strong>Email:</strong> {{email}}</p>
                <p><strong>Company:</strong> {{companyName}}</p>
                <p><strong>Badge Type:</strong> {{badgeCategory}}</p>
                <p><strong>Registration Date:</strong> {{registrationDate}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{confirmationUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    View Confirmation Page
                </a>
            </div>
            
            <div style="color: #333; line-height: 1.6; font-size: 16px;">
                Please keep this email for your records. We look forward to seeing you at the event!
            </div>
        </div>
        
        <div style="text-align: center; padding: 20px 0;">
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>`;
}

// Route to generate public registration link
router.post('/online-registration/:id/generate-link', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    
    Event.findByIdAndUpdate(eventId, {
        registrationLinkGenerated: true,
        registrationLinkCreatedAt: new Date()
    }, {new: true}, function(err, event) {
        if(err || !event) {
            return res.status(404).json({success: false, error: 'Event not found'});
        }
        
        var publicUrl = `${req.protocol}://${req.get('host')}/register/${eventId}`;
        
        res.json({
            success: true, 
            publicUrl: publicUrl,
            message: 'Public registration link generated successfully!'
        });
    });
});

// Public registration route (for end users)
// Direct access route for public registration (without /event prefix in URL)
router.get('/register/:id', function(req, res) {
    var eventId = req.params.id;
    console.log('🔗 Direct public registration access for event:', eventId);
    
    // Redirect to the full public registration route  
    res.redirect(`/event/public-registration/${eventId}`);
});

// Route to display registration form with fields based on showInOnlineRegistration
router.get('/registration-form/:id', function(req, res) {
    var Event = require('../models/event');
    var BadgeCategory = require('../models/badge-category');
    var Country = require('../models/country');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err) {
            console.error('Error loading event for registration form:', err);
            return res.status(500).send('Error loading event');
        }
        
        if(!event) {
            return res.status(404).send('Event not found');
        }
        
        if(!event.onlineRegistrationEnabled) {
            return res.status(403).send('Online registration is not enabled for this event');
        }
        
                console.log(`Loading registration form for event: ${event.eventName}`);
                
                // Load badge categories and countries for dropdowns
                BadgeCategory.find({isActive: true}).exec(function(err, badgeCategories) {
                    if(err) badgeCategories = [];
                    
                    Country.find({isActive: true}).exec(function(err, countries) {
                        if(err) countries = [];
                        
                        // Build fields array based on showInOnlineRegistration flag
                        var fields = [];
                        
                        // Define all available fields with their properties
                        var fieldDefinitions = [
                            {name: 'uniqueId', label: event.uniqueId_label, type: 'text'},
                            {name: 'barcode', label: event.barcode_label, type: 'text'},
                            {name: 'qrCode', label: event.qrCode_label, type: 'text'},
                            {name: 'uploadImage', label: event.uploadImage_label, type: 'file'},
                            {name: 'uploadLogo', label: event.uploadLogo_label, type: 'file'},
                            {name: 'sno', label: event.sno_label, type: 'text'},
                            {name: 'title', label: event.title_label, type: 'titles'},
                            {name: 'firstName', label: event.firstName_label, type: 'text'},
                            {name: 'middleName', label: event.middleName_label, type: 'text'},
                            {name: 'lastName', label: event.lastName_label, type: 'text'},
                            {name: 'fullName', label: event.fullName_label, type: 'text'},
                            {name: 'jobTitle', label: event.jobTitle_label, type: 'text'},
                            {name: 'department', label: event.department_label, type: 'text'},
                            {name: 'companyName', label: event.companyName_label, type: 'text'},
                            {name: 'mobile1', label: event.mobile1_label, type: 'tel'},
                            {name: 'mobile2', label: event.mobile2_label, type: 'tel'},
                            {name: 'tel1', label: event.tel1_label, type: 'tel'},
                            {name: 'tel2', label: event.tel2_label, type: 'tel'},
                            {name: 'fax', label: event.fax_label, type: 'text'},
                            {name: 'email', label: event.email_label, type: 'email'},
                            {name: 'website', label: event.website_label, type: 'url'},
                            {name: 'address1', label: event.address1_label, type: 'text'},
                            {name: 'address2', label: event.address2_label, type: 'text'},
                            {name: 'city', label: event.city_label, type: 'text'},
                            {name: 'country', label: event.country_label, type: 'countries'},
                            {name: 'poBox', label: event.poBox_label, type: 'text'},
                            {name: 'postalCode', label: event.postalCode_label, type: 'text'},
                            {name: 'badgeCategory', label: event.badgeCategory_label, type: 'badgeCategories'},
                            {name: 'regType', label: event.regType_label, type: 'list'},
                            {name: 'regDate', label: event.regDate_label, type: 'date'},
                            {name: 'comment1', label: event.comment1_label, type: 'text'},
                            {name: 'comment2', label: event.comment2_label, type: 'text'},
                            {name: 'comment3', label: event.comment3_label, type: 'text'},
                            {name: 'comment4', label: event.comment4_label, type: 'text'},
                            {name: 'comment5', label: event.comment5_label, type: 'text'},
                            {name: 'comment6', label: event.comment6_label, type: 'text'},
                            {name: 'comment7', label: event.comment7_label, type: 'text'},
                            {name: 'comment8', label: event.comment8_label, type: 'text'},
                            {name: 'comment9', label: event.comment9_label, type: 'text'},
                            {name: 'comment10', label: event.comment10_label, type: 'text'}
                        ];
                        
                        // Filter fields based on showInOnlineRegistration flag
                        fieldDefinitions.forEach(function(fieldDef) {
                            var showInOnlineRegistration = event[fieldDef.name + '_showInOnlineRegistration'];
                            var isMandatory = event[fieldDef.name + '_isMandatory'];
                            
                            console.log(`Field ${fieldDef.name}: showInOnlineRegistration = ${showInOnlineRegistration}`);
                            
                            if(showInOnlineRegistration) {
                                fields.push({
                                    fieldName: fieldDef.name,
                                    fieldLabel: fieldDef.label,
                                    fieldType: fieldDef.type,
                                    fieldMandatory: isMandatory,
                                    fieldValue: ''
                                });
                                console.log(`✅ Added field ${fieldDef.name} to registration form`);
                            }
                        });                console.log(`Generated ${fields.length} fields for registration form`);
                
                res.render('event/online_registration', { 
                    event: event,
                    eventId: eventId,
                    fields: fields,
                    badgeCategories: badgeCategories,
                    countries: countries
                });
            });
        });
    });
});

// Save canvas HTML route
router.post('/:id/save-canvas', function(req, res) {
    var Event = require('../models/event');
    var eventId = req.params.id;
    var canvasHtml = req.body.canvasHtml;
    
    console.log('Saving canvas HTML for event:', eventId);
    
    Event.findByIdAndUpdate(eventId, {
        canvasHtml: canvasHtml,
        fieldsOrder: req.body.fieldsOrder || null,
        customBackground: req.body.customBackground || null,
        customEventTitle: req.body.eventTitle || null,
        customEventHeader: req.body.eventHeader || null,
        customEventFooter: req.body.eventFooter || null,
        customLogoUrl: req.body.logoUrl || null
    }, {new: true}, function(err, event) {
        if(err) {
            console.error('Error saving canvas HTML:', err);
            return res.status(500).json({success: false, message: 'Error saving canvas'});
        }
        
        console.log('Canvas HTML saved successfully');
        res.json({
            success: true, 
            message: 'Canvas saved successfully',
            publicUrl: `/event/public-registration/${eventId}`
        });
    });
});

// Public registration route (no authentication required)
router.get('/public-registration/:id', function(req, res) {
    var Event = require('../models/event');
    var BadgeCategory = require('../models/badge-category');
    var Country = require('../models/country');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err) {
            console.error('Error loading event for public registration:', err);
            return res.status(500).send('Error loading event');
        }
        
        if(!event) {
            return res.status(404).send('Event not found');
        }
        
        if(!event.onlineRegistrationEnabled) {
            return res.render('event/registration-disabled', { 
                event: event,
                message: 'Online registration is currently not available for this event.'
            });
        }
        
        console.log('Loading public registration for event:', event.eventName);
        
        // Load countries and badge categories
        BadgeCategory.find({event: eventId, isActive: true}).exec(function(err, badgeCategories) {
            if(err) badgeCategories = [];
            
            Country.find({isActive: true}).exec(function(err, countries) {
                if(err) countries = [];
                
                // Build fields array based on showInOnlineRegistration flag
                var fields = [];
                
                // Define all available fields with their properties
                var fieldDefinitions = [
                    {name: 'uniqueId', label: event.uniqueId_label, type: 'text'},
                    {name: 'title', label: event.title_label, type: 'titles'},
                    {name: 'firstName', label: event.firstName_label, type: 'text'},
                    {name: 'middleName', label: event.middleName_label, type: 'text'},
                    {name: 'lastName', label: event.lastName_label, type: 'text'},
                    {name: 'fullName', label: event.fullName_label, type: 'text'},
                    {name: 'jobTitle', label: event.jobTitle_label, type: 'text'},
                    {name: 'department', label: event.department_label, type: 'text'},
                    {name: 'companyName', label: event.companyName_label, type: 'text'},
                    {name: 'mobile1', label: event.mobile1_label, type: 'tel'},
                    {name: 'mobile2', label: event.mobile2_label, type: 'tel'},
                    {name: 'tel1', label: event.tel1_label, type: 'tel'},
                    {name: 'tel2', label: event.tel2_label, type: 'tel'},
                    {name: 'fax', label: event.fax_label, type: 'text'},
                    {name: 'email', label: event.email_label, type: 'email'},
                    {name: 'website', label: event.website_label, type: 'url'},
                    {name: 'address1', label: event.address1_label, type: 'text'},
                    {name: 'address2', label: event.address2_label, type: 'text'},
                    {name: 'city', label: event.city_label, type: 'text'},
                    {name: 'country', label: event.country_label, type: 'countries'},
                    {name: 'badgeCategory', label: event.badgeCategory_label, type: 'badgeCategories'}
                ];
                
                // Only show fields marked for online registration
                fieldDefinitions.forEach(function(fieldDef) {
                    var showInOnlineRegistration = event[fieldDef.name + '_showInOnlineRegistration'];
                    var isMandatory = event[fieldDef.name + '_isMandatory'];
                    if(showInOnlineRegistration) {
                        fields.push({
                            fieldName: fieldDef.name,
                            fieldLabel: fieldDef.label,
                            fieldType: fieldDef.type,
                            fieldMandatory: isMandatory,
                            fieldValue: ''
                        });
                    }
                });
                console.log(`✅ Generated ${fields.length} fields for public registration (filtered)`);
                
                // Render the public registration template
                // Read design.json and pass its values to the template
                var fs = require('fs');
                var path = require('path');
                var designPath = path.join(__dirname, '../public/event-designs/', eventId, 'design.json');
                var designData = {};
                if (fs.existsSync(designPath)) {
                    try {
                        designData = JSON.parse(fs.readFileSync(designPath, 'utf8'));
                    } catch (err) {
                        console.warn('Could not parse design.json:', err.message);
                    }
                }

                res.render('event/public-registration', {
                    event: event,
                    fields: fields,
                    badgeCategories: badgeCategories,
                    countries: countries,
                    eventId: eventId,
                    logoUrl: designData.header && designData.header.logo ? designData.header.logo : '',
                    customBackground: designData.background || '',
                    eventTitle: designData.content && designData.content.eventTitle ? designData.content.eventTitle : event.eventName,
                    eventHeader: designData.content && designData.content.eventHeader ? designData.content.eventHeader : '',
                    eventFooter: designData.content && designData.content.eventFooter ? designData.content.eventFooter : ''
                });
            });
        });
    });
});
                
                // ...existing code...

// Handle public registration form submission
router.post('/:id/public-register', function(req, res) {
                // eventObjId is not defined yet; move this log after assignment
    console.log('🔔 [DEBUG] Registration route called for event:', eventId);
    var formidable = require('formidable');
    var IncomingForm = formidable.IncomingForm;
    var form = new IncomingForm();
    var Event = require('../models/event');
    var EventData = require('../models/event-data');
    var Sequence = require('../models/sequence');
    var eventId = req.params.id;
    console.log('Processing public registration for event:', eventId);
    form.parse(req, function(err, fields, files) {
        if (err) {
            console.error('Error parsing form data:', err);
            return res.status(400).json({success: false, message: 'Error parsing form data'});
        }
        Event.findById(eventId).exec(function(err, event) {
            var isAjaxRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
            if (err) {
                console.error('Error loading event for registration:', err);
                if (isAjaxRequest) {
                    return res.status(500).json({success: false, message: 'Error processing registration'});
                } else {
                    return res.status(500).send('Error processing registration');
                }
            }
            if (!event) {
                if (isAjaxRequest) {
                    return res.status(404).json({success: false, message: 'Event not found'});
                } else {
                    return res.status(404).send('Event not found');
                }
            }
            if (!event.onlineRegistrationEnabled) {
                if (isAjaxRequest) {
                    return res.status(403).json({success: false, message: 'Online registration is not enabled for this event'});
                } else {
                    return res.status(403).send('Online registration is not enabled for this event');
                }
            }
            // Validate email before proceeding
            if (!fields.email || fields.email.trim() === '') {
                if (isAjaxRequest) {
                    return res.status(400).json({ success: false, message: 'Email is required for registration.' });
                } else {
                    return res.status(400).send('Email is required for registration.');
                }
            }
            // Handle file uploads (save file names)
            var uploadImageFile = files.uploadImage ? files.uploadImage.name : '';
            var uploadLogoFile = files.uploadLogo ? files.uploadLogo.name : '';
            // Generate unique registration ID
            Sequence.findOneAndUpdate(
                {name: 'registration'},
                {$inc: {value: 1}},
                {new: true, upsert: true}
            ).exec(function(err, sequence) {
                if (err) {
                    console.error('Error generating sequence:', err);
                    if (isAjaxRequest) {
                        return res.status(500).json({success: false, message: 'Error processing registration'});
                    } else {
                        return res.status(500).send('Error processing registration');
                    }
                }
                var registrationId = sequence.value;
                // Create new registration record
                var mongoose = require('mongoose');
                let eventFieldToSave;
                if (mongoose.Types.ObjectId.isValid(eventId)) {
                    eventFieldToSave = mongoose.Types.ObjectId(eventId);
                } else {
                    eventFieldToSave = eventId;
                    console.warn('⚠️ Saving eventId as string, not ObjectId:', eventId);
                }
                console.log('🟡 [DEBUG] About to save registration with eventId:', eventId, 'eventFieldToSave:', eventFieldToSave);
                console.log('🟡 [DEBUG] Incoming registration fields:', fields);
                var eventData = new EventData({
                    event: eventFieldToSave,
                    registrationId: registrationId,
                    uniqueId: fields.uniqueId || '',
                    title: fields.title || '',
                    firstName: fields.firstName || '',
                    middleName: fields.middleName || '',
                    lastName: fields.lastName || '',
                    fullName: fields.fullName || '',
                    jobTitle: fields.jobTitle || '',
                    department: fields.department || '',
                    companyName: fields.companyName || '',
                    mobile1: fields.mobile1 || '',
                    mobile2: fields.mobile2 || '',
                    tel1: fields.tel1 || '',
                    tel2: fields.tel2 || '',
                    fax: fields.fax || '',
                    email: fields.email || '',
                    website: fields.website || '',
                    address1: fields.address1 || '',
                    address2: fields.address2 || '',
                    city: fields.city || '',
                    country: fields.country || '',
                    badgeCategory: fields.badgeCategory || '',
                    uploadImage: uploadImageFile,
                    uploadLogo: uploadLogoFile,
                    regType: 'Online',
                    regDate: new Date(),
                    status: 'Registered',
                    isPrinted: false,
                    isCheckedIn: false,
                    checkedInAt: null
                });
                eventData.save(function(err, savedData) {
                    console.log('🔔 [DEBUG] Registration saved:', {
                        _id: savedData._id,
                        registrationId: registrationId,
                        eventId: eventId,
                        email: savedData.email
                    });
                    if (err) {
                        console.error('❌ Error saving registration:', err);
                        if (isAjaxRequest) {
                            return res.status(500).json({success: false, message: 'Error saving registration'});
                        } else {
                            return res.status(500).send('Error saving registration');
                        }
                    }
                    console.log('✅ Registration saved successfully:', savedData._id);
                    console.log('📋 Saved registration data:', {
                        registrationId: registrationId,
                        fullName: savedData.fullName,
                        email: savedData.email,
                        eventId: eventId
                    });
                    // Send confirmation email
                    if (savedData.email && savedData.email.trim() !== '') {
                        console.log('📧 [EMAIL DEBUG] Attempting to send confirmation email to:', savedData.email);
                        if (transporter) {
                            console.log('✅ [EMAIL DEBUG] Email transporter is configured');
                            var confirmationUrl = `${req.protocol}://${req.get('host')}/event/public-registration/${eventId}/confirmation?reg=${registrationId}`;
                            console.log('🔗 [EMAIL DEBUG] Confirmation URL:', confirmationUrl);
                            // Load custom email template
                            var fs = require('fs');
                            var path = require('path');
                            var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
                            var templatePath = path.join(eventFolder, 'email-template.json');
                            var emailTemplate = {};
                            if (fs.existsSync(templatePath)) {
                                try {
                                    emailTemplate = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
                                    console.log('✅ [EMAIL DEBUG] Using custom email template for event:', eventId);
                                } catch (error) {
                                    console.warn('[EMAIL DEBUG] Error reading custom email template, using default:', error.message);
                                    emailTemplate = event.emailTemplate || {};
                                }
                            } else {
                                emailTemplate = event.emailTemplate || {};
                                console.log('[EMAIL DEBUG] No custom email template found, using default');
                            }
                            // Generate email HTML from template
                            var emailHTML = (emailTemplate.htmlTemplate || generateDefaultEmailHTML())
                                .replace(/\{\{fullName\}\}/g, savedData.fullName || (savedData.firstName + ' ' + savedData.lastName) || 'Participant')
                                .replace(/\{\{firstName\}\}/g, savedData.firstName || '')
                                .replace(/\{\{lastName\}\}/g, savedData.lastName || '')
                                .replace(/\{\{email\}\}/g, savedData.email || '')
                                .replace(/\{\{eventName\}\}/g, event.eventName || '')
                                .replace(/\{\{registrationId\}\}/g, registrationId || '')
                                .replace(/\{\{companyName\}\}/g, savedData.companyName || '')
                                .replace(/\{\{badgeCategory\}\}/g, savedData.badgeCategory || '')
                                .replace(/\{\{registrationDate\}\}/g, moment(savedData.regDate).format('MMMM DD, YYYY'))
                                .replace(/\{\{confirmationUrl\}\}/g, confirmationUrl);
                            var emailSubject = (emailTemplate.emailSubject || 'Registration Confirmation - {{eventName}}')
                                .replace(/\{\{eventName\}\}/g, event.eventName);
                            var mailOptions = {
                                from: process.env.EMAIL_USER || 'noreply@example.com',
                                to: savedData.email,
                                subject: emailSubject,
                                html: emailHTML
                            };
                            console.log('[EMAIL DEBUG] Sending email with options:', mailOptions);
                            transporter.sendMail(mailOptions, function(error, info) {
                                if (error) {
                                    console.error('❌ [EMAIL DEBUG] Error sending confirmation email:', error.message);
                                } else {
                                    console.log('✅ [EMAIL DEBUG] Confirmation email sent successfully:', info.response);
                                }
                            });
                        } else {
                            console.log('⚠️ [EMAIL DEBUG] Email transporter not configured. Skipping email sending.');
                            console.log('   To enable emails, configure EMAIL_USER and EMAIL_PASS environment variables.');
                        }
                    } else {
                        console.warn('[EMAIL DEBUG] No email address provided for registration:', registrationId);
                    }
                    // Always respond with JSON for frontend fetch
                    res.json({
                        success: true,
                        message: 'Registration completed successfully!',
                        registrationId: registrationId,
                        redirectUrl: `/event/public-registration/${eventId}/confirmation?reg=${registrationId}`
                    });
                });
            });
        });
    });
});

// Generate public URL for registration
router.post('/online-registration/:id/generate-public-url', function(req, res) {
    var eventId = req.params.id;
    var configData = req.body;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err) {
            console.error('Error loading event for URL generation:', err);
            return res.status(500).json({success: false, message: 'Error generating public URL'});
        }
        
        if(!event) {
            return res.status(404).json({success: false, message: 'Event not found'});
        }
        
        // Save the canvas configuration
        event.canvasHtml = configData.canvasHtml;
        event.customEventTitle = configData.eventTitle;
        event.customEventHeader = configData.eventHeader;
        event.customEventFooter = configData.eventFooter;
        event.customLogoUrl = configData.logoSrc;
        event.customBackground = configData.backgroundImage;
        event.fieldsOrder = configData.fieldsOrder;
        
        event.save(function(err) {
            if(err) {
                console.error('Error saving canvas configuration:', err);
                return res.status(500).json({success: false, message: 'Error saving configuration'});
            }
            
            const publicUrl = `/event/public-registration/${eventId}`;
            console.log(`Generated public URL for event ${eventId}: ${publicUrl}`);
            
            res.json({
                success: true,
                publicUrl: publicUrl,
                message: 'Public registration URL generated successfully!'
            });
        });
    });
});

// Public registration confirmation page
router.get('/public-registration/:id/confirmation', function(req, res) {
    console.log('🔔 [DEBUG] Confirmation route called for event:', eventId, 'registrationId:', registrationId);
    var eventId = req.params.id;
    var registrationId = req.query.reg;
    console.log('🔔 [DEBUG] Confirmation route called for event:', eventId, 'registrationId:', registrationId);
    
    console.log('🎉 Confirmation page requested for event:', eventId, 'registration:', registrationId);
    
    Event.findById(eventId).exec(function(err, event) {
        if(err) {
            console.error('❌ Error loading event for confirmation:', err);
            return res.status(404).send('Event not found');
        }
        
        if(!event) {
            console.warn('⚠️ Event not found:', eventId);
            return res.status(404).send('Event not found');
        }
        
        console.log('✅ Event found for confirmation:', event.eventName);
        
        // Check for saved confirmation design files
        var fs = require('fs');
        var path = require('path');
        var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
        var confirmationHtmlPath = path.join(eventFolder, 'confirmation.html');
        var savedConfirmationHtml = null;
        
        if (fs.existsSync(confirmationHtmlPath)) {
            try {
                savedConfirmationHtml = fs.readFileSync(confirmationHtmlPath, 'utf8');
                console.log('✅ Found saved confirmation design for event:', eventId);
            } catch (error) {
                console.warn('❌ Error reading saved confirmation design:', error.message);
            }
        }
        
                if(registrationId) {
                    console.log('🔍 Looking up registration:', registrationId, 'for event:', eventId);
                    var mongoose = require('mongoose');
                    let eventQuery = [];
                    // Try all combinations of event and registrationId types
                    if (mongoose.Types.ObjectId.isValid(eventId)) {
                        eventQuery.push({event: mongoose.Types.ObjectId(eventId), registrationId: registrationId});
                        eventQuery.push({event: mongoose.Types.ObjectId(eventId), registrationId: Number(registrationId)});
                        eventQuery.push({event: eventId, registrationId: registrationId});
                        eventQuery.push({event: eventId, registrationId: Number(registrationId)});
                    } else {
                        eventQuery.push({event: eventId, registrationId: registrationId});
                        eventQuery.push({event: eventId, registrationId: Number(registrationId)});
                    }
                    EventData.findOne({$or: eventQuery}).exec(function(err, registration) {
                        console.log('🔔 [DEBUG] Registration lookup result for event:', eventId, 'registrationId:', registrationId, registration);
                        if(err) {
                            console.error('❌ Error finding registration:', err);
                            return res.render('event/registration-confirmation', {
                                event: event,
                                success: false,
                                message: 'Error retrieving registration details',
                                savedConfirmationHtml: savedConfirmationHtml
                            });
                        }
                        
                        if(!registration) {
                            console.warn('⚠️ Registration not found:', registrationId);
                            return res.render('event/registration-confirmation', {
                                event: event,
                                success: false,
                                message: 'Registration not found',
                                savedConfirmationHtml: savedConfirmationHtml
                            });
                        }
                        
                        console.log('✅ Registration found:', registration.fullName || registration.firstName);
                        
                        res.render('event/registration-confirmation', {
                            event: event,
                            registration: registration,
                            success: true,
                            message: 'Your registration has been confirmed!',
                            savedConfirmationHtml: savedConfirmationHtml,
                            // Only use these fallbacks if no saved HTML exists
                            confirmationTitle: savedConfirmationHtml ? null : event.confirmationTitle,
                            confirmationMessage: savedConfirmationHtml ? null : event.confirmationMessage,
                            confirmationFooter: savedConfirmationHtml ? null : event.confirmationFooter,
                            confirmationLogoUrl: savedConfirmationHtml ? null : event.confirmationLogoUrl,
                            confirmationCustomBackground: savedConfirmationHtml ? null : event.confirmationCustomBackground
                        });
                    });
                } else {
                    console.log('ℹ️ No registration ID provided, showing general confirmation');
                    res.render('event/registration-confirmation', {
                        event: event,
                        success: true,
                        message: 'Thank you for registering!',
                        savedConfirmationHtml: savedConfirmationHtml,
                        confirmationTitle: event.confirmationTitle,
                        confirmationMessage: event.confirmationMessage,
                        confirmationFooter: event.confirmationFooter,
                        confirmationLogoUrl: event.confirmationLogoUrl,
                        confirmationCustomBackground: event.confirmationCustomBackground
                    });
                }
    });
});

// Route to test the complete workflow
router.get('/online-registration/:id/test-workflow', function(req, res) {
    var Event = require('../models/event');
    var fs = require('fs');
    var path = require('path');
    var eventId = req.params.id;
    
    Event.findById(eventId).exec(function(err, event) {
        if(err || !event) {
            return res.status(404).json({success: false, message: 'Event not found'});
        }
        
        var eventFolder = path.join(__dirname, '../public/event-designs/', eventId);
        var report = {
            eventId: eventId,
            eventName: event.eventName,
            onlineRegistrationEnabled: event.onlineRegistrationEnabled,
            folders: {
                eventFolder: fs.existsSync(eventFolder) ? 'EXISTS' : 'MISSING',
                registrationHtml: fs.existsSync(path.join(eventFolder, 'registration.html')) ? 'EXISTS' : 'MISSING',
                confirmationHtml: fs.existsSync(path.join(eventFolder, 'confirmation.html')) ? 'EXISTS' : 'MISSING',
                emailTemplate: fs.existsSync(path.join(eventFolder, 'email-template.json')) ? 'EXISTS' : 'MISSING'
            },
            database: {
                canvasHtml: event.canvasHtml ? 'EXISTS' : 'MISSING',
                confirmationCanvasHtml: event.confirmationCanvasHtml ? 'EXISTS' : 'MISSING',
                emailTemplate: event.emailTemplate ? 'EXISTS' : 'MISSING'
            },
            emailConfig: {
                transporterConfigured: transporter ? 'YES' : 'NO',
                emailUser: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
                emailPass: process.env.EMAIL_PASS ? 'SET' : 'NOT SET'
            },
            publicUrl: `${req.protocol}://${req.get('host')}/register/${eventId}`
        };
        
        res.json({success: true, workflow: report});
    });
});

// Serve static event design files
router.get('/event-designs/:eventId/*', function(req, res) {
    var path = require('path');
    var fs = require('fs');
    var eventId = req.params.eventId;
    var fileName = req.params[0]; // This captures everything after the eventId
    
    var filePath = path.join(__dirname, '../public/event-designs/', eventId, fileName);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
        res.sendFile(path.resolve(filePath));
    } else {
        console.log('Event design file not found:', filePath);
        res.status(404).send('File not found');
    }
});

module.exports = router;
