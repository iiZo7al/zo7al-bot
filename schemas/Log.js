const mongoose = require('mongoose');

const user = new mongoose.Schema({
        _id: String,
        channel: Array,
    })


module.exports = mongoose.model("log", user)