// Конфигурация JSONBin.io
const JSONBIN_API_URL = 'https://api.jsonbin.io/v3/b';
const JSONBIN_API_KEY = '$2a$10$TDffkTPxg.WQS47lRfa/ce2VaFi2cChpCCc3P0TvPeGYQdgkzZvna';
let BIN_ID = null;

// Локальные данные (кэш)
let cloudData = {
    users: {},
    feedbacks: {},
    profileViews: {}
};

// Текущий пользователь
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentRating = 0;

// ==================== JSONBin.io ФУНКЦИИ ====================

// Создать новую bin
async function createBin() {
    try {
        const response = await fetch(JSONBIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY,
                'X-Bin-Name': 'FeedbackMe Users Database'
            },
            body: JSON.stringify(cloudData)
        });
        
        const result = await response.json();
        BIN_ID = result.metadata.id;
        localStorage.setItem('jsonbin_id', BIN_ID);
        console.log('Bin created:', BIN_ID);
        return BIN_ID;
    } catch (error) {
        console.error('Error creating bin:', error);
        return null;
    }
}

// Загрузить данные из bin
async function loadFromCloud() {
    try {
        if (!BIN_ID) {
            BIN_ID = localStorage.getItem('jsonbin_id');
        }
        
        if (!BIN_ID) {
            return await createBin();
        }
        
        const response = await fetch(`${JSONBIN_API_URL}/${BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        
        const result = await response.json();
        cloudData = result.record;
        console.log('Data loaded from cloud:', cloudData);
        return true;
    } catch (error) {
        console.error('Error loading from cloud:', error);
        return await createBin();
    }
}

// Сохранить данные в bin
async function saveToCloud() {
    try {
        if (!BIN_ID) {
            BIN_ID = await createBin();
        }
        
        const response = await fetch(`${JSONBIN_API_URL}/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(cloudData)
        });
        
        const result = await response.json();
        console.log('Data saved to cloud:', result);
        return true;
    } catch (error) {
        console.error('Error saving to cloud:', error);
        return false;
    }
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Получить пользователя по ссылке
function getUserByProfileLink(profileLink) {
    return cloudData.users[profileLink];
}

// Создать пользователя
async function createUser(userData) {
    const newUser = {
        id: Date.now(),
        ...userData,
        createdAt: new Date().toISOString()
    };
    
    cloudData.users[userData.profileLink] = newUser;
    const success = await saveToCloud();
    
    if (success) {
        return newUser;
    } else {
        throw new Error('Ошибка сохранения в облако');
    }
}

// Добавить отзыв
async function addFeedback(profileLink, feedbackData) {
    if (!cloudData.feedbacks[profileLink]) {
        cloudData.feedbacks[profileLink] = [];
    }
    
    const feedback = {
        id: Date.now(),
        profileLink: profileLink,
        text: feedbackData.text,
        rating: feedbackData.rating,
        createdAt: new Date().toISOString()
    };
    
    cloudData.feedbacks[profileLink].push(feedback);
    
    if (!cloudData.profileViews[profileLink]) {
        cloudData.profileViews[profileLink] = 0;
    }
    cloudData.profileViews[profileLink]++;
    
    await saveToCloud();
    return feedback;
}

// Получить отзывы пользователя
function getFeedbacks(profileLink) {
    return cloudData.feedbacks[profileLink] || [];
}

// Показать сообщение
function showMessage(element, text) {
    if (element) {
        element.textContent = text;
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 5000);
    }
}

// Показать регистрацию
function showRegister() {
    document.getElementById('registerSection').style.display = 'block';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('feedbackSection').style.display = 'none';
}

// Показать вход
function showLogin() {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('feedbackSection').style.display = 'none';
}

// Показать профиль пользователя
function showUser(user) {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userSection').style.display = 'block';
    document.getElementById('feedbackSection').style.display = 'none';

    document.getElementById('userName').textContent = user.username;
    document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?u=${user.id}`;

    const fullLink = `${window.location.origin}${window.location.pathname}?profile=${user.profileLink}`;
    document.getElementById('profileLinkDisplay').value = fullLink;
    
    const userFeedbacks = getFeedbacks(user.profileLink);
    document.getElementById('feedbackCount').textContent = userFeedbacks.length;
    document.getElementById('profileViews').textContent = cloudData.profileViews[user.profileLink] || 0;
}

// Показать отзывы
function showFeedback() {
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('feedbackSection').style.display = 'block';

    const userFeedbacks = getFeedbacks(currentUser.profileLink)
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const feedbackList = document.getElementById('feedbackList');
    const emptyFeedback = document.getElementById('emptyFeedback');

    if (userFeedbacks.length === 0) {
        emptyFeedback.style.display = 'block';
        feedbackList.innerHTML = '';
    } else {
        emptyFeedback.style.display = 'none';
        feedbackList.innerHTML = userFeedbacks.map(feedback => `
            <div class="feedback-item">
                <div class="feedback-text">${feedback.text}</div>
                <div class="feedback-meta">
                    <span class="feedback-rating">${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}</span>
                    <span>${new Date(feedback.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>
        `).join('');
    }
}

// Установить рейтинг
function setRating(rating) {
    currentRating = rating;
    document.getElementById('feedbackRating').value = rating;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

// Копировать ссылку
function copyProfileLink() {
    const linkInput = document.getElementById('profileLinkDisplay');
    linkInput.select();
    document.execCommand('copy');
    showMessage(document.getElementById('successMessage'), '✅ Ссылка скопирована!');
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('feedbackModal').style.display = 'none';
    document.getElementById('feedbackForm').reset();
    currentRating = 0;
    setRating(0);
}

// Выход
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showRegister();
    showMessage(document.getElementById('successMessage'), 'Вы вышли из системы');
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

// Регистрация
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    const userData = {
        username: formData.get('username').trim(),
        profileLink: formData.get('profileLink').trim().toLowerCase(),
        email: formData.get('email').trim(),
        password: formData.get('password')
    };

    try {
        if (getUserByProfileLink(userData.profileLink)) {
            throw new Error('Эта ссылка уже занята');
        }
        if (!/^[a-z0-9-]+$/.test(userData.profileLink)) {
            throw new Error('Ссылка может содержать только английские буквы, цифры и дефисы');
        }

        const newUser = await createUser(userData);
        
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        showUser(newUser);
        showMessage(document.getElementById('successMessage'), '🎉 Профиль создан! Теперь ссылка доступна везде!');
        this.reset();

    } catch (error) {
        showMessage(document.getElementById('errorMessage'), error.message);
    }
});

// Вход
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    const login = formData.get('username').trim();
    const password = formData.get('password');

    // Ищем пользователя по имени или email
    const user = Object.values(cloudData.users).find(u => 
        u.username === login || u.email === login
    );
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showUser(user);
        showMessage(document.getElementById('successMessage'), '✅ Вход выполнен!');
        this.reset();
    } else {
        showMessage(document.getElementById('errorMessage'), 'Пользователь не найден');
    }
});

// Отправка отзыва
document.getElementById('feedbackForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    const urlParams = new URLSearchParams(window.location.search);
    const profileLink = urlParams.get('profile');

    if (profileLink) {
        const user = getUserByProfileLink(profileLink);
        if (user) {
            const feedbackData = {
                text: formData.get('feedback'),
                rating: currentRating
            };

            await addFeedback(profileLink, feedbackData);
            showMessage(document.getElementById('successMessage'), '✅ Отзыв отправлен!');
            closeModal();
        } else {
            showMessage(document.getElementById('errorMessage'), 'Профиль не найден');
        }
    }
});

// Проверка URL параметров
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileLink = urlParams.get('profile');

    if (profileLink) {
        const user = getUserByProfileLink(profileLink);
        if (user) {
            document.getElementById('feedbackModal').style.display = 'flex';
            if (!cloudData.profileViews[profileLink]) {
                cloudData.profileViews[profileLink] = 0;
            }
            cloudData.profileViews[profileLink]++;
            saveToCloud(); // Сохраняем просмотр
        } else {
            showMessage(document.getElementById('errorMessage'), 
                `Профиль "${profileLink}" не найден. Создайте его сначала.`);
        }
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Инициализация приложения
async function init() {
    console.log('Initializing app...');
    
    // Загружаем данные из облака
    await loadFromCloud();
    
    if (currentUser) {
        showUser(currentUser);
    } else {
        showRegister();
    }
    
    checkUrlParams();
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', init);

// Глобальные функции для HTML
window.showRegister = showRegister;
window.showLogin = showLogin;
window.showUser = showUser;
window.showFeedback = showFeedback;
window.logout = logout;
window.copyProfileLink = copyProfileLink;
window.closeModal = closeModal;
window.setRating = setRating;
