// Supabase конфигурация
const SUPABASE_URL = 'https://ztoswmpulbewadjvdfuu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0b3N3bXB1bGJld2FkanZkZnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MzQ0OTgsImV4cCI6MjA3NzQxMDQ5OH0.GY6yJ6zKrH-rJbtUmhAe5SJ3UE8AxADtTf1a2uwL7ys';

// Создаем клиент Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Текущий пользователь
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentRating = 0;

// ==================== SUPABASE ФУНКЦИИ ====================

// Создать пользователя
async function createUser(userData) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([
                {
                    username: userData.username,
                    profile_link: userData.profileLink,
                    email: userData.email
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Получить пользователя по ссылке
async function getUserByProfileLink(profileLink) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('profile_link', profileLink)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 - не найден
        return data;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Добавить отзыв
async function addFeedback(profileLink, feedbackData) {
    try {
        const { data, error } = await supabaseClient
            .from('feedbacks')
            .insert([
                {
                    profile_link: profileLink,
                    text: feedbackData.text,
                    rating: feedbackData.rating
                }
            ])
            .select();

        if (error) throw error;

        // Обновляем счетчик просмотров
        await incrementProfileViews(profileLink);
        
        return data[0];
    } catch (error) {
        console.error('Error adding feedback:', error);
        throw error;
    }
}

// Увеличить счетчик просмотров
async function incrementProfileViews(profileLink) {
    try {
        // Сначала проверяем существует ли запись
        const { data: existing } = await supabaseClient
            .from('profile_views')
            .select('*')
            .eq('profile_link', profileLink)
            .single();

        if (existing) {
            // Обновляем существующую запись
            const { error } = await supabaseClient
                .from('profile_views')
                .update({ views_count: existing.views_count + 1 })
                .eq('profile_link', profileLink);
            if (error) throw error;
        } else {
            // Создаем новую запись
            const { error } = await supabaseClient
                .from('profile_views')
                .insert([{ profile_link: profileLink, views_count: 1 }]);
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error updating views:', error);
    }
}

// Получить отзывы пользователя
async function getFeedbacks(profileLink) {
    try {
        const { data, error } = await supabaseClient
            .from('feedbacks')
            .select('*')
            .eq('profile_link', profileLink)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting feedbacks:', error);
        return [];
    }
}

// Получить количество просмотров
async function getProfileViews(profileLink) {
    try {
        const { data, error } = await supabaseClient
            .from('profile_views')
            .select('views_count')
            .eq('profile_link', profileLink)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? data.views_count : 0;
    } catch (error) {
        console.error('Error getting views:', error);
        return 0;
    }
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

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
async function showUser(user) {
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userSection').style.display = 'block';
    document.getElementById('feedbackSection').style.display = 'none';

    document.getElementById('userName').textContent = user.username;
    document.getElementById('userAvatar').src = `https://i.pravatar.cc/150?u=${user.id}`;

    const fullLink = `${window.location.origin}${window.location.pathname}?profile=${user.profile_link}`;
    document.getElementById('profileLinkDisplay').value = fullLink;
    
    // Загружаем статистику
    const userFeedbacks = await getFeedbacks(user.profile_link);
    const viewsCount = await getProfileViews(user.profile_link);
    
    document.getElementById('feedbackCount').textContent = userFeedbacks.length;
    document.getElementById('profileViews').textContent = viewsCount;
}

// Показать отзывы
async function showFeedback() {
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('feedbackSection').style.display = 'block';

    const userFeedbacks = await getFeedbacks(currentUser.profile_link);

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
                    <span>${new Date(feedback.created_at).toLocaleDateString('ru-RU')}</span>
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
        // Проверяем, свободна ли ссылка
        const existingUser = await getUserByProfileLink(userData.profileLink);
        if (existingUser) {
            throw new Error('Эта ссылка уже занята');
        }

        if (!/^[a-z0-9-]+$/.test(userData.profileLink)) {
            throw new Error('Ссылка может содержать только английские буквы, цифры и дефисы');
        }

        const newUser = await createUser(userData);
        
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        await showUser(newUser);
        showMessage(document.getElementById('successMessage'), '🎉 Профиль создан! Теперь ссылка доступна везде!');
        this.reset();

    } catch (error) {
        showMessage(document.getElementById('errorMessage'), error.message);
    }
});

// Вход
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    const login = formData.get('username').trim();

    try {
        // Ищем пользователя по имени
        const user = await getUserByProfileLink(login);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            await showUser(user);
            showMessage(document.getElementById('successMessage'), '✅ Вход выполнен!');
            this.reset();
        } else {
            showMessage(document.getElementById('errorMessage'), 'Пользователь не найден');
        }
    } catch (error) {
        showMessage(document.getElementById('errorMessage'), 'Ошибка при входе');
    }
});

// Отправка отзыва
document.getElementById('feedbackForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    const urlParams = new URLSearchParams(window.location.search);
    const profileLink = urlParams.get('profile');

    if (profileLink) {
        try {
            const user = await getUserByProfileLink(profileLink);
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
        } catch (error) {
            showMessage(document.getElementById('errorMessage'), 'Ошибка при отправке отзыва');
        }
    }
});

// Проверка URL параметров
async function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileLink = urlParams.get('profile');

    if (profileLink) {
        try {
            const user = await getUserByProfileLink(profileLink);
            if (user) {
                document.getElementById('feedbackModal').style.display = 'flex';
                await incrementProfileViews(profileLink);
            } else {
                showMessage(document.getElementById('errorMessage'), 
                    `Профиль "${profileLink}" не найден. Создайте его сначала.`);
            }
        } catch (error) {
            showMessage(document.getElementById('errorMessage'), 'Ошибка при загрузке профиля');
        }
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

// Инициализация приложения
async function init() {
    console.log('Initializing app with Supabase...');
    
    if (currentUser) {
        await showUser(currentUser);
    } else {
        showRegister();
    }
    
    await checkUrlParams();
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
