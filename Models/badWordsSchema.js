const { Schema, model } = require('mongoose');

const badWordsSchema = new Schema({
    Guild: { type: String, required: true },
    ProtectionEnabled: { type: Boolean, default: false },
    SwearWords: { type: Array, default: [] },
    LogChannel: { type: String, default: null }
});

module.exports = model('badWords', badWordsSchema);
