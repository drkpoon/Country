const PURGE_TIMER = 20
var express = require('express')
var fs = require('fs-extra')
var path = require('path')
var mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
var bodyParser = require('body-parser')
var multer = require('multer')
// var Schema = mongoose.Schema
var app = express()
var Grid = require('gridfs-stream')
var mongo = require('mongodb')
var ObjectID = require('mongodb').ObjectID
var Agenda = require('agenda')
var NumberParser = require('numberparser');

if (process.env.MONGODB_USER){
  var rootUrl = 'mongodb://' + process.env.MONGODB_USER + ':' + process.env.MONGODB_PASSWORD + '@10.130.106.249:27017'
}else{
  var rootUrl = 'mongodb://' + 'derek' + ':' + 'derek' + '@localhost:27017'
}

var mongoConnectionString = rootUrl + '/agenda'
var agenda = new Agenda({ db: { address: mongoConnectionString } })
agenda.on('ready', function () {
  agenda.purge()
  agenda.start()
})
agenda.on('complete', function (job) {
  job.remove()
})
agenda.on('fail', function (job) {
  job.remove()
})
var gfs
var collection
var MongoClient = require('mongodb').MongoClient
MongoClient.connect(rootUrl + '/countries', function (err, db) {
  if (err) {
    console.log('fail to open')
  }else {
    console.log('connected')
    collection = db.collection('profiles')
    gfs = new Grid(db, mongo)
  }
})
var util = require('util'),
  EventEmitter = require('events').EventEmitter
var Country = require('./user.js')
var Ticker = function (initialValue) {
  var currentValue = initialValue
  this.getCount = function () {
    return currentValue
  }
  this.countDown = function () {
    currentValue--
    if (currentValue === 0) {
      this.emit('complete')
    }
  }
}
util.inherits(Ticker, EventEmitter)
var mystorage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './public/uploads')
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
var upload = multer({ storage: mystorage }).fields([
  { name: 'flag', maxCount: 1 },
  { name: 'anthem', maxCount: 1 }
])
// var uploadVideo = multer({ storage: mystorage}).fields('video')

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/pagecount', function(req, res){
	res.end('ok');
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/menu.html')
})
app.get('/create', function (req, res) {
  res.sendFile(__dirname + '/views/create.html')
})
app.post('/create', function (req, res) {
  upload(req, res, function (err) {
    if (err) {
      return res.end('Error uploading file.')
    }
    var videoFile = ''
    if (req.files['anthem'] !== undefined) {
      videoFile = req.files['anthem'][0].path
    }
    var photoFile = ''
    if (req.files['flag'] !== undefined) {
      photoFile = req.files['flag'][0].path
    }

    var writestream = gfs.createWriteStream({
      filename: videoFile
    })
    fs.createReadStream(videoFile).pipe(writestream)
    writestream.on('close', function (file) {
      var newCountry = Country({
        country: req.body.country,
        iso: req.body.iso,
        capital: req.body.capital,
        area: req.body.area,
        population: req.body.population,
        anthem: file._id,
        anthemType: path.extname(videoFile),
        flag: fs.readFileSync(photoFile),
        flagType: path.extname(photoFile)
      })
      collection.insert(newCountry, function (err, result) {
        if (err){
          res.end('record fail to create.');
        }else{
          res.end('record created')
        }        
        fs.remove(photoFile, function () {})
        fs.remove(videoFile, function () {})
      })
    })
  })
})
app.get('/retrieve', function (req, res) {
  getCountryNameList(function (namelist) {
    res.render(__dirname + '/views/retrieve.ejs', { action: '/retrieve', namelist})
  })
})
app.post('/retrieve', function (req, res) {
  getCountryData(req, function (result1, result2, result3) {
    purgeJob(result2, result3);
    var parser = new NumberParser();
    res.render(__dirname + '/views/profile.ejs', { country: result1, imagefile: result2, videofile: result3,
       area_format: parser.parseValue(Number(result1.area), "%sd"), population_format: parser.parseValue(Number(result1.population), "%sd") });
  })
})
app.get('/update', function (req, res) {
  getCountryNameList(function (namelist) {
    res.render(__dirname + '/views/retrieve.ejs', { action: '/update', namelist})
  })
})
app.post('/update', function (req, res) {
  getCountryData(req, function (result1, result2, result3) {
    purgeJob(result2, result3)
    res.render(__dirname + '/views/update.ejs', { country: result1, imagefile: result2, videofile: result3 })
  })
})
app.post('/updateInfo', function (req, res) {
  upload(req, res, function (err) {
    if (err) {
      return res.end('Error uploading file.')
    }

    var updateField = { $set: {} }
    updateField.$set['country'] = req.body.country
    updateField.$set['iso'] = req.body.iso
    updateField.$set['capital'] = req.body.capital
    updateField.$set['area'] = req.body.area
    updateField.$set['population'] = req.body.population

    var newVideoFile = req.files['anthem'] !== undefined
    var videoFile = 'dummy.txt'
    if (newVideoFile) {
      videoFile = req.files['anthem'][0].path
    }
    var photoFile = ''
    if (req.files['flag'] !== undefined) {
      photoFile = req.files['flag'][0].path
      updateField.$set['flag'] = fs.readFileSync(photoFile)
      updateField.$set['flagType'] = path.extname(photoFile)
    }

    var writestream = gfs.createWriteStream({
      filename: videoFile
    })
    fs.createReadStream(videoFile).pipe(writestream)
    writestream.on('close', function (file) {
      if (newVideoFile) {
        updateField.$set['anthem'] = file._id.toHexString()
        updateField.$set['anthemType'] = path.extname(videoFile)
      }

      collection.update({ '_id': new ObjectID(req.body.id) },
        updateField,
        function (err, result) {
          if (err) {
            throw err
          }
          fs.unlink(photoFile, function () {})
          if (newVideoFile) {
            fs.unlink(videoFile, function () {})
          }
          res.end('record updated.')
        })
    })
  })
})
app.get('/delete', function (req, res) {
  res.sendFile(__dirname + '/views/delete.html')
})
app.post('/delete', function (req, res) {
  var objId
  try {
    objId = new ObjectID(req.body.id)
  } catch (err) {
    res.end('invalid id')
  }
  if (objId !== undefined) {
    collection.find({ '_id': objId }, { anthem: 1 }).toArray(function (err, results) {
      var anthemId = results[0].anthem
      gfs.remove({ '_id': new ObjectID(anthemId) }, function (err) {
        if (err) {
          res.end('record cannot be deleted.')
        }else {
          collection.remove({ '_id': objId }, function (err, country) {
            if (!err) {
              res.end('record deleted.')
            }else {
              res.end('record not found.')
            }
          })
        }
      })
    })
  }else {
    res.end('record not found.')
  }
})
app.listen(8080);
console.log('server is running...');

function getCountryData (req, callback) {
  collection.findOne({ iso: req.body.selected }, function (err, results) {
    if (err)
      throw err
    if (results.length === 0)
      return callback('record not found.')

    var temp = new Date().getTime()
    fs.writeFileSync(__dirname + '/public/imagetemp/photo' + temp + results.flagType, results.flag.buffer, 'binary', function (err) {
      if (err) {
        console.log(err)
      }
    })
    var fs_write_stream = fs.createWriteStream(__dirname + '/public/videotemp/video' + temp + results.anthemType);
    var readstream = gfs.createReadStream({
      _id: results.anthem
    })
    readstream.pipe(fs_write_stream)
    fs_write_stream.on('close', function () {
      callback(results, 'imagetemp/photo' + temp + results.flagType, 'videotemp/video' + temp + results.anthemType)
    })
  })
}

function getCountryNameList (callback) {
  collection.find().toArray(function (err, results) {
    if (err)
      throw err
    var namelist = []
    for (i = 0; i < results.length; i++) {
      namelist.push(results[i].iso)
    }
    callback(namelist)
  })
}

function purgeJob (result2, result3) {
  var jobname = 'cleaning' + new Date().getTime()
  agenda.define(jobname, function (job) {
    fs.remove('public/' + result2, function () {})
    fs.remove('public/' + result3, function () {})
  })
  agenda.schedule('in ' + PURGE_TIMER + ' seconds', jobname)
}

// sh-4.2$ echo $MONGODB_USER                                                                                                                                                                          
// userMYP                                                                                                                                                                                             
// sh-4.2$ echo $MONGODB_PASSWORD                                                                                                                                                                      
// axope0UJXKvl1iEB                                                                                                                                                                                    
// sh-4.2$ echo $MONGODB_ADMIN_PASSWORD                                                                                                                                                                
// L4asLKljjF7Josly