 // Переключение вкладок: кнопки сверху и ссылки в подвале форм работают одинаково
        function switchTab(tabName) {
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const tabButtons = document.querySelectorAll('.tab-btn');

            tabButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            loginForm.style.display = tabName === 'login' ? 'block' : 'none';
            registerForm.style.display = tabName === 'register' ? 'block' : 'none';
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        document.querySelectorAll('.switch-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(link.dataset.tab);
            });
        });

        // Заглушки отправки — здесь позже подключится бэкенд
        document.getElementById('login-form').addEventListener('submit', function (e) {
            e.preventDefault();
            alert('Форма входа отправлена (демо). Здесь будет запрос к API.');
        });

        document.getElementById('register-form').addEventListener('submit', function (e) {
            e.preventDefault();
            alert('Форма регистрации отправлена (демо). Здесь будет запрос к API.');
        });