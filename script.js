const API_KEY = '2f774ae811ade7367b71b11fe4286b8d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ORIGINAL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

// DOM Elements
const moviesContainer = document.getElementById('movies-grid');
const myListContainer = document.getElementById('mylist-container');
const categoryChips = document.querySelectorAll('.cat-chip');
const navBtns = document.querySelectorAll('.nav-btn');
const pageSections = document.querySelectorAll('.page-section');
const modal = document.getElementById('movie-modal');
const closeModal = document.querySelector('.close-modal');
const modalBody = document.getElementById('modal-body');
const searchInput = document.getElementById('search-input');

// Auth Elements
const authModal = document.getElementById('auth-modal');
const navLoginBtn = document.getElementById('nav-login-btn');
const profileMenu = document.getElementById('profile-menu');
const logoutBtn = document.getElementById('logout-btn');
const closeAuth = document.getElementById('close-auth');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginFormEl = document.getElementById('login-form-el');
const registerFormEl = document.getElementById('register-form-el');

// Profile Modal Elements
const profileModal = document.getElementById('profile-modal');
const closeProfile = document.getElementById('close-profile');
const myProfileLink = document.getElementById('my-profile-link');
const profileLogoutBtn = document.getElementById('profile-logout-btn');

// Video Modal Elements
const videoModal = document.getElementById('video-modal');
const closeVideo = document.getElementById('close-video');
const videoContainer = document.getElementById('video-container');

// Confirmation Modal Elements
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationMsg = document.getElementById('confirmation-msg');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

// State
let currentCategory = 'all';
let currentUser = JSON.parse(localStorage.getItem('bob_user')) || null;
let myList = JSON.parse(localStorage.getItem('bob_mylist')) || [];
let pendingConfirmAction = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    fetchMovies();
    setupEventListeners();
    if (currentUser) {
        renderMyList();
    }
});

function setupEventListeners() {
    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            if (target === 'mylist' && !currentUser) {
                authModal.style.display = 'flex';
                return;
            }

            // Update UI
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            pageSections.forEach(section => {
                section.classList.remove('active');
                section.classList.add('hidden');
                if (section.id === target) {
                    section.classList.remove('hidden');
                    section.classList.add('active');
                }
            });

            if (target === 'mylist') {
                renderMyList();
            }
        });
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        searchTimeout = setTimeout(() => {
            if (query.length > 0) {
                // Switch to home view if not already
                document.querySelector('.nav-btn[data-target="home"]').click();
                searchMovies(query);
            } else {
                fetchMovies();
            }
        }, 500);
    });

    // Categories
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const lang = chip.dataset.lang;
            const genre = chip.dataset.genre;

            // Clear search
            searchInput.value = '';

            if (genre) {
                fetchMoviesByGenre(genre);
            } else {
                fetchMovies(lang);
            }
        });
    });

    // Modals
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    closeVideo.addEventListener('click', () => {
        videoModal.style.display = 'none';
        videoContainer.innerHTML = ''; // Stop video
    });

    closeProfile.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });

    // Profile Menu Toggle
    if (profileMenu) {
        profileMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = profileMenu.querySelector('.dropdown-content');
            if (content) {
                content.classList.toggle('show');
                profileMenu.classList.toggle('active');
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === authModal) authModal.style.display = 'none';
        if (e.target === videoModal) {
            videoModal.style.display = 'none';
            videoContainer.innerHTML = '';
        }
        if (e.target === confirmationModal) confirmationModal.style.display = 'none';
        if (e.target === profileModal) profileModal.style.display = 'none';

        // Close profile dropdown if clicked outside
        if (profileMenu && !profileMenu.contains(e.target)) {
            const content = profileMenu.querySelector('.dropdown-content');
            if (content) {
                content.classList.remove('show');
                profileMenu.classList.remove('active');
            }
        }
    });

    // Auth Logic
    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', () => {
            authModal.style.display = 'flex';
        });
    }

    if (closeAuth) {
        closeAuth.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    if (myProfileLink) {
        myProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showProfile();
        });
    }

    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', () => {
            logout();
            profileModal.style.display = 'none';
        });
    }

    // Form Submissions
    loginFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginFormEl.querySelector('input[type="email"]').value;
        login(email);
    });

    registerFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerFormEl.querySelector('input[type="email"]').value;
        const name = registerFormEl.querySelector('input[type="text"]').value;
        login(email, name);
    });

    // Confirmation Modal Logic
    confirmYes.addEventListener('click', () => {
        if (pendingConfirmAction) {
            pendingConfirmAction();
            pendingConfirmAction = null;
        }
        confirmationModal.style.display = 'none';
    });

    confirmNo.addEventListener('click', () => {
        pendingConfirmAction = null;
        confirmationModal.style.display = 'none';
    });
}

// Auth Functions
function login(email, name = 'User') {
    currentUser = { email, name };
    localStorage.setItem('bob_user', JSON.stringify(currentUser));
    updateAuthUI();
    authModal.style.display = 'none';
    loginFormEl.reset();
    registerFormEl.reset();
    if (myList.length > 0) renderMyList();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('bob_user');
    updateAuthUI();
    // Go to home if on mylist
    document.querySelector('.nav-btn[data-target="home"]').click();
}

function updateAuthUI() {
    if (currentUser) {
        navLoginBtn.classList.add('hidden');
        profileMenu.classList.remove('hidden');
        document.querySelector('.user-name').textContent = currentUser.name;
        document.querySelector('.user-email').textContent = currentUser.email;
    } else {
        navLoginBtn.classList.remove('hidden');
        profileMenu.classList.add('hidden');
    }
}

function showProfile() {
    if (!currentUser) return;
    document.getElementById('profile-name-display').textContent = currentUser.name;
    document.getElementById('profile-email-display').textContent = currentUser.email;
    document.getElementById('profile-modal-img').src = `https://ui-avatars.com/api/?name=${currentUser.name}&background=e50914&color=fff`;
    profileModal.style.display = 'flex';
}

// Data Fetching
async function fetchMovies(language = 'all') {
    moviesContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';

    let url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`;

    if (language !== 'all') {
        url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=${language}&sort_by=popularity.desc`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        displayMovies(data.results, moviesContainer);
    } catch (error) {
        console.error('Error fetching movies:', error);
        moviesContainer.innerHTML = '<p>Error loading movies. Please try again later.</p>';
    }
}

async function fetchMoviesByGenre(genreId) {
    moviesContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        displayMovies(data.results, moviesContainer);
    } catch (error) {
        console.error('Error fetching movies:', error);
    }
}

async function searchMovies(query) {
    moviesContainer.innerHTML = '<div class="loading-spinner">Searching...</div>';
    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        displayMovies(data.results, moviesContainer);
    } catch (error) {
        console.error('Error searching movies:', error);
        moviesContainer.innerHTML = '<p>Error searching movies.</p>';
    }
}

function displayMovies(movies, container, isMyList = false) {
    container.innerHTML = '';

    if (!movies || movies.length === 0) {
        container.innerHTML = '<p>No movies found.</p>';
        return;
    }

    movies.forEach(movie => {
        if (!movie.poster_path) return; // Skip movies without posters

        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');

        const posterPath = `${IMAGE_BASE_URL}${movie.poster_path}`;

        let removeBtnHTML = '';
        if (isMyList) {
            removeBtnHTML = `<button class="card-remove-btn" title="Remove from list"><i class="fas fa-trash"></i></button>`;
        }

        movieCard.innerHTML = `
            <img src="${posterPath}" alt="${movie.title}" class="movie-poster">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${new Date(movie.release_date).getFullYear() || 'N/A'}</span>
                    <span class="rating"><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}</span>
                </div>
            </div>
            ${removeBtnHTML}
        `;

        // Click on card opens details
        movieCard.addEventListener('click', (e) => {
            // Prevent opening details if clicking the remove button
            if (e.target.closest('.card-remove-btn')) return;
            showMovieDetails(movie.id);
        });

        // Remove button click
        if (isMyList) {
            const removeBtn = movieCard.querySelector('.card-remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    confirmRemoveFromMyList(movie);
                });
            }
        }

        container.appendChild(movieCard);
    });
}

// My List Logic
function showConfirmation(message, action) {
    confirmationMsg.textContent = message;
    pendingConfirmAction = action;
    confirmationModal.style.display = 'flex';
}

function confirmAddToMyList(movie) {
    if (!currentUser) {
        authModal.style.display = 'flex';
        return;
    }
    showConfirmation("You want to add this movie into your list?", () => {
        addToMyList(movie);
    });
}

function confirmRemoveFromMyList(movie) {
    showConfirmation("You want to delete this movie from your list?", () => {
        removeFromMyList(movie);
    });
}

function addToMyList(movie) {
    if (!myList.some(m => m.id === movie.id)) {
        myList.push(movie);
        localStorage.setItem('bob_mylist', JSON.stringify(myList));

        // Update button state if modal is open
        const btn = document.getElementById('add-list-btn');
        if (btn) {
            updateListButtonState(btn, true, movie);
        }
    }
}

function removeFromMyList(movie) {
    myList = myList.filter(m => m.id !== movie.id);
    localStorage.setItem('bob_mylist', JSON.stringify(myList));

    // Update button state if modal is open
    const btn = document.getElementById('add-list-btn');
    if (btn) {
        updateListButtonState(btn, false, movie);
    }

    // Refresh My List view if active
    if (document.getElementById('mylist').classList.contains('active')) {
        renderMyList();
    }
}

function renderMyList() {
    if (myList.length === 0) {
        myListContainer.innerHTML = '<p class="empty-list-msg">Your list is empty. Add movies to watch them later!</p>';
        return;
    }
    displayMovies(myList, myListContainer, true);
}

function updateListButtonState(btn, isAdded, movie) {
    // Remove old event listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    if (isAdded) {
        newBtn.innerHTML = '<i class="fas fa-minus"></i> Remove from List';
        newBtn.style.background = 'rgba(255,255,255,0.2)';
        newBtn.addEventListener('click', () => confirmRemoveFromMyList(movie));
    } else {
        newBtn.innerHTML = '<i class="fas fa-plus"></i> My List';
        newBtn.style.background = 'transparent';
        newBtn.addEventListener('click', () => confirmAddToMyList(movie));
    }
}

// Movie Details & Trailer
async function showMovieDetails(movieId) {
    modal.style.display = 'flex';
    modalBody.innerHTML = '<div class="loading-spinner">Loading details...</div>';

    try {
        const [detailsRes, creditsRes] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`)
        ]);

        const details = await detailsRes.json();
        const credits = await creditsRes.json();

        const backdropPath = details.backdrop_path
            ? `${ORIGINAL_IMAGE_BASE_URL}${details.backdrop_path}`
            : `${IMAGE_BASE_URL}${details.poster_path}`;

        const castHTML = credits.cast.slice(0, 6).map(person => `
            <div class="cast-member">
                <img src="${person.profile_path ? IMAGE_BASE_URL + person.profile_path : 'https://via.placeholder.com/100?text=User'}" 
                     alt="${person.name}" class="cast-img">
                <p class="cast-name">${person.name}</p>
            </div>
        `).join('');

        const isInList = myList.some(m => m.id === details.id);

        modalBody.innerHTML = `
            <div class="modal-hero" style="background-image: url('${backdropPath}')"></div>
            <div class="modal-details">
                <h2 class="modal-title">${details.title}</h2>
                <div class="movie-meta" style="margin-bottom: 1rem; justify-content: flex-start; gap: 1rem;">
                    <span class="rating"><i class="fas fa-star"></i> ${details.vote_average.toFixed(1)}</span>
                    <span>${details.runtime} min</span>
                    <span>${details.release_date}</span>
                </div>
                <div class="genres" style="margin-bottom: 1rem;">
                    ${details.genres.map(g => `<span style="margin-right: 10px; background: var(--primary-color); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${g.name}</span>`).join('')}
                </div>
                <p class="modal-overview">${details.overview}</p>
                
                <h3>Cast</h3>
                <div class="cast-list">
                    ${castHTML}
                </div>
                
                <div style="margin-top: 2rem;">
                    <button class="cta-btn" id="watch-trailer-btn"><i class="fas fa-play"></i> Watch Trailer</button>
                    <button class="cta-btn" id="add-list-btn" style="background: transparent; border: 1px solid white; margin-left: 1rem;"></button>
                </div>
            </div>
        `;

        // Event Listeners for buttons
        document.getElementById('watch-trailer-btn').addEventListener('click', () => playTrailer(movieId));

        const addListBtn = document.getElementById('add-list-btn');
        updateListButtonState(addListBtn, isInList, details);

    } catch (error) {
        console.error('Error fetching details:', error);
        modalBody.innerHTML = '<p>Error loading details.</p>';
    }
}

async function playTrailer(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
        const data = await response.json();

        const trailer = data.results.find(vid => vid.type === 'Trailer' && vid.site === 'YouTube') ||
            data.results.find(vid => vid.site === 'YouTube');

        if (trailer) {
            videoModal.style.display = 'flex';
            videoContainer.innerHTML = `
                <iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            `;
        } else {
            alert('Sorry, no trailer available for this movie.');
        }
    } catch (error) {
        console.error('Error fetching trailer:', error);
        alert('Error loading trailer.');
    }
}

// Helper for footer links
window.showSection = function (sectionId) {
    const btn = document.querySelector(`.nav-btn[data-target="${sectionId}"]`);
    if (btn) btn.click();
    window.scrollTo(0, 0);
};
