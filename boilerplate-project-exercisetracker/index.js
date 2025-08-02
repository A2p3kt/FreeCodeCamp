const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

app.use(express.urlencoded({extended: false}))

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  }
})

let User = mongoose.model('User', userSchema)

const exerciseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now 
  }
})

let Exercise = mongoose.model('Exercise', exerciseSchema)

app.get('/api/users', async (req, res) => {
  const users = await User.find({})
  res.json(users)
})

app.post('/api/users', async (req, res) => {
  const username = req.body.username
  const newUser = new User({username: username})

  try {
    const savedUser = await newUser.save()
    res.status(201).json({
      username: savedUser.username,
      _id: savedUser._id
    })
  } catch(err) {
    console.error(err)
    res.status(500).json({error: 'Something went wrong', details: err.message})
  }
  
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  let id = req.params._id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(403).json({error: 'Invalid User ID'})
  }
  
  const description = req.body.description
  const duration = Number(req.body.duration)
  if (isNaN(duration) || duration <= 0) {
    return res.status(400).json({error: "Invalid Duration"})
  }
  const date = req.body.date ? new Date(req.body.date) : new Date()

  //Date validation
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }
  
  User.findById(id)
    .then(async (doc) => {
      if (!doc) {
        return res.status(404).json({error: "User Not Found"})
      }

      const newExercise = new Exercise({
        user: doc,
        description: description,
        duration: duration,
        date: date
      })

      try {
        const savedExercise = await newExercise.save()
        res.status(201).json({
          _id: doc._id,
          username: doc.username,
          date: savedExercise.date.toDateString(),
          duration: savedExercise.duration,
          description: savedExercise.description
        })
      } catch (err) {
        console.error(err)
      }

    })

})

app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(403).json({error: 'Invalid User ID'})
  }

  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({error: 'The user ID does not exist'})
  }

  const filter = {user: id}

  let {from, to, limit} = req.query;
  if (from) {
    from = new Date(from)
    if (isNaN(from.getTime())) return res.status(400).json({error: 'Invalid date format'})
    filter.date = {...filter.date, $gte: from}
  }
  
  if (to) {
    to = new Date(to)
    if (isNaN(to.getTime())) return res.status(400).json({error: 'Invalid date format'})
    filter.date = {...filter.date, $lte: to}
  }
  
      
  let query = Exercise.find(filter)
    .select('-_id description duration date')
    .lean()

  if (limit) {
    limit = parseInt(limit)
    if (isNaN(limit)) return res.status(400).json({error: 'Invalid limit value'})
    query = query.limit(limit)
  }

  let exercises = await query.exec()

  exercises = exercises.map(exercise => ({
    ...exercise,
    date: new Date(exercise.date).toDateString()
  }))

  const response = {
    _id: user._id,
    username: user.username,
    from: from ? from.toDateString() : undefined, 
    to: to ? to.toDateString() : undefined, 
    count: exercises.length,
    log: exercises
  }

  if (!response.from) delete response.from
  if (!response.to) delete response.to

  res.json(response)

})





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
