const mongoose = require('mongoose');

const user = new mongoose.Schema({
        _id: String,
        lang: String,
    })


module.exports = mongoose.model("lang", user)