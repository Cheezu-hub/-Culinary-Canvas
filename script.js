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

    // --- GLOBAL STATE & CONFIGURATION ---
    const MAX_RECENT_SEARCHES = 5;
    let recipeCache = {};

    function generateUniqueId() {
        return 'recipe_' + Date.now() + Math.floor(Math.random() * 1000);
    }

    // --- RECIPE FETCHING AND DISPLAY SECTION ---
    function renderRecipeCard(meal, targetGrid) {
        const card = document.createElement('div');
        card.classList.add('recipe-card');
        
        const favorites = getFavorites();
        const mealId = meal.idMeal || meal.id;
        const isFavorite = favorites.some(fav => (fav.idMeal || fav.id) === mealId);
        const favoriteClass = isFavorite ? 'active' : '';

        const instructionsSnippet = (meal.strInstructions || meal.instructions || '').substring(0, 100) + '...';
        const areaTag = meal.strArea || meal.cuisine || 'Unknown';
        const isUploaded = !!meal.isUploaded;

        const uploadedButtons = isUploaded
            ? `<div class="card-actions">
                   <button class="edit-btn" data-id="${mealId}">Edit</button>
                   <button class="delete-btn" data-id="${mealId}">Delete</button>
               </div>`
            : '';

        card.innerHTML = `
            <img src="${meal.strMealThumb || meal.image}" alt="${meal.strMeal || meal.name}">
            <i class="fas fa-heart favorite-icon ${favoriteClass}" data-id="${mealId}"></i>
            ${uploadedButtons}
            <div class="card-content">
                <h3>${meal.strMeal || meal.name}</h3>
                <p>${instructionsSnippet}</p>
                <div class="card-meta">
                    <span class="tag">${areaTag}</span>
                </div>
                <button class="view-recipe-btn" data-id="${mealId}" data-uploaded="${isUploaded}">View Recipe</button>
            </div>
        `;
        targetGrid.appendChild(card);
    }

    async function fetchRecipes(query = '') {
        recipeGrid.innerHTML = "<p>Loading recipes...</p>";
        let url = query
            ? `https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`
            : "https://www.themealdb.com/api/json/v1/1/search.php?f=a";

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            recipeGrid.innerHTML = "";
            recipeCache = {};

            if (data.meals) {
                data.meals.forEach(meal => {
                    recipeCache[meal.idMeal] = meal;
                    renderRecipeCard(meal, recipeGrid);
                });
            } else {
                recipeGrid.innerHTML = "<p>No recipes found. Try a different search!</p>";
            }
        } catch (error) {
            console.error("Failed to fetch recipes:", error);
            recipeGrid.innerHTML = "<p>Failed to load recipes. Please try again later.</p>";
        }
    }
    
    // --- NEW: Function to find Gluten-Free recipes via client-side search ---
    async function fetchGlutenFreeRecipes() {
        recipeGrid.innerHTML = "<p>Searching for Gluten-Free recipes... This may take a moment.</p>";
        
        // List of common gluten-containing ingredients.
        const glutenKeywords = [
            'flour', 'wheat', 'barley', 'rye', 'bread', 'pasta', 'spaghetti', 
            'noodles', 'couscous', 'semolina', 'farina', 'graham', 'malt'
        ];
        
        const glutenFreeMeals = [];
        const checkedMealIds = new Set(); // To avoid checking duplicate meals

        // Fetch a large sample of meals by iterating through some letters of the alphabet
        const searchLetters = 'abcdefghiklmnoprstvwy'.split('');
        for (const letter of searchLetters) {
            try {
                const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
                const data = await response.json();

                if (data.meals) {
                    for (const meal of data.meals) {
                        if (checkedMealIds.has(meal.idMeal)) continue; // Skip if already processed

                        let containsGluten = false;
                        // Check all 20 ingredient slots for gluten keywords
                        for (let i = 1; i <= 20; i++) {
                            const ingredient = meal[`strIngredient${i}`];
                            if (ingredient && ingredient.trim() !== '') {
                                const lowerCaseIngredient = ingredient.toLowerCase();
                                if (glutenKeywords.some(keyword => lowerCaseIngredient.includes(keyword))) {
                                    containsGluten = true;
                                    break; // Found gluten, no need to check other ingredients for this meal
                                }
                            }
                        }

                        if (!containsGluten) {
                            glutenFreeMeals.push(meal);
                        }
                        checkedMealIds.add(meal.idMeal);
                    }
                }
            } catch (error) {
                console.error(`Failed to fetch recipes for letter ${letter}:`, error);
            }
        }

        // Display the results
        recipeGrid.innerHTML = "";
        if (glutenFreeMeals.length > 0) {
            recipeCache = {}; // Clear cache
            glutenFreeMeals.forEach(meal => {
                recipeCache[meal.idMeal] = meal;
                renderRecipeCard(meal, recipeGrid);
            });
        } else {
            recipeGrid.innerHTML = "<p>No Gluten-Free recipes found from our search. Please try again later.</p>";
        }
    }


    // --- RECIPE MODAL, RECENT SEARCHES, FAVORITES, UPLOADED RECIPES SECTIONS ---
    // ... (No changes in the functions for these sections) ...
    async function openRecipeModal(mealId, isUploaded = false) {
        let meal;
        if (isUploaded) {
            const uploadedRecipes = getUploadedRecipes();
            meal = uploadedRecipes.find(r => r.id === mealId);
        } else {
            meal = recipeCache[mealId];
            if (!meal) {
                const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
                const data = await response.json();
                meal = data.meals[0];
            }
        }

        if (!meal) return;

        modalRecipeTitle.textContent = meal.strMeal || meal.name;
        modalRecipeImage.src = meal.strMealThumb || meal.image;
        modalIngredientsList.innerHTML = "";

        if (isUploaded) {
            meal.ingredients.split('\n').forEach(ingredientText => {
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
                    li.textContent = `${measure} ${ingredient}`;
                    modalIngredientsList.appendChild(li);
                }
            }
        }
        
        modalInstructions.textContent = meal.strInstructions || meal.instructions;
        modalYoutubeLink.href = meal.strYoutube || '#';
        modalYoutubeLink.style.display = meal.strYoutube ? "inline-block" : "none";

        recipeModal.style.display = "flex";
    }

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

    function toggleFavorite(mealData, heartIcon) {
        const mealId = mealData.idMeal || mealData.id;
        const isFavorite = heartIcon.classList.toggle('active');

        if (isFavorite) {
            addFavorite(mealData);
        } else {
            removeFavorite(mealId);
        }

        document.querySelectorAll(`.favorite-icon[data-id="${mealId}"]`).forEach(icon => {
            icon.classList.toggle('active', isFavorite);
        });
        
        renderFavorites();
    }

    function renderFavorites() {
        const favorites = getFavorites();
        favoritesGrid.innerHTML = favorites.length === 0 ? '<p class="no-favorites">You haven\'t added any favorites yet!</p>' : '';
        favorites.forEach(favMeal => renderRecipeCard(favMeal, favoritesGrid));
    }

    function getUploadedRecipes() {
        return JSON.parse(localStorage.getItem('uploadedRecipes')) || [];
    }

    function saveUploadedRecipes(recipes) {
        localStorage.setItem('uploadedRecipes', JSON.stringify(recipes));
    }
    
    function renderUploadedRecipes() {
        const uploadedRecipes = getUploadedRecipes();
        uploadedRecipesGrid.innerHTML = uploadedRecipes.length === 0 ? '<p class="no-uploads">You haven\'t uploaded any recipes yet!</p>' : '';
        uploadedRecipes.forEach(recipe => renderRecipeCard(recipe, uploadedRecipesGrid));
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
            const isUploaded = target.dataset.uploaded === 'true';
            openRecipeModal(mealId, isUploaded);
        }

        if (target.classList.contains('favorite-icon')) {
            const mealId = target.dataset.id;
            const isUploaded = target.closest('.recipe-card').querySelector('.view-recipe-btn').dataset.uploaded === 'true';
            
            let mealData;
            if (isUploaded) {
                mealData = getUploadedRecipes().find(r => r.id === mealId);
            } else {
                mealData = recipeCache[mealId];
                if (!mealData) {
                    try {
                        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
                        const data = await response.json();
                        mealData = data.meals[0];
                    } catch (error) {
                        console.error("Failed to fetch meal details:", error);
                        return;
                    }
                }
            }
            if (mealData) {
                toggleFavorite(mealData, target);
            }
        }
    }
    
    function handleUploadedGridClick(event) {
        const target = event.target;
        const mealId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const recipes = getUploadedRecipes();
            const recipeToEdit = recipes.find(r => r.id === mealId);
            if (recipeToEdit) {
                uploadRecipeId.value = recipeToEdit.id;
                uploadRecipeName.value = recipeToEdit.name;
                uploadCuisine.value = recipeToEdit.cuisine;
                uploadIngredients.value = recipeToEdit.ingredients;
                uploadInstructions.value = recipeToEdit.instructions;
                fileUploadDisplay.textContent = "Choose a new image (optional)";
                document.getElementById('share-recipe-section').scrollIntoView({ behavior: 'smooth' });
                recipeUploadForm.querySelector('.submit-recipe-btn').textContent = "Update Recipe";
            }
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this recipe?')) {
                let recipes = getUploadedRecipes();
                recipes = recipes.filter(r => r.id !== mealId);
                saveUploadedRecipes(recipes);
                renderUploadedRecipes();
            }
        }
    }

    recipeGrid.addEventListener('click', handleGridClick);
    favoritesGrid.addEventListener('click', handleGridClick);
    uploadedRecipesGrid.addEventListener('click', handleGridClick); 
    uploadedRecipesGrid.addEventListener('click', handleUploadedGridClick);
    
    closeButton.addEventListener('click', () => recipeModal.style.display = "none");
    window.addEventListener('click', (e) => {
        if (e.target === recipeModal) recipeModal.style.display = "none";
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(searchInput.value);
    });
    searchIcon.addEventListener('click', () => performSearch(searchInput.value));
    clearRecentSearchesBtn.addEventListener('click', clearRecentSearches);

    async function fetchAndRenderFilteredRecipes(type, value) {
        const endpoint = type === 'cuisine' 
            ? `https://www.themealdb.com/api/json/v1/1/filter.php?a=${value}`
            : `https://www.themealdb.com/api/json/v1/1/filter.php?c=${value}`;
            
        recipeGrid.innerHTML = `<p>Loading ${value} recipes...</p>`;
        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            
            recipeGrid.innerHTML = "";
            if (data.meals) {
                const mealPromises = data.meals.slice(0, 12).map(async (summary) => {
                    const detailResponse = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${summary.idMeal}`);
                    const detailData = await detailResponse.json();
                    return detailData.meals[0];
                });
                const detailedMeals = await Promise.all(mealPromises);
                recipeCache = {}; 
                detailedMeals.forEach(meal => {
                    if (meal) {
                        recipeCache[meal.idMeal] = meal;
                        renderRecipeCard(meal, recipeGrid);
                    }
                });
            } else {
                recipeGrid.innerHTML = `<p>No recipes found for this ${type}.</p>`;
            }
        } catch (error) {
            console.error(`Failed to fetch by ${type}:`, error);
            recipeGrid.innerHTML = "<p>Failed to load recipes.</p>";
        }
    }
    
    cuisineFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        dietaryFilter.value = ""; 
        value ? fetchAndRenderFilteredRecipes('cuisine', value) : fetchRecipes();
    });

    // UPDATED: Event listener for dietary filter now handles Gluten-Free
    dietaryFilter.addEventListener('change', (e) => {
        const value = e.target.value;
        cuisineFilter.value = ""; 
        if (!value) {
            fetchRecipes();
        } else if (value === 'Gluten-Free') {
            fetchGlutenFreeRecipes(); // Call our new function
        } else {
            fetchAndRenderFilteredRecipes('diet', value); // Call the old function for Vegan/Vegetarian
        }
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

        const handleImageData = (imageData) => {
            let recipes = getUploadedRecipes();
            if (editingId) { 
                const recipeIndex = recipes.findIndex(r => r.id === editingId);
                if (recipeIndex > -1) {
                    recipes[recipeIndex].name = name;
                    recipes[recipeIndex].cuisine = cuisine;
                    recipes[recipeIndex].ingredients = ingredients;
                    recipes[recipeIndex].instructions = instructions;
                    if (imageData) {
                        recipes[recipeIndex].image = imageData;
                    }
                }
                uploadMessage.textContent = 'Recipe updated successfully!';
            } else { 
                const newRecipe = {
                    id: generateUniqueId(), name, cuisine, ingredients, instructions,
                    image: imageData, isUploaded: true
                };
                recipes.unshift(newRecipe);
                uploadMessage.textContent = 'Recipe uploaded successfully!';
                document.getElementById('my-uploaded-recipes-section').scrollIntoView({ behavior: 'smooth' });
            }

            saveUploadedRecipes(recipes);
            renderUploadedRecipes();

            uploadMessage.className = 'upload-message success';
            recipeUploadForm.reset();
            uploadRecipeId.value = '';
            fileUploadDisplay.textContent = 'No file chosen';
            recipeUploadForm.querySelector('.submit-recipe-btn').textContent = "Share Recipe";
            setTimeout(() => { uploadMessage.textContent = ''; }, 4000);
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (event) => handleImageData(event.target.result);
            reader.onerror = () => {
                uploadMessage.textContent = 'Failed to read image file.';
                uploadMessage.className = 'upload-message error';
            };
            reader.readAsDataURL(imageFile);
        } else {
            handleImageData(null);
        }
    });

    window.onscroll = () => {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            backToTopBtn.style.display = "block";
        } else {
            backToTopBtn.style.display = "none";
        }
    };

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- INITIALIZATION ---
    fetchRecipes();
    renderRecentSearches();
    renderFavorites();
    renderUploadedRecipes();
});