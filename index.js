const PURGE_TIMER = 20;

var express = require('express');
var fs = require('fs-extra');
var path = require('path');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bodyParser = require('body-parser');
var multer  = require('multer');
var Schema = mongoose.Schema;
var app = express();
var Grid = require('gridfs-stream');

/* var Agenda = require('agenda');
var mongoConnectionString = "mongodb://172.30.5.79/agenda";
var agenda = new Agenda({db: {address: mongoConnectionString}});
agenda.on('ready', function(){
  agenda.purge();
  agenda.start();
});
agenda.on('complete', function(job){
  job.remove();
});
agenda.on('fail', function(job){
  job.remove();
}); */

// var options = {
	// useMongoClient: true,
	// user: 'derek',
	// pass: 'poon'
// }
mongoose.connect('mongodb://derek:poon@172.30.235.163/sampledb/countries');


//var MongoClient = require('mongodb').MongoClient;
//MongoClient.connect("mongodb://derek:poon@172.30.235.163:27017/exampledatabase", function(err, db) {
  // Now you can use the database in the db variable
var conn = mongoose.connection;
Grid.mongo = mongoose.mongo;
var gfs = Grid(conn.db);
  
});

var util = require('util'),
EventEmitter = require('events').EventEmitter;
var Country = require('./user.js');

var Ticker = function(initialValue) {
    var currentValue = initialValue;
    this.getCount = function(){
        return currentValue;
    }
    this.countDown = function(){
        currentValue--;
        if (currentValue==0){
            this.emit('complete');
        }
    }
};
util.inherits(Ticker, EventEmitter);

var mystorage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
var upload = multer({ storage: mystorage}).fields([
  { name: 'flag', maxCount: 1 },
  { name: 'anthem', maxCount: 1 }
]);
// var uploadVideo = multer({ storage: mystorage}).fields('video');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function(req, res){
    res.sendFile(__dirname + '/views/menu.html');
});
app.get('/create', function(req, res){
    res.sendFile(__dirname + '/views/create.html');
});
app.post('/create', function(req, res){
   upload(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        var videoFile = '';
        if (req.files['anthem'] != undefined){
            videoFile = req.files['anthem'][0].path;
        }        
        var photoFile = '';
        if (req.files['flag'] != undefined){
            photoFile = req.files['flag'][0].path;            
        }

        var writestream = gfs.createWriteStream({
            filename : videoFile
        });

        fs.createReadStream(videoFile).pipe(writestream);
        writestream.on('close', function(file){
            var newCountry = Country({
                country : req.body.country,
                iso : req.body.iso,
                capital : req.body.capital,
                area : req.body.area,
                population : req.body.population,
                anthem : file._id,
				anthemType: path.extname(videoFile),
                flag : fs.readFileSync(photoFile),
				flagType: path.extname(photoFile)
            });
            newCountry.save(function(err){
                res.end('record created');
                fs.unlink(photoFile, function(){});
                fs.unlink(videoFile, function(){});
            });
        })
    });
});

app.get('/retrieve', function(req, res){
    getCountryNameList( function(namelist){
        res.render(__dirname + '/views/retrieve.ejs', {action: "/retrieve", namelist})
    });
});
app.post('/retrieve', function(req, res){
    getCountryData(req, function(result1, result2, result3 ){
        // purgeJob(result2, result3);
        res.render(__dirname + '/views/profile.ejs', {country: result1, imagefile: result2, videofile: result3});
    });
});

app.get('/update', function(req, res){
    getCountryNameList( function(namelist){
        res.render(__dirname + '/views/retrieve.ejs', {action: "/update", namelist})
    });
});
app.post('/update', function(req, res){
    getCountryData(req, function(result1, result2, result3 ){
       // purgeJob(result2, result3);
       res.render(__dirname + '/views/update.ejs', {country: result1, imagefile: result2, videofile: result3}); 
    });
});
app.post('/updateInfo', function(req, res){
    upload(req, res, function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        var videoFile = '';
        if (req.files['anthem'] != undefined){
            videoFile = req.files['anthem'][0].path;
        }        
        var photoFile = '';
        if (req.files['flag'] != undefined){
            photoFile = req.files['flag'][0].path;            
        }

        Country.findById(req.body.id, function(err, country){
            if (err) throw err;

            var jobCount = new Ticker(2);
            jobCount.on('complete', function(){
                country.save(function(err){
                    fs.unlink(photoFile, function(){});
                    fs.unlink(videoFile, function(){});
                    res.end('record updated.');
                });        
            });
            country.country = req.body.country;
            country.capital = req.body.capital;
            country.iso = req.body.iso;
            country.area = req.body.area;
            country.population = req.body.population;
            if (photoFile != ''){
                country.flagType = path.extname(photoFile);
                fs.readFile(photoFile, function(err, data){
                    country.flag = data;
                    jobCount.countDown();
                });
            }else{
                jobCount.countDown();
            }

            if (videoFile != ''){
                var writestream = gfs.createWriteStream({
                    filename : videoFile
                });

                fs.createReadStream(videoFile).pipe(writestream);
                writestream.on('close', function(file){
                    gfs.remove({_id: country.anthem});
                    country.anthem = file._id;
                    jobCount.countDown();
                })
            }else{
                jobCount.countDown();
            }
        });
    });
});

app.get('/delete', function(req, res){
    res.sendFile(__dirname + '/views/delete.html');
});
app.post('/delete', function(req, res){
    Country.findById(req.body.id, function(err, country){
        if (! err){
            gfs.remove({_id: country.anthem});
            Country.findByIdAndRemove(country._id, function(err){
                console.log(err);
                res.end('record deleted.');
            });
        } else{
            res.end('record not found.');
        }
    });
});

app.listen(8080);
console.log('server is running...');

function getCountryData(req, callback){
    Country.find({iso: req.body.selected}, function(err, results){
        if (err) throw err;
        if (results.length == 0) return callback('record not found.');
        console.log(results[0].country);

        var temp = new Date().getTime();
        
        fs.writeFileSync(__dirname + '/public/imagetemp/photo' + temp + results[0].flagType, results[0].flag, 'binary', function(err){
            console.log(err);
        });
        
        var fs_write_stream = fs.createWriteStream(__dirname + '/public/videotemp/video' + temp + results[0].anthemType);
        var readstream = gfs.createReadStream({
            _id : results[0].anthem
        });
        readstream.pipe(fs_write_stream);
		
        fs_write_stream.on('close', function(){			
            callback(results[0], 'imagetemp/photo' + temp + results[0].flagType, 'videotemp/video' + temp + results[0].anthemType);
        });            
    });
}

function getCountryNameList(callback){
    Country.find({}, function(err, results){
        var namelist = [];
        for(i=0; i<results.length; i++){
            namelist.push(results[i].iso);
        }
        callback(namelist);
    });
};

/* function purgeJob(result2, result3){
    var jobname = 'cleaning' + new Date().getTime();
    agenda.define(jobname, function(job){
        fs.unlink('public/' + result2, function(){});
        fs.unlink('public/' + result3, function(){});
    });
    agenda.schedule('in ' + PURGE_TIMER + ' seconds', jobname);
}
 */