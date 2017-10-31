const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

UserSchema.statics.findOrCreate = function(username, password, callback) {
  User.findOne({ username })
  .then(user => {
    if (!user) {
      User.create({
        username,
        password,
      })
      .then(resp => { callback(null, resp); }) // register
      .catch(err => { callback(err, null); }); // error
    }
    else if (password !== user.password) { // invalid password
      callback("Password's do not match.", null);
    }
    else { // user authenticated, pass user
      callback(null, user);
    }
  })
  .catch(err => {
    callback(err, null);
  })
}

const DocSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'untitled',
  },
  password: {
    type: String,
    required: true,
  },
  contents: {// most recent state
    type: String,
    default: '',
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'

  }],
  created: {
    type: Date,
    default: new Date().getTime(),
  },
  last_edit: {
    type: Date,
    default: new Date().getTime(),// update each time POST /doc/save
  },
  revision_history: {
    type: Array,
    default: [],// push to upon each PUT /doc/:id
  },
});

const User = mongoose.model('User', UserSchema);
const Doc = mongoose.model('Doc', DocSchema);

module.exports = {
  User,
  Doc,
};