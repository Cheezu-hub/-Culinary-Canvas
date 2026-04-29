const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure user can't favorite same recipe twice
favoriteSchema.index({ user: 1, recipe: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);