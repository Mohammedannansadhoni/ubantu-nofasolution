$('#fileupload').fileupload({
  dataType: 'json',
  url: '/backup/import/',
  autoUpload: true,
  add: function (e, data) {
      var goUpload = true;
      var uploadFile = data.files[0];
      if (!(/\.(tar|tgz)$/i).test(uploadFile.name)) {
          alert('You can only import MongoDB backup (tar) files');
          goUpload = false;
      }
      if (uploadFile.size > 100000000) { // 100mb
          alert('File size cannot be more than 100 mb');
          goUpload = false;
      }
      if (goUpload == true) {
          data.submit();
      }
  },
  done: function (e, data) {
      //location.reload(true);
      console.log(data.result.result);
      window.location='/backup';
      

  }
}).on('fileuploadprogressall', function (e, data) {
  var progress = parseInt(data.loaded / data.total * 100, 10);
  $('.progress .progress-bar').css('width', progress + '%');

  if (progress === 100) {
    $('.progress-bar').html('Please wait while file is being processed...');
  }
});