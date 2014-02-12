#!/usr/bin/env node

var _ = require('underscore');
var sys = require('sys');
var exec = require('child_process').exec;
var temp = require('temp');
var argv = require('minimist')(process.argv.slice(2));

temp.track();

function escapeRegExp(str) {
  return str.replace(/[\[\]\{\}\(\)\*\+\?\\\^\$\|\ \'\"]/g, '\\$&');
}

function generateMontage(videoInfo) {
  var x = argv.x || '326';
  var y = argv.y || '246';
  var dimensions = x + 'x' + y;
  var cols =  argv.c || 3;
  var rows = argv.r || 8;
  var numThumbnails = cols * rows;

  // Convert video duration from hh:mm:ss to seconds.
  var videoDurationInSeconds = 0;
  var videoDuration = videoInfo.duration;
  var videoDurationPieces = videoDuration.split(':');
  videoDurationPieces.reverse();
  _.each(videoDurationPieces, function(videoDurationPiece, index) {
    videoDurationInSeconds += videoDurationPiece * Math.pow(60, index);
  });

  var folderName = temp.mkdirSync('video-thumbnails');

  var assembleImages = _.after(numThumbnails, function() {
    var title='\n\n\nfilename: ' + videoInfo.filename + '\nduration: ' + videoInfo.duration + '\nsize: ' + videoInfo.filesize + '\nresolution: ' + videoInfo.resolution;
    var generateMontageCommand = 'cd '+folderName+' && montage $(ls | sort -n) -tile '+cols+'x'+rows+' -geometry '+dimensions+'+1+1 -title "'+title+'" ' + process.cwd() + '/' + videoInfo.filename + '-montage.png';
    exec(generateMontageCommand);
  });

  for (var i=0; i < numThumbnails; i++) {
    var ssVal = Math.round( i*(videoDurationInSeconds/numThumbnails) );
    var generateThumbnailCommand = 'ffmpeg -ss '+ ssVal + ' -i '+ inputVideoFilename +' -s '+dimensions+' '+folderName+'/'+(i+1)+'.png';
    exec(generateThumbnailCommand, assembleImages);
  }
}

function readFileInfo(error, stdout, stderr) {
  var result = JSON.parse(stdout);

  var format = result.format;
  var filename = format.filename.split('/').pop();
  var duration = format.duration.split('.')[0];

  var filesizePieces = format.size.split(' ');
  var filesize = Math.round(filesizePieces[0]) + ' ' + filesizePieces[1];

  var streams = result.streams;
  var videoTrack;
  for (var i=0; i < streams.length; i++) {
    var track = streams[i];
    if (track.codec_type === 'video') {
      videoTrack = track;
      break;
    }
  }

  var resolution = videoTrack.width + 'x' + videoTrack.height;

  var videoInfo = {
    'filename': filename,
    'duration': duration,
    'filesize': filesize,
    'resolution': resolution
  };

  console.log(videoInfo);

  generateMontage(videoInfo);
}

var inputVideoFilename = escapeRegExp(argv._[0]);

var getVideoInfoCommand = 'ffprobe -v quiet -print_format json -pretty -show_format -show_streams ' + inputVideoFilename;
exec(getVideoInfoCommand, readFileInfo);
