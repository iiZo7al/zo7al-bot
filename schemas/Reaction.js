const mongoose = require('mongoose');

const user = new mongoose.Schema({
        _id: Array,
        reaction: String,
        guild: String,
    })


module.exports = mongoose.model("reaction", user)