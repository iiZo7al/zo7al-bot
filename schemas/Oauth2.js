const mongoose = require('mongoose');

const Oauth2Schema = new mongoose.Schema({
    accessToken: {
        type: String,
        required: true,
        unique: true,
    },
    refreshToken: {
        type: String,
        required: true,
    },
    discordId: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Oauth2', Oauth2Schema)