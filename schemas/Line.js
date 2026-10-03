const mongoose = require('mongoose');

const user = new mongoose.Schema({
        _id: String,
        line: String,
        channel: Array,
    })


module.exports = mongoose.model("line", user)