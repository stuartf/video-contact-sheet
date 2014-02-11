#!/usr/bin/env node

var _ = require('underscore');
var sys = require('sys');
var exec = require('child_process').exec;
var temp = require('temp');

temp.track();

// RegExp.quote = function(str) {
//   return str.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
// };

function escapeRegExp(str) {
  return str.replace(/[\[\]\{\}\(\)\*\+\?\\\^\$\|\ \'\"]/g, '\\$&');
}

function generateMontage(videoInfo) {
  var dimensions = '326x246';//326x246';  // CONFIG
  var cols =  3; // CONFIG
  var rows = 8; // CONFIG
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
  // console.log(result);

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

var inputVideoFilename = escapeRegExp(process.argv[2]);

var getVideoInfoCommand = 'ffprobe -v quiet -print_format json -pretty -show_format -show_streams ' + inputVideoFilename;
exec(getVideoInfoCommand, readFileInfo);
