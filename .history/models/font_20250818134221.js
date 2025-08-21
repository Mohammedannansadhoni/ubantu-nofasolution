var mongoose = require('mongoose');

var fontSchema = new mongoose.Schema({
    fontName: {
        type: String,
        required: true,
        unique: true
    },
    fontType: {
        type: String,
        enum: ['google', 'custom'],
        required: true
    },
    googleFontApi: {
        type: String,
        default: null
    },
    fontFile: {
        type: String,
        default: null
    },
    fontFamily: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Font', fontSchema);
