const express = require('express');
const router = express.Router();
const spawn = require('child_process').spawn;
const compressing = require('compressing');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const disk = require('diskusage');
var csrf = require('csurf');

const FileInfo = require('../models/file-info');
var Event = require('../models/event');

//const mb = 1048576.0;
const mb = 1000000.0;
//const gb = 1073741824.0;
const gb = 1000000000.0;
const backupPath = './public/backup-files/';


router.get('/', (req,res)=>{
    const messages = req.flash('error');
    const successMessage = req.flash('success');
    

    fs.readdir(backupPath, (err,files)=>{
        if(err){
            console.log(err);
            return res.render('backup/index', {messages:[err], hasErrors: true});
        }

        const filelist=[];

        for(var i=0; i<files.length; i++){
            const stats= fs.statSync(backupPath + files[i]);
            const filesize = stats.size / mb;
            const fileInfo = new FileInfo(files[i],filesize.toFixed(2), stats.mtime);
            filelist.push(fileInfo);

        }

        disk.check('/', function(err, info) {
            if (err) {
                return res.render('backup/index', {messages:[err], hasErrors: true});
            } 

            const availableSpace = info.available / gb;
            const freeSpace = info.free / gb;
            const totalSpace = info.total / gb;


            res.render('backup/index', {
                messages:messages, hasErrors: messages.length>0,
                filelist:filelist, 
                availableSpace:availableSpace.toFixed(2), 
                totalSpace:totalSpace.toFixed(2),
                successMessage:successMessage
            });

          });
    });

    

    

});

router.get('/create', (req,res)=>{
    const messages=[];
    res.render('backup/create', {messages: messages, hasErrors: messages.length>0});
});

router.post('/create', (req,res)=>{
    const messages=[];
    
    var filename=req.body.filename + '.tar';
    filename = filename.replace(/[/\\?%*:|"<>]/g, '-');


    const args = [];
    const mongodump = spawn('mongodump', args);

    mongodump.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });
    mongodump.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    mongodump.on('exit', function (code) {
        

        if(code==0){
            compressing.tar.compressDir('dump', filename)
            .then(function(){
                console.log('compression done');
                fs.rename(filename,backupPath + filename, (err)=>{
                    if(err){
                        console.log(err);
                        req.flash('error',err);
                        res.redirect('/backup');
                    }

                    req.flash('success', 'Backup created successfully');
                    res.redirect('/backup');

                });

                

            })
            .catch(function(){
                console.log('compession not done');
                req.flash('error','Error while compressing backup file');
                res.redirect('/backup');
            });
        }
        else {
            console.log('mongodump exited with code ' + code);
            req.flash('error','Error while creating backup');
            res.redirect('/backup');
        }

        
    });
});

router.get('/delete/:filename', function(req,res){
    fs.unlink(backupPath + req.params.filename, (err)=>{
        if(err){
            req.flash('error',err);
            res.redirect('/backup');
        }

        req.flash('success','Backup deleted successfully');
        res.redirect('/backup');

    });
});

router.get('/restore/:filename', function(req,res){

  
    const filename = backupPath + req.params.filename;

   
    
    compressing.tar.uncompress(filename, './')
    .then(function(){
        console.log('uncompression done');
        Event.db.db.command({dropDatabase:1}, function(err, result){
            if(err){
                req.flash('error',err);
                res.redirect('/backup');
                return;
            }
            //START mongodb restore
            const args = [];
            const mongorestore = spawn('mongorestore', args);
        
            mongorestore.stdout.on('data', function (data) {
                console.log('stdout: ' + data);
            });
            mongorestore.stderr.on('data', function (data) {
                console.log('stderr: ' + data);
            });
            mongorestore.on('exit', function (code) {
                console.log('mongorestore exited with code ' + code);
        
                if(code!=0){
                    req.flash('error','Restore failed');
                    res.redirect('/backup');
                    return;
                }
        
                req.flash('success', 'Database restored successfully');
                res.redirect('/backup');
                
            });
            //END mongodb restore
        });
        
    })
    .catch(function(){
        req.flash('error','Failed to uncompress backup file');
        res.redirect('/backup');
        return;
    });

});


router.get('/upload', function (req, res) {
    
    var messages = [];
    var scripts = [{ script: '/javascripts/file-upload.js' }];
    res.render('backup/upload', {messages: messages, scripts:scripts});
    

    
});

router.post('/upload', function(req,res){
    var messages = [];
    

    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {

        if(files.filetoupload==null || files.filetoupload.name==''){
            messages.push('Please select a file to upload');
            res.render('backup/upload', { messages: messages, hasErrors: messages.length > 0 });
            return;
        }

        const filename = files.filetoupload.name.replace(/[/\\?%*:|"<>]/g, '-');

        var oldpath = files.filetoupload.path;
        var newpath = backupPath + filename;
        console.log('oldpath', oldpath);
        console.log('newpath', newpath);
        
        compressing.tar.uncompress(oldpath, './')
        .then(function(){
            console.log('uncompression done');
            

            fs.copyFile(oldpath,newpath, (err)=>{
                if(err){
                    req.flash('error',err);
                    res.redirect('/backup');
                    return;
                }

                
    
                Event.db.db.command({dropDatabase:1}, function(err, result){
                    if(err){
                        req.flash('error',err);
                        res.redirect('/backup');
                        return;
                    }

                    
                    
                    //START mongodb restore
                    const args = [];
                    const mongorestore = spawn('mongorestore', args);
                
                    mongorestore.stdout.on('data', function (data) {
                        console.log('stdout: ' + data);
                    });
                    mongorestore.stderr.on('data', function (data) {
                        console.log('stderr: ' + data);
                    });
                    mongorestore.on('exit', function (code) {
                        console.log('mongorestore exited with code ' + code);
                
                        if(code!=0){
                            req.flash('error','Restore failed');
                            res.redirect('/backup');
                            return;
                        }
                
                        req.flash('success', 'Database restored successfully');
                        res.redirect('/backup');
                        
                    });
                    //END mongodb restore
                });

                

                

            });

            
        })
        .catch(function(){
            req.flash('error','Failed to uncompress backup file');
            res.redirect('/backup');
            return;
        });


        



    });


  
});

router.get('/import', function(req,res){
    var scripts = [{ script: '/javascripts/upload.js' }];
    var messages = [];

    res.render('backup/import', { scripts: scripts, messages: messages, hasErrors: messages.length > 0 });


});

router.post('/import', function(req,res){
    var filename='';

      var form = new formidable.IncomingForm();
      form.multiples = false;
      form.uploadDir = backupPath;
    
      form.on('file', function(field, file) {
        console.log('form.on.file');
        filename = file.name.replace(/[/\\?%*:|"<>]/g, '-');

        fs.rename(file.path, backupPath + filename);
        
      });
    
      form.on('error', function(err) {
        console.log("an error has occured with form upload");
        console.log(err);
        req.resume();
      });
    
      form.on('aborted', function(err) {
        console.log("user aborted upload");
      });

      // once all the files have been uploaded, send a response to the client
      form.on('end', function() {
        console.log('reading filename ' + filename);
        
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ result:'success' }));
      });
    
      form.parse(req, function() {
        //res.render('backup/index');
      });
    
    });

module.exports=router;