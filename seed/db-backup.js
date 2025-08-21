const spawn = require('child_process').spawn;
const compressing = require('compressing');

    var args = []
      , mongodump = spawn('mongodump', args);
    mongodump.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    mongodump.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
    mongodump.on('exit', function (code) {
      console.log('mongodump exited with code ' + code);

      
        compressing.tar.compressDir('dump', 'dump.tar')
        .then(function(){
            console.log('compression done');
        })
        .catch(function(){
            console.log('compession not done');
        });
    });
  