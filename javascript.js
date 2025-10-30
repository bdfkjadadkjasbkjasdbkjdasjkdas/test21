// База данных в LocalStorage
class Database {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.feedbacks = JSON.parse(localStorage.getItem('feedbacks')) || [];
        this.profileViews = JSON.parse(localStorage.getItem('profileViews')) || {};
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    saveFeedbacks() {
        localStorage.setItem('feedbacks', JSON.stringify(this.feedbacks));
    }

    saveProfileViews() {
        localStorage.setItem('profileViews', JSON.stringify(this.profileViews));
    }

    saveCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    clearCurrentUser() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    registerUser(userData) {
        // Проверяем уникальность имени пользователя и ссылки
        const existingUser = this.users.find(u => 
            u.username === userData.username || 
            u.profileLink === userData.profileLink ||
            u.email === userData.email
        );

        if (existingUser) {
            if (existingUser.username === userData.username) {
                throw new Error('Пользователь с таким именем уже существует');
            }
            if (existingUser.profileLink === userData.profileLink) {
                throw new Error('Эта ссылка уже занята');
            }
            if (existingUser.email === userData.email) {
                throw new Error('Пользователь с таким email уже существует');
            }
        }

        // Валидация ссылки профиля
        if (!/^[a-zA-Z0-9-]+$/.test(userData.profileLink)) {
            throw new Error('Ссылка может содержать только английские буквы, цифры и дефисы');
        }

        const newUser = {
            id: Date.now(),
            username: userData.username,
            profileLink: userData.profileLink.toLowerCase(),
            email: userData.email,
            password: this.hashPassword(userData.password),
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        return newUser;
    }

    loginUser(login, password) {
        const user = this.users.find(u => 
            u.username === login || u.email === login
        );

        if (!user) {
            throw new Error('Пользователь не найден');
        }

        if (user.password !== this.hashPassword(password)) {
            throw new Error('Неверный пароль');
        }

        return user;
    }

    getUserByProfileLink(profileLink) {
        return this.users.find(u => u.profileLink === profileLink.toLowerCase());
    }

    addFeedback(profileLink, feedbackData) {
        const feedback = {
            id: Date.now(),
            profileLink: profileLink.toLowerCase(),
            text: feedbackData.text,
            rating: parseInt(feedbackData.rating) || 0,
            createdAt: new Date().toISOString(),
            isAnonymous: true
        };

        this.feedbacks.push(feedback);
        this.saveFeedbacks();
        return feedback;
    }

    getFeedbacks(profileLink) {
        return this.feedbacks
            .filter(f => f.profileLink === profileLink.toLowerCase())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getFeedbackCount(profileLink) {
        return this.getFeedbacks(profileLink).length;
    }

    incrementProfileView(profileLink) {
        if (!this.profileViews[profileLink]) {
            this.profileViews[profileLink] = 0;
        }
        this.profileViews[profileLink]++;
        this.saveProfileViews();
    }

    getProfileViews(profileLink) {
        return this.profileViews[profileLink] || 0;
    }

    hashPassword(password) {
        return btoa(unescape(encodeURIComponent(password)));
    }
}

// Инициализация базы данных
const db = new Database();

// Элементы DOM
const registerSection = document.getElementById('registerSection');
const loginSection = document.getElementById('loginSection');
const userSection = document.getElementById('userSection');
const feedbackSection = document.getElementById('feedbackSection');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const feedbackForm = document.getElementById('feedbackForm');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const showLoginLink = document.getElementById('showLoginLink');
const showRegisterLink = document.getElementById('showRegisterLink');
const logoutBtn = document.getElementById('logoutBtn');
const viewFeedbackBtn = document.getElementById('viewFeedbackBtn');
const backToProfileBtn = document.getElementById('backToProfileBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const profileLinkDisplay = document.getElementById('profileLinkDisplay');
const feedbackList = document.getElementById('feedbackList');
const emptyFeedback = document.getElementById('emptyFeedback');
const feedbackModal = document.getElementById('feedbackModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const stars = document.querySelectorAll('.star');
const feedbackRating = document.getElementById('feedbackRating');

let currentRating = 0;

// Показать сообщение
function showMessage(element, text) {
    element.textContent = text;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 4000);
}

// Очистка полей формы
function clearForm(form) {
    form.reset();
    currentRating = 0;
    updateStars();
}

// Показать блок регистрации
function showRegister() {
    registerSection.style.display = 'block';
    loginSection.style.display = 'none';
    userSection.style.display = 'none';
    feedbackSection.style.display = 'none';
    clearForm(registerForm);
    clearForm(loginForm);
}

// Показать блок входа
function showLogin() {
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
    userSection.style.display = 'none';
    feedbackSection.style.display = 'none';
    clearForm(registerForm);
    clearForm(loginForm);
}

// Показать блок пользователя
function showUser(user) {
    registerSection.style.display = 'none';
    loginSection.style.display = 'none';
    userSection.style.display = 'block';
    feedbackSection.style.display = 'none';

    document.getElementById('userName').textContent = user.username;
    document.getElementById('userEmail').textContent = user.email;
    
    const avatarUrl = `https://i.pravatar.cc/150?u=${user.id}`;
    document.getElementById('userAvatar').src = avatarUrl;

    // Обновляем ссылку и статистику
    const fullLink = `${window.location.origin}?profile=${user.profileLink}`;
    profileLinkDisplay.value = fullLink;
    
    const feedbackCount = db.getFeedbackCount(user.profileLink);
    const profileViews = db.getProfileViews(user.profileLink);
    
    document.getElementById('feedbackCount').textContent = feedbackCount;
    document.getElementById('profileViews').textContent = profileViews;
}

// Показать блок отзывов
function showFeedback() {
    registerSection.style.display = 'none';
    loginSection.style.display = 'none';
    userSection.style.display = 'none';
    feedbackSection.style.display = 'block';

    const user = db.currentUser;
    const feedbacks = db.getFeedbacks(user.profileLink);
    
    if (feedbacks.length === 0) {
        emptyFeedback.style.display = 'block';
        feedbackList.style.display = 'none';
    } else {
        emptyFeedback.style.display = 'none';
        feedbackList.style.display = 'block';
        renderFeedbacks(feedbacks);
    }
}

// Рендер отзывов
function renderFeedbacks(feedbacks) {
    feedbackList.innerHTML = '';
    
    feedbacks.forEach(feedback => {
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'feedback-item';
        
        const stars = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
        const date = new Date(feedback.createdAt).toLocaleDateString('ru-RU');
        
        feedbackElement.innerHTML = `
            <div class="feedback-text">${feedback.text}</div>
            <div class="feedback-meta">
                <span class="feedback-rating">${stars}</span>
                <span class="feedback-date">${date}</span>
            </div>
        `;
        
        feedbackList.appendChild(feedbackElement);
    });
}

// Обновление звезд рейтинга
function updateStars() {
    stars.forEach((star, index) => {
        if (index < currentRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    feedbackRating.value = currentRating;
}

// Копирование ссылки
function copyProfileLink() {
    profileLinkDisplay.select();
    document.execCommand('copy');
    
    // Визуальный feedback
    const originalText = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
    copyLinkBtn.style.background = 'var(--success)';
    
    setTimeout(() => {
        copyLinkBtn.innerHTML = originalText;
        copyLinkBtn.style.background = '';
    }, 2000);
}

// Выход из системы
function logout() {
    db.clearCurrentUser();
    showRegister();
    showMessage(successMessage, 'Вы успешно вышли из системы!');
}

// Обработчик регистрации
registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const userData = {
        username: formData.get('username').trim(),
        profileLink: formData.get('profileLink').trim(),
        email: formData.get('email').trim(),
        password: formData.get('password')
    };

    try {
        if (!userData.username || !userData.profileLink || !userData.email || !userData.password) {
            throw new Error('Все поля обязательны для заполнения');
        }

        if (userData.password.length < 6) {
            throw new Error('Пароль должен быть не менее 6 символов');
        }

        if (!userData.email.includes('@')) {
            throw new Error('Введите корректный email');
        }

        const newUser = db.registerUser(userData);
        db.saveCurrentUser(newUser);
        showUser(newUser);
        showMessage(successMessage, '🎉 Профиль создан! Теперь делитесь ссылкой для получения отзывов!');
        clearForm(registerForm);

    } catch (error) {
        showMessage(errorMessage, `❌ ${error.message}`);
    }
});

// Обработчик входа
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const loginData = {
        login: formData.get('username').trim(),
        password: formData.get('password')
    };

    try {
        if (!loginData.login || !loginData.password) {
            throw new Error('Заполните все поля');
        }

        const user = db.loginUser(loginData.login, loginData.password);
        db.saveCurrentUser(user);
        showUser(user);
        showMessage(successMessage, '✅ Вход выполнен успешно!');
        clearForm(loginForm);
    } catch (error) {
        showMessage(errorMessage, `❌ ${error.message}`);
    }
});

// Обработчик отправки отзыва
feedbackForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const feedbackData = {
        text: formData.get('feedback').trim(),
        rating: formData.get('rating')
    };

    try {
        if (!feedbackData.text) {
            throw new Error('Введите текст отзыва');
        }

        // Получаем profileLink из URL
        const urlParams = new URLSearchParams(window.location.search);
        const profileLink = urlParams.get('profile');
        
        if (!profileLink) {
            throw new Error('Неверная ссылка профиля');
        }

        db.addFeedback(profileLink, feedbackData);
        showMessage(successMessage, '✅ Ваш отзыв отправлен анонимно!');
        clearForm(feedbackForm);
        feedbackModal.style.display = 'none';
        
    } catch (error) {
        showMessage(errorMessage, `❌ ${error.message}`);
    }
});

// Обработчики звезд рейтинга
stars.forEach(star => {
    star.addEventListener('click', function() {
        currentRating = parseInt(this.dataset.rating);
        updateStars();
    });
});

// Назначение обработчиков событий
showLoginLink.addEventListener('click', showLogin);
showRegisterLink.addEventListener('click', showRegister);
logoutBtn.addEventListener('click', logout);
viewFeedbackBtn.addEventListener('click', showFeedback);
backToProfileBtn.addEventListener('click', () => showUser(db.currentUser));
copyLinkBtn.addEventListener('click', copyProfileLink);
closeModalBtn.addEventListener('click', () => {
    feedbackModal.style.display = 'none';
    clearForm(feedbackForm);
});

// Закрытие модального окна при клике вне его
window.addEventListener('click', function(e) {
    if (e.target === feedbackModal) {
        feedbackModal.style.display = 'none';
        clearForm(feedbackForm);
    }
});

// Проверка параметров URL для отображения формы отзыва
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileLink = urlParams.get('profile');
    
    if (profileLink) {
        const user = db.getUserByProfileLink(profileLink);
        if (user) {
            // Показываем модальное окно для отзыва
            feedbackModal.style.display = 'flex';
            db.incrementProfileView(profileLink);
        } else {
            showMessage(errorMessage, '❌ Профиль не найден');
        }
    }
}

// Проверить авторизацию при загрузке
function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileLink = urlParams.get('profile');
    
    if (profileLink) {
        // Если есть параметр profile, показываем форму отзыва
        checkUrlParams();
    } else if (db.currentUser) {
        // Если пользователь авторизован, показываем его профиль
        const userExists = db.users.find(u => u.id === db.currentUser.id);
        if (userExists) {
            showUser(db.currentUser);
        } else {
            db.clearCurrentUser();
            showRegister();
        }
    } else {
        showRegister();
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});
