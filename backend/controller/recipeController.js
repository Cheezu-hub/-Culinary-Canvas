const Recipe = require('../models/Recipe');
const axios = require('axios');

// @desc    Get all recipes with filters
// @route   GET /api/recipes
// @access  Public
exports.getRecipes = async (req, res) => {
  try {
    const { search, cuisine, dietary, page = 1, limit = 12 } = req.query;
    
    let query = {};

    // Search by name, ingredients, or instructions
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by cuisine
    if (cuisine && cuisine !== 'All') {
      query.cuisine = cuisine;
    }

    // Filter by dietary tags
    if (dietary && dietary !== 'All') {
      query.dietaryTags = dietary;
    }

    const recipes = await Recipe.find(query)
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Recipe.countDocuments(query);

    res.json({
      success: true,
      count: recipes.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: recipes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single recipe by ID
// @route   GET /api/recipes/:id
// @access  Public
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('user', 'username email');

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    res.json({ success: true, data: recipe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new recipe
// @route   POST /api/recipes
// @access  Private
exports.createRecipe = async (req, res) => {
  try {
    const { name, cuisine, ingredients, instructions, dietaryTags, prepTime, cookTime, servings, youtubeLink } = req.body;

    const recipeData = {
      name,
      cuisine,
      ingredients: ingredients.split('\n').filter(i => i.trim()),
      instructions,
      dietaryTags: dietaryTags || [],
      prepTime,
      cookTime,
      servings,
      youtubeLink,
      user: req.user._id
    };

    // Add image if uploaded
    if (req.file) {
      recipeData.image = req.file.path;
    }

    const recipe = await Recipe.create(recipeData);

    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update recipe
// @route   PUT /api/recipes/:id
// @access  Private
exports.updateRecipe = async (req, res) => {
  try {
    let recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check if user owns the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this recipe' });
    }

    const { name, cuisine, ingredients, instructions, dietaryTags, prepTime, cookTime, servings, youtubeLink } = req.body;

    const recipeData = {
      name,
      cuisine,
      ingredients: ingredients.split('\n').filter(i => i.trim()),
      instructions,
      dietaryTags,
      prepTime,
      cookTime,
      servings,
      youtubeLink
    };

    if (req.file) {
      recipeData.image = req.file.path;
    }

    recipe = await Recipe.findByIdAndUpdate(req.params.id, recipeData, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, data: recipe });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete recipe
// @route   DELETE /api/recipes/:id
// @access  Private
exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check if user owns the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this recipe' });
    }

    await recipe.deleteOne();

    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recipes from external API (TheMealDB)
// @route   GET /api/recipes/external/search
// @access  Public
exports.getExternalRecipes = async (req, res) => {
  try {
    const { search } = req.query;
    const url = search 
      ? `https://www.themealdb.com/api/json/v1/1/search.php?s=${search}`
      : 'https://www.themealdb.com/api/json/v1/1/search.php?f=a';

    const response = await axios.get(url);
    
    res.json({
      success: true,
      data: response.data.meals || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};