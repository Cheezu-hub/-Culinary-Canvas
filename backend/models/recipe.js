const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a recipe name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  cuisine: {
    type: String,
    required: [true, 'Please provide a cuisine'],
    enum: ['Italian', 'Indian', 'French', 'Mexican', 'Asian', 'American', 'British', 'Canadian', 'Chinese', 'Dutch', 'Egyptian', 'Greek', 'Irish', 'Japanese', 'Malaysian', 'Moroccan', 'Russian', 'Spanish', 'Thai', 'Turkish', 'Vietnamese', 'Other']
  },
  ingredients: {
    type: [String],
    required: [true, 'Please provide ingredients']
  },
  instructions: {
    type: String,
    required: [true, 'Please provide instructions']
  },
  image: {
    type: String,
    default: 'default-recipe.jpg'
  },
  dietaryTags: [{
    type: String,
    enum: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Low-Carb']
  }],
  prepTime: {
    type: Number,
    default: 0
  },
  cookTime: {
    type: Number,
    default: 0
  },
  servings: {
    type: Number,
    default: 4
  },
  youtubeLink: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  averageRating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for text search
recipeSchema.index({ name: 'text', ingredients: 'text', instructions: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);