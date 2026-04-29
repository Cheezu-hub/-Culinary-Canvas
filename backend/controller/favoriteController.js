const Favorite = require('../models/Favorite');
const Recipe = require('../models/Recipe');

// @desc    Get user's favorites
// @route   GET /api/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).populate('recipe');

    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add recipe to favorites
// @route   POST /api/favorites/:recipeId
// @access  Private
exports.addFavorite = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.recipeId);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const favorite = await Favorite.findOne({
      user: req.user._id,
      recipe: req.params.recipeId
    });

    if (favorite) {
      return res.status(400).json({ success: false, message: 'Recipe already in favorites' });
    }

    await Favorite.create({
      user: req.user._id,
      recipe: req.params.recipeId
    });

    res.status(201).json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove recipe from favorites
// @route   DELETE /api/favorites/:recipeId
// @access  Private
exports.removeFavorite = async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      user: req.user._id,
      recipe: req.params.recipeId
    });

    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};