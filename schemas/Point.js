const mongoose = require('mongoose');

const user = new mongoose.Schema({
        _id: String,
        points: Number,
    })


module.exports = mongoose.model("point", user)