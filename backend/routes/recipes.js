const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getExternalRecipes
} = require('../controllers/recipeController');

router.route('/')
  .get(getRecipes)
  .post(protect, upload.single('image'), createRecipe);

router.get('/external/search', getExternalRecipes);
router.route('/:id')
  .get(getRecipeById)
  .put(protect, upload.single('image'), updateRecipe)
  .delete(protect, deleteRecipe);

module.exports = router;