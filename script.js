document.addEventListener('DOMContentLoaded', () => {
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
    const recentSearchTags = document.getElementById('recentSearchTags');
    const clearRecentSearchesBtn = document.getElementById('clearRecentSearchesBtn');
    const recipeUploadForm = document.getElementById('recipeUploadForm');
    const uploadRecipeName = document.getElementById('uploadRecipeName');
    const uploadCuisine = document.getElementById('uploadCuisine');
    const uploadIngredients = document.getElementById('uploadIngredients');
    const uploadInstructions = document.getElementById('uploadInstructions');
    const uploadRecipeImage = document.getElementById('uploadRecipeImage');
    const fileUploadDisplay = document.getElementById('fileUploadDisplay');
    const uploadMessage = document.getElementById('uploadMessage');

    // --- GLOBAL STATE & CONFIGURATION ---
    const MAX_RECENT_SEARCHES = 5;
    // recipeCache will now only store API fetched recipes by ID
    let apiRecipeCache = {}; 

    function generateUniqueId() {
        return 'recipe_' + Date.now() + Math.floor(Math.random() * 1000);
    }

    // --- RECIPE FETCHING AND DISPLAY SECTION ---
    function renderRecipeCard(meal, targetGrid) {
        // Prevent rendering null meals
        if (!meal) return;

        const card = document.createElement('div');
        card.classList.add('recipe-card');
        
        const favorites = getFavorites();
        const mealId = meal.idMeal || meal.id; // Use idMeal for API, id for uploaded
        const isFavorite = favorites.some(fav => (fav.idMeal || fav.id) === mealId);
        const favoriteClass = isFavorite ? 'active' : '';

        const instructionsSnippet = (meal.strInstructions || meal.instructions || '').substring(0, 100) + '...';
        const areaTag = meal.strArea || meal.cuisine || 'Unknown';
        const isUploaded = !!meal.isUploaded;

        card.innerHTML = `
            <img src="${meal.strMealThumb || meal.image}" alt="${meal.strMeal || meal.name}">
            <i class="fas fa-heart favorite-icon ${favoriteClass}" data-id="${mealId}" data-is-uploaded="${isUploaded}"></i>
            <div class="card-content">
                <h3>${meal.strMeal || meal.name}</h3>
                <p>${instructionsSnippet}</p>
                <div class="card-meta">
                    <span class="tag">${areaTag}</span>
                </div>
                <button class="view-recipe-btn" data-id="${mealId}" data-is-uploaded="${isUploaded}">View Recipe</button>
            </div>
        `;
        targetGrid.appendChild(card);
    }

    async function fetchAndRenderAllRecipes(query = '', cuisine = '') {
        recipeGrid.innerHTML = "<p>Loading recipes...</p>";
        let apiMeals = [];

        try {
            // Fetch from API
            let url;
            if (query) {
                url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`;
            } else if (cuisine) {
                url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${cuisine}`;
            } else {
                url = "https://www.themealdb.com/api/json/v1/1/search.php?f=a"; // Default initial fetch
            }

            const response = await fetch(url);
            const data = await response.json();
            
            apiRecipeCache = {}; // Clear API cache on new fetch
            if (data.meals) {
                // For cuisine filter, filter API data, then fetch details for each
                if (cuisine && !query) {
                    const mealPromises = data.meals.slice(0, 12).map(async (summary) => {
                        const detailResponse = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${summary.idMeal}`);
                        const detailData = await detailResponse.json();
                        return detailData.meals[0];
                    });
                    apiMeals = await Promise.all(mealPromises);
                } else {
                    apiMeals = data.meals;
                }
                apiMeals.forEach(meal => {
                    if (meal) apiRecipeCache[meal.idMeal] = meal;
                });
            }
        } catch (error) {
            console.error("Failed to fetch API recipes:", error);
            // Don't block uploaded recipes from showing if API fails
        }

        // Get uploaded recipes from localStorage
        const uploadedRecipes = getUploadedRecipes();

        // Combine and filter if a query is present
        let allRecipesToDisplay = [];
        if (query) {
            const lowerCaseQuery = query.toLowerCase();
            allRecipesToDisplay = [...apiMeals, ...uploadedRecipes].filter(meal =>
                (meal.strMeal || meal.name).toLowerCase().includes(lowerCaseQuery) ||
                (meal.strInstructions || meal.instructions || '').toLowerCase().includes(lowerCaseQuery) ||
                (meal.strArea || meal.cuisine || '').toLowerCase().includes(lowerCaseQuery)
            );
        } else if (cuisine) {
            const lowerCaseCuisine = cuisine.toLowerCase();
            allRecipesToDisplay = [...apiMeals, ...uploadedRecipes].filter(meal =>
                (meal.strArea || meal.cuisine || '').toLowerCase() === lowerCaseCuisine
            );
        } else {
            allRecipesToDisplay = [...apiMeals, ...uploadedRecipes];
        }


        recipeGrid.innerHTML = ""; // Clear existing
        if (allRecipesToDisplay.length > 0) {
            allRecipesToDisplay.forEach(meal => renderRecipeCard(meal, recipeGrid));
        } else {
            recipeGrid.innerHTML = "<p>No recipes found. Try a different search or filter!</p>";
        }
    }


    // --- RECIPE MODAL SECTION ---
    async function openRecipeModal(mealId, isUploaded = false) {
        let meal;
        if (isUploaded) {
            const uploadedRecipes = getUploadedRecipes();
            meal = uploadedRecipes.find(r => r.id === mealId);
        } else {
            meal = apiRecipeCache[mealId]; // Check API cache first
            if (!meal) {
                // If not in cache, fetch from API
                try {
                    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
                    const data = await response.json();
                    meal = data.meals[0];
                    if (meal) {
                        apiRecipeCache[meal.idMeal] = meal; // Add to cache
                    }
                } catch (error) {
                    console.error("Failed to fetch meal details for modal:", error);
                    return;
                }
            }
        }

        if (!meal) {
            console.error("Meal not found for modal:", mealId, "Is Uploaded:", isUploaded);
            return;
        }

        modalRecipeTitle.textContent = meal.strMeal || meal.name;
        modalRecipeImage.src = meal.strMealThumb || meal.image;
        modalIngredientsList.innerHTML = "";

        if (isUploaded) {
            // Split by newline for uploaded ingredients
            meal.ingredients.split('\n').forEach(ingredientText => {
                if (ingredientText.trim()) {
                    const li = document.createElement('li');
                    li.textContent = ingredientText.trim();
                    modalIngredientsList.appendChild(li);
                }
            });
            // For uploaded recipes, YouTube link might not exist
            modalYoutubeLink.href = '#';
            modalYoutubeLink.style.display = "none";
        } else {
            // Original API logic for ingredients
            for (let i = 1; i <= 20; i++) {
                const ingredient = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if (ingredient && ingredient.trim()) {
                    const li = document.createElement('li');
                    li.textContent = `${measure} ${ingredient}`;
                    modalIngredientsList.appendChild(li);
                }
            }
            modalYoutubeLink.href = meal.strYoutube || '#';
            modalYoutubeLink.style.display = meal.strYoutube ? "inline-block" : "none";
        }
        
        modalInstructions.textContent = meal.strInstructions || meal.instructions;
        
        recipeModal.style.display = "flex";
    }

    // --- RECENT SEARCHES SECTION ---
    function getRecentSearches() {
        return JSON.parse(localStorage.getItem('recentSearches')) || [];
    }

    function addRecentSearch(searchTerm) {
        if (!searchTerm) return;
        let searches = getRecentSearches();
        searches = searches.filter(s => s.toLowerCase() !== searchTerm.toLowerCase());
        searches.unshift(searchTerm);
        localStorage.setItem('recentSearches', JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)));
        renderRecentSearches();
    }

    function renderRecentSearches() {
        const searches = getRecentSearches();
        recentSearchTags.innerHTML = searches.length === 0 ? '<p>No recent searches.</p>' : '';
        searches.forEach(search => {
            const span = document.createElement('span');
            span.classList.add('recent-search-tag');
            span.textContent = search;
            span.addEventListener('click', () => {
                searchInput.value = search;
                performSearch(search);
            });
            recentSearchTags.appendChild(span);
        });
    }

    function clearRecentSearches() {
        localStorage.removeItem('recentSearches');
        renderRecentSearches();
    }

    // --- FAVORITES SECTION ---
    function getFavorites() {
        return JSON.parse(localStorage.getItem('favorites')) || [];
    }

    function addFavorite(meal) {
        const favorites = getFavorites();
        const mealId = meal.idMeal || meal.id;
        if (!favorites.some(fav => (fav.idMeal || fav.id) === mealId)) {
            favorites.unshift(meal);
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    }

    function removeFavorite(mealId) {
        let favorites = getFavorites();
        favorites = favorites.filter(fav => (fav.idMeal || fav.id) !== mealId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    // Modified to correctly retrieve meal data from API cache or uploaded recipes
    async function toggleFavorite(mealId, isUploaded, heartIcon) {
        let mealData;
        if (isUploaded) {
            mealData = getUploadedRecipes().find(r => r.id === mealId);
        } else {
            mealData = apiRecipeCache[mealId];
            if (!mealData) {
                // If not in cache, fetch from API (e.g., if page reloaded or direct access)
                try {
                    const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
                    const data = await response.json();
                    mealData = data.meals[0];
                    if (mealData) {
                        apiRecipeCache[mealData.idMeal] = mealData; // Add to cache
                    }
                } catch (error) {
                    console.error("Failed to fetch meal details for favorite toggle:", error);
                    return;
                }
            }
        }

        if (!mealData) {
            console.error("Meal data not found for toggling favorite:", mealId);
            return;
        }

        const isFavorite = heartIcon.classList.toggle('active');

        if (isFavorite) {
            addFavorite(mealData);
        } else {
            removeFavorite(mealId);
        }

        // Update all heart icons for this meal ID across different grids
        document.querySelectorAll(`.favorite-icon[data-id="${mealId}"]`).forEach(icon => {
            icon.classList.toggle('active', isFavorite);
        });
        
        renderFavorites(); // Re-render favorites grid to reflect changes
    }

    function renderFavorites() {
        const favorites = getFavorites();
        favoritesGrid.innerHTML = favorites.length === 0 ? '<p class="no-favorites">You haven\'t added any favorites yet!</p>' : '';
        favorites.forEach(favMeal => renderRecipeCard(favMeal, favoritesGrid));
    }

    // --- UPLOADED RECIPES SECTION ---
    function getUploadedRecipes() {
        return JSON.parse(localStorage.getItem('uploadedRecipes')) || [];
    }

    function addUploadedRecipe(recipe) {
        const recipes = getUploadedRecipes();
        recipes.unshift(recipe); // Add new recipe to the beginning
        localStorage.setItem('uploadedRecipes', JSON.stringify(recipes));
        renderUploadedRecipes();
        
        fetchAndRenderAllRecipes(searchInput.value, cuisineFilter.value); 
    }

    function renderUploadedRecipes() {
        const uploadedRecipes = getUploadedRecipes();
        uploadedRecipesGrid.innerHTML = uploadedRecipes.length === 0 ? '<p class="no-uploads">You haven\'t uploaded any recipes yet!</p>' : '';
        uploadedRecipes.forEach(recipe => renderRecipeCard(recipe, uploadedRecipesGrid));
    }

    // --- EVENT HANDLING ---
    function performSearch(query) {
        addRecentSearch(query.trim()); 
        fetchAndRenderAllRecipes(query.trim(), cuisineFilter.value);
    }

    async function handleGridClick(event) {
        const target = event.target;

        if (target.classList.contains('view-recipe-btn')) {
            const mealId = target.dataset.id;
            const isUploaded = target.dataset.isUploaded === 'true'; 
            openRecipeModal(mealId, isUploaded);
        }

        if (target.classList.contains('favorite-icon')) {
            const mealId = target.dataset.id;
            const isUploaded = target.dataset.isUploaded === 'true'; 
            await toggleFavorite(mealId, isUploaded, target); 
        }
    }

    recipeGrid.addEventListener('click', handleGridClick);
    favoritesGrid.addEventListener('click', handleGridClick);
    uploadedRecipesGrid.addEventListener('click', handleGridClick);
    
    closeButton.addEventListener('click', () => recipeModal.style.display = "none");
    window.addEventListener('click', (e) => {
        if (e.target === recipeModal) recipeModal.style.display = "none";
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(searchInput.value);
    });
    searchIcon.addEventListener('click', () => performSearch(searchInput.value));
    clearRecentSearchesBtn.addEventListener('click', clearRecentSearches);

    cuisineFilter.addEventListener('change', async (e) => {
        const selectedCuisine = e.target.value;
        fetchAndRenderAllRecipes(searchInput.value, selectedCuisine);
    });

    uploadRecipeImage.addEventListener('change', (e) => {
        fileUploadDisplay.textContent = e.target.files.length > 0 ? e.target.files[0].name : 'No file chosen';
    });
    fileUploadDisplay.addEventListener('click', () => uploadRecipeImage.click());

    recipeUploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = uploadRecipeName.value.trim();
        const cuisine = uploadCuisine.value;
        const ingredients = uploadIngredients.value.trim();
        const instructions = uploadInstructions.value.trim();
        const imageFile = uploadRecipeImage.files[0];

        if (!name || !cuisine || !ingredients || !instructions || !imageFile) {
            uploadMessage.textContent = 'Please fill in all fields and select an image.';
            uploadMessage.className = 'upload-message error';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const newRecipe = {
                id: generateUniqueId(),
                name,
                cuisine,
                ingredients,
                instructions,
                image: event.target.result, 
                isUploaded: true
            };
            addUploadedRecipe(newRecipe); // Store and render uploaded recipes
            uploadMessage.textContent = 'Recipe uploaded successfully!';
            uploadMessage.className = 'upload-message success';
            recipeUploadForm.reset();
            fileUploadDisplay.textContent = 'No file chosen';
            setTimeout(() => { uploadMessage.textContent = ''; }, 5000);
        };
        reader.onerror = () => {
            uploadMessage.textContent = 'Failed to read image file.';
            uploadMessage.className = 'upload-message error';
        };
        reader.readAsDataURL(imageFile); 
    });

    // --- INITIALIZATION ---
    fetchAndRenderAllRecipes(); 
    renderRecentSearches();
    renderFavorites();
    renderUploadedRecipes(); 
});
