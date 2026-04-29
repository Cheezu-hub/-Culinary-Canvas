import { animate, stagger } from 'motion';
import { initThreeJSBackground } from './three-bg.js';
import VanillaTilt from 'vanilla-tilt';

/**
 * Main application logic for Culinary Canvas.
 * Handles recipe fetching, rendering, and interactive UI elements.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('Culinary Canvas Initialized');
  initThreeJSBackground();
  // API Base URL
  const API_URL = 'http://localhost:5000/api';
  
  // --- DOM ELEMENT SELECTION ---
  const recipeGrid = document.getElementById('recipeGrid');
  const favoritesGrid = document.getElementById('favoritesGrid');
  const uploadedRecipesGrid = document.getElementById('uploadedRecipesGrid');
  const recipeModal = document.getElementById('recipeModal');
  const closeButton = document.querySelector('.close-button');
  const modalRecipeTitle = document.getElementById('modalRecipeTitle');
  const modalRecipeImage = document.getElementById('modalRecipeImage');
  const modalIngredientsList = document.getElementById('modalIngredientsList');
  const modalInstructions = document.getElementById('modalInstructions');
  const modalYoutubeLink = document.getElementById('modalYoutubeLink');
  const searchInput = document.getElementById('searchInput');
  const searchIcon = document.getElementById('searchIcon');
  const cuisineFilter = document.getElementById('cuisineFilter');
  const dietaryFilter = document.getElementById('dietaryFilter');
  const recentSearchTags = document.getElementById('recentSearchTags');
  const clearRecentSearchesBtn = document.getElementById('clearRecentSearchesBtn');
  const recipeUploadForm = document.getElementById('recipeUploadForm');
  const uploadRecipeId = document.getElementById('uploadRecipeId');
  const uploadRecipeName = document.getElementById('uploadRecipeName');
  const uploadCuisine = document.getElementById('uploadCuisine');
  const uploadIngredients = document.getElementById('uploadIngredients');
  const uploadInstructions = document.getElementById('uploadInstructions');
  const uploadRecipeImage = document.getElementById('uploadRecipeImage');
  const fileUploadDisplay = document.getElementById('fileUploadDisplay');
  const uploadMessage = document.getElementById('uploadMessage');
  const backToTopBtn = document.getElementById('backToTopBtn');

  // Auth state
  let authToken = localStorage.getItem('authToken');
  let currentUser = JSON.parse(localStorage.getItem('currentUser'));

  // --- HELPER FUNCTIONS ---
  function generateUniqueId() {
    return 'recipe_' + Date.now() + Math.floor(Math.random() * 1000);
  }

  async function apiRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // --- RECIPE FETCHING AND DISPLAY SECTION ---
  function renderRecipeCard(meal, targetGrid, isExternal = false) {
    const card = document.createElement('div');
    card.classList.add('recipe-card');
     
    const mealId = meal._id || meal.idMeal || meal.id;
    const isFavorite = meal.isFavorite || false;
    const favoriteClass = isFavorite ? 'active' : '';

    const instructionsSnippet = (meal.strInstructions || meal.instructions || '').substring(0, 100) + '...';
    const areaTag = meal.cuisine || meal.strArea || 'Unknown';
    const isUploaded = !!meal.isUploaded || !isExternal;

    const uploadedButtons = isUploaded && !isExternal
        ? `<div class="card-actions">
                <button class="edit-btn" data-id="${mealId}">Edit</button>
                <button class="delete-btn" data-id="${mealId}">Delete</button>
            </div>`
        : '';

    const imageUrl = meal.image?.startsWith('http') 
      ? meal.image 
      : meal.strMealThumb 
      ? meal.strMealThumb 
      : `${API_URL.replace('/api', '')}/${meal.image}`;

    card.innerHTML = `
         <img src="${imageUrl}" alt="${meal.strMeal || meal.name}" onerror="this.src='images/default-recipe.jpg'">
         <i class="fas fa-heart favorite-icon ${favoriteClass}" data-id="${mealId}" data-external="${isExternal}"></i>
        ${uploadedButtons}
         <div class="card-content">
             <h3>${meal.strMeal || meal.name}</h3>
             <p>${instructionsSnippet}</p>
             <div class="card-meta">
                 <span class="tag">${areaTag}</span>
             </div>
             <button class="view-recipe-btn" data-id="${mealId}" data-external="${isExternal}">View Recipe</button>
         </div>
    `;
    targetGrid.appendChild(card);
    
    // Add 3D Tilt Effect
    VanillaTilt.init(card, {
        max: 15,
        speed: 400,
        glare: true,
        "max-glare": 0.2,
        scale: 1.02
    });
  }

  async function fetchRecipes(query = '') {
    recipeGrid.innerHTML = '<p>Loading recipes...</p>';
    
    try {
      const endpoint = query 
        ? `/recipes?search=${encodeURIComponent(query)}`
        : '/recipes';
      
      const response = await apiRequest(endpoint);
      
      recipeGrid.innerHTML = '';
      
      if (response.data && response.data.length > 0) {
        response.data.forEach(meal => {
          renderRecipeCard(meal, recipeGrid, false);
        });
        animate(
          recipeGrid.querySelectorAll('.recipe-card'),
          { opacity: [0, 1], y: [30, 0], scale: [0.95, 1] },
          { delay: stagger(0.08), duration: 0.5, easing: 'ease-out' }
        );
      } else {
        // Fallback to external API if no local recipes
        await fetchExternalRecipes(query);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      recipeGrid.innerHTML = '<p>Failed to load recipes. Please try again later.</p>';
    }
  }

  async function fetchExternalRecipes(query = '') {
    try {
      const endpoint = query
        ? `/recipes/external/search?search=${encodeURIComponent(query)}`
        : '/recipes/external/search';
      
      const response = await apiRequest(endpoint);
      
      recipeGrid.innerHTML = '';
      
      if (response.data && response.data.length > 0) {
        response.data.forEach(meal => {
          renderRecipeCard(meal, recipeGrid, true);
        });
        animate(
          recipeGrid.querySelectorAll('.recipe-card'),
          { opacity: [0, 1], y: [30, 0], scale: [0.95, 1] },
          { delay: stagger(0.08), duration: 0.5, easing: 'ease-out' }
        );
      } else {
        recipeGrid.innerHTML = '<p>No recipes found. Try a different search!</p>';
      }
    } catch (error) {
      console.error('Failed to fetch external recipes:', error);
      recipeGrid.innerHTML = '<p>Failed to load recipes. Please try again later.</p>';
    }
  }

  // --- RECIPE MODAL ---
  async function openRecipeModal(mealId, isExternal = false) {
    try {
      let meal;
      
      if (isExternal) {
        const response = await apiRequest(`/recipes/external/search?search=${mealId}`);
        meal = response.data[0];
      } else {
        const response = await apiRequest(`/recipes/${mealId}`);
        meal = response.data;
      }

      if (!meal) return;

      modalRecipeTitle.textContent = meal.strMeal || meal.name;
      
      const imageUrl = meal.image?.startsWith('http') 
        ? meal.image 
        : meal.strMealThumb 
        ? meal.strMealThumb 
        : `${API_URL.replace('/api', '')}/${meal.image}`;
      
      modalRecipeImage.src = imageUrl;
      modalIngredientsList.innerHTML = '';

      if (Array.isArray(meal.ingredients)) {
        meal.ingredients.forEach(ingredientText => {
          if (ingredientText.trim()) {
            const li = document.createElement('li');
            li.textContent = ingredientText.trim();
            modalIngredientsList.appendChild(li);
          }
        });
      } else {
        for (let i = 1; i <= 20; i++) {
          const ingredient = meal[`strIngredient${i}`];
          const measure = meal[`strMeasure${i}`];
          if (ingredient && ingredient.trim()) {
            const li = document.createElement('li');
            li.textContent = `${measure || ''} ${ingredient}`.trim();
            modalIngredientsList.appendChild(li);
          }
        }
      }
      
      modalInstructions.textContent = meal.strInstructions || meal.instructions;
      
      if (meal.youtubeLink || meal.strYoutube) {
        modalYoutubeLink.href = meal.youtubeLink || meal.strYoutube;
        modalYoutubeLink.style.display = 'inline-block';
      } else {
        modalYoutubeLink.style.display = 'none';
      }

      recipeModal.style.display = 'flex';
      animate(
        recipeModal.querySelector('.modal-content'),
        { opacity: [0, 1], scale: [0.8, 1] },
        { duration: 0.4, easing: 'ease-out' }
      );
    } catch (error) {
      console.error('Failed to load recipe details:', error);
      alert('Failed to load recipe details');
    }
  }

  // --- RECENT SEARCHES ---
  async function getRecentSearches() {
    try {
      if (!authToken) return [];
      const response = await apiRequest('/recent-searches');
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  async function addRecentSearch(searchTerm) {
    if (!searchTerm || !authToken) return;
    try {
      await apiRequest('/recent-searches', {
        method: 'POST',
        body: JSON.stringify({ searchTerm })
      });
      renderRecentSearches();
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  }

  async function renderRecentSearches() {
    const searches = await getRecentSearches();
    recentSearchTags.innerHTML = searches.length === 0 ? '<p>No recent searches.</p>' : '';
    
    searches.forEach(search => {
      const span = document.createElement('span');
      span.classList.add('recent-search-tag');
      span.textContent = search.searchTerm;
      span.addEventListener('click', () => {
        searchInput.value = search.searchTerm;
        performSearch(search.searchTerm);
      });
      recentSearchTags.appendChild(span);
    });
  }

  async function clearRecentSearches() {
    try {
      await apiRequest('/recent-searches/clear', { method: 'DELETE' });
      renderRecentSearches();
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }

  // --- FAVORITES ---
  async function getFavorites() {
    try {
      if (!authToken) return [];
      const response = await apiRequest('/favorites');
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  async function toggleFavorite(mealId, heartIcon, isExternal = false) {
    if (!authToken) {
      alert('Please login to add favorites');
      return;
    }

    try {
      const isCurrentlyFavorite = heartIcon.classList.contains('active');
      
      if (isCurrentlyFavorite) {
        await apiRequest(`/favorites/${mealId}`, { method: 'DELETE' });
        heartIcon.classList.remove('active');
      } else {
        await apiRequest(`/favorites/${mealId}`, { method: 'POST' });
        heartIcon.classList.add('active');
      }
      
      renderFavorites();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Failed to update favorites');
    }
  }

  async function renderFavorites() {
    if (!authToken) {
      favoritesGrid.innerHTML = '<p class="no-favorites">Please login to view favorites</p>';
      return;
    }

    try {
      const favorites = await getFavorites();
      favoritesGrid.innerHTML = favorites.length === 0 
        ? '<p class="no-favorites">You haven\'t added any favorites yet!</p>' 
        : '';
      
      favorites.forEach(fav => {
        if (fav.recipe) {
          renderRecipeCard(fav.recipe, favoritesGrid, false);
        }
      });
      animate(
        favoritesGrid.querySelectorAll('.recipe-card'),
        { opacity: [0, 1], y: [30, 0], scale: [0.95, 1] },
        { delay: stagger(0.08), duration: 0.5, easing: 'ease-out' }
      );
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }

  // --- UPLOADED RECIPES ---
  async function renderUploadedRecipes() {
    if (!authToken) {
      uploadedRecipesGrid.innerHTML = '<p class="no-uploads">Please login to view your recipes</p>';
      return;
    }

    try {
      const response = await apiRequest('/recipes/user');
      const uploadedRecipes = response.data || [];
      
      uploadedRecipesGrid.innerHTML = uploadedRecipes.length === 0 
        ? '<p class="no-uploads">You haven\'t uploaded any recipes yet!</p>' 
        : '';
      
      uploadedRecipes.forEach(recipe => {
        renderRecipeCard(recipe, uploadedRecipesGrid, false);
      });
      animate(
        uploadedRecipesGrid.querySelectorAll('.recipe-card'),
        { opacity: [0, 1], y: [30, 0], scale: [0.95, 1] },
        { delay: stagger(0.08), duration: 0.5, easing: 'ease-out' }
      );
    } catch (error) {
      console.error('Failed to load uploaded recipes:', error);
    }
  }

  // --- EVENT HANDLING ---
  function performSearch(query) {
    if (query.trim()) {
      fetchRecipes(query.trim());
      addRecentSearch(query.trim());
    } else {
      fetchRecipes();
    }
  }

  async function handleGridClick(event) {
    const target = event.target;

    if (target.classList.contains('view-recipe-btn')) {
      const mealId = target.dataset.id;
      const isExternal = target.dataset.external === 'true';
      openRecipeModal(mealId, isExternal);
    }

    if (target.classList.contains('favorite-icon')) {
      const mealId = target.dataset.id;
      const isExternal = target.dataset.external === 'true';
      await toggleFavorite(mealId, target, isExternal);
    }
  }

  async function handleUploadedGridClick(event) {
    const target = event.target;
    const mealId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
      try {
        const response = await apiRequest(`/recipes/${mealId}`);
        const recipe = response.data;
        
        if (recipe) {
          uploadRecipeId.value = recipe._id;
          uploadRecipeName.value = recipe.name;
          uploadCuisine.value = recipe.cuisine;
          uploadIngredients.value = recipe.ingredients.join('\n');
          uploadInstructions.value = recipe.instructions;
          fileUploadDisplay.textContent = 'Choose a new image (optional)';
          document.getElementById('share-recipe-section').scrollIntoView({ behavior: 'smooth' });
          recipeUploadForm.querySelector('.submit-recipe-btn').textContent = 'Update Recipe';
        }
      } catch (error) {
        console.error('Failed to load recipe for editing:', error);
      }
    }

    if (target.classList.contains('delete-btn')) {
      if (confirm('Are you sure you want to delete this recipe?')) {
        try {
          await apiRequest(`/recipes/${mealId}`, { method: 'DELETE' });
          renderUploadedRecipes();
        } catch (error) {
          console.error('Failed to delete recipe:', error);
          alert('Failed to delete recipe');
        }
      }
    }
  }

  recipeGrid.addEventListener('click', handleGridClick);
  favoritesGrid.addEventListener('click', handleGridClick);
  uploadedRecipesGrid.addEventListener('click', handleGridClick); 
  uploadedRecipesGrid.addEventListener('click', handleUploadedGridClick);

  closeButton.addEventListener('click', () => {
    recipeModal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
      recipeModal.style.display = 'none';
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });
  
  searchIcon.addEventListener('click', () => {
    performSearch(searchInput.value);
  });
  
  clearRecentSearchesBtn.addEventListener('click', clearRecentSearches);

  // Filter handlers
  cuisineFilter.addEventListener('change', (e) => {
    const value = e.target.value;
    dietaryFilter.value = '';
    
    if (value) {
      fetchRecipes(`cuisine:${value}`);
    } else {
      fetchRecipes();
    }
  });

  dietaryFilter.addEventListener('change', (e) => {
    const value = e.target.value;
    cuisineFilter.value = '';
    
    if (value) {
      fetchRecipes(`dietary:${value}`);
    } else {
      fetchRecipes();
    }
  });

  // File upload handling
  uploadRecipeImage.addEventListener('change', (e) => {
    fileUploadDisplay.textContent = e.target.files.length > 0 ? e.target.files[0].name : 'No file chosen';
  });
  
  fileUploadDisplay.addEventListener('click', () => {
    uploadRecipeImage.click();
  });

  // Recipe upload form submission
  recipeUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = uploadRecipeName.value.trim();
    const cuisine = uploadCuisine.value;
    const ingredients = uploadIngredients.value.trim();
    const instructions = uploadInstructions.value.trim();
    const imageFile = uploadRecipeImage.files[0];
    const editingId = uploadRecipeId.value;

    if (!name || !cuisine || !ingredients || !instructions) {
      uploadMessage.textContent = 'Please fill in all text fields.';
      uploadMessage.className = 'upload-message error';
      return;
    }

    if (!editingId && !imageFile) {
      uploadMessage.textContent = 'Please select an image for your new recipe.';
      uploadMessage.className = 'upload-message error';
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('cuisine', cuisine);
    formData.append('ingredients', ingredients);
    formData.append('instructions', instructions);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      let response;
      
      if (editingId) {
        response = await fetch(`${API_URL}/recipes/${editingId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });
        uploadMessage.textContent = 'Recipe updated successfully!';
      } else {
        response = await fetch(`${API_URL}/recipes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });
        uploadMessage.textContent = 'Recipe uploaded successfully!';
        document.getElementById('my-uploaded-recipes-section').scrollIntoView({ behavior: 'smooth' });
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      uploadMessage.className = 'upload-message success';
      recipeUploadForm.reset();
      uploadRecipeId.value = '';
      fileUploadDisplay.textContent = 'No file chosen';
      recipeUploadForm.querySelector('.submit-recipe-btn').textContent = 'Share Recipe';
      
      renderUploadedRecipes();
      
      setTimeout(() => { 
        uploadMessage.textContent = ''; 
      }, 4000);
      
    } catch (error) {
      uploadMessage.textContent = error.message || 'Failed to upload recipe';
      uploadMessage.className = 'upload-message error';
    }
  });

  // Back to top button
  window.onscroll = () => {
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
      backToTopBtn.style.display = 'block';
    } else {
      backToTopBtn.style.display = 'none';
    }
  };

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- AUTHENTICATION FUNCTIONS ---
  async function login(email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      authToken = data.token;
      currentUser = data.user;
      
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      updateUIForAuth();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async function register(username, email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      authToken = data.token;
      currentUser = data.user;
      
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      updateUIForAuth();
      return data;
    } catch (error) {
      throw error;
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateUIForAuth();
  }

  function updateUIForAuth() {
    // Update navbar or other UI elements based on auth state
    const navLinks = document.querySelector('.nav-links');
    
    if (currentUser) {
      // Add logout button
      let logoutBtn = document.getElementById('logoutBtn');
      if (!logoutBtn) {
        logoutBtn = document.createElement('a');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.href = '#';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          logout();
        });
        navLinks.appendChild(logoutBtn);
      }
    } else {
      // Remove logout button
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.remove();
      }
    }
    
    // Re-render sections that depend on auth
    renderFavorites();
    renderUploadedRecipes();
    renderRecentSearches();
  }

  // --- INITIALIZATION ---
  fetchRecipes();
  renderRecentSearches();
  
  if (authToken) {
    updateUIForAuth();
  }

  // Hero section animation
  animate(
    '.hero-section h1', 
    { opacity: [0, 1], y: [-30, 0] }, 
    { duration: 0.8, easing: 'ease-out' }
  );
  animate(
    '.hero-section p', 
    { opacity: [0, 1], y: [30, 0] }, 
    { duration: 0.8, delay: 0.2, easing: 'ease-out' }
  );
});