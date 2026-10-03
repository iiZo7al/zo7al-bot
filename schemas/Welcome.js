const mongoose = require('mongoose');

const user = new mongoose.Schema({
        _id: String,
        message: String,
        channel: String,
    })


module.exports = mongoose.model("welcome", user)