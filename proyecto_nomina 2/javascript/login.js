 document.addEventListener('DOMContentLoaded', () => {
                const loginForm = document.getElementById('loginForm');
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');
                const submitButton = document.getElementById('submitButton');
                const messageBox = document.getElementById('message-box');
                const togglePassword = document.getElementById('togglePassword');
                const geminiFeatureContainer = document.getElementById('gemini-feature-container');
                const getTipButton = document.getElementById('getTipButton');
                const dailyTipBox = document.getElementById('dailyTip');
                // Eliminado googleSignInButton porque no está en el HTML que me diste
                // const googleSignInButton = document.getElementById('googleSignInButton'); 

                // ** IMPORTANTE: Asegúrate de que esta URL coincida con la dirección y puerto de tu servidor Flask **
                const backendBaseUrl = 'http://127.0.0.1:5000'; 

                // Función para mostrar mensajes
                function showMessage(message, type) {
                    messageBox.textContent = message;
                    messageBox.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
                    dailyTipBox.classList.add('hidden'); // Ocultar el consejo si ya estaba visible

                    if (type === 'error') {
                        messageBox.classList.add('bg-red-100', 'text-red-800');
                        geminiFeatureContainer.classList.add('hidden'); // Ocultar la función Gemini en caso de error
                    } else if (type === 'success') {
                        messageBox.classList.add('bg-green-100', 'text-green-800');
                        geminiFeatureContainer.classList.remove('hidden'); // Mostrar la función Gemini en caso de éxito
                    }
                }

                // Función para ocultar mensajes
                function hideMessage() {
                    messageBox.classList.add('hidden');
                    geminiFeatureContainer.classList.add('hidden'); // Siempre ocultar al inicio o al limpiar
                    dailyTipBox.classList.add('hidden');
                }

                // Alternar visibilidad de contraseña
                togglePassword.addEventListener('click', () => {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    togglePassword.querySelector('i').classList.toggle('fa-eye');
                    togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
                });

                // Manejar el envío del formulario
                loginForm.addEventListener('submit', async (event) => {
                    event.preventDefault(); // Prevenir el envío por defecto del formulario

                    hideMessage(); // Ocultar mensajes anteriores y la función Gemini

                    const email = emailInput.value.trim();
                    const password = passwordInput.value.trim();

                    // Validación básica
                    if (!email || !password) {
                        showMessage('Por favor, ingresa tu correo electrónico y contraseña.', 'error');
                        return;
                    }

                    // Deshabilitar botón y mostrar spinner
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner"></span> Accediendo...';
                    // googleSignInButton.disabled = true; // Deshabilitado, ya que no existe el botón de Google en el HTML actual

                    try {
                        // *** CAMBIO CLAVE AQUÍ: Llama al backend de Flask ***
                        const response = await fetch(`${backendBaseUrl}/api/login`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ email, password })
                        });

                        const data = await response.json(); // Parsea la respuesta JSON del backend

                        if (response.ok && data.success) { // Si la respuesta HTTP es 200 y 'success' es true
                            showMessage(data.message, 'success');
                            // Redirigir si el backend proporciona la URL de redirección
                            if (data.redirect_to) {
                                window.location.href = 'dashboard.html'; // Esto redirige al navegador
                            } else {
                                console.warn("Login exitoso, pero el backend no proporcionó 'redirect_to'.");
                            }
                        } else {
                            // Si hay un error (ej. 401 Unauthorized) o 'success' es false
                            showMessage(data.message || 'Error desconocido al iniciar sesión.', 'error');
                        }

                    } catch (error) {
                        console.error('Error de red o en la solicitud al backend:', error);
                        showMessage('Ocurrió un error de conexión. Inténtalo de nuevo más tarde.', 'error');
                    } finally {
                        // Habilitar botón y restaurar texto
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Acceder';
                        // googleSignInButton.disabled = false; // Deshabilitado
                    }
                });

                // Función para obtener el consejo del día usando la API de Gemini
                getTipButton.addEventListener('click', async () => {
                    getTipButton.disabled = true;
                    getTipButton.innerHTML = '<span class="spinner"></span> Generando...';
                    dailyTipBox.classList.add('hidden'); // Ocultar consejo anterior

                    try {
                        const prompt = "Genera un consejo breve y útil (máximo 20 palabras) sobre la seguridad de los datos o la gestión de la nómina para un usuario que ha iniciado sesión en un sistema de nómina.";
                        let chatHistory = [];
                        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                        const payload = { contents: chatHistory };
                        const apiKey = ""; // La API key se proporciona automáticamente en el entorno Canvas
                        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        const result = await response.json();

                        if (result.candidates && result.candidates.length > 0 &&
                            result.candidates[0].content && result.candidates[0].content.parts &&
                            result.candidates[0].content.parts.length > 0) {
                            const text = result.candidates[0].content.parts[0].text;
                            dailyTipBox.textContent = text;
                            dailyTipBox.classList.remove('hidden');
                        } else {
                            dailyTipBox.textContent = "No se pudo generar el consejo. Inténtalo de nuevo.";
                            dailyTipBox.classList.remove('hidden');
                            console.error('Estructura de respuesta inesperada:', result);
                        }
                    } catch (error) {
                        console.error('Error al llamar a la API de Gemini:', error);
                        dailyTipBox.textContent = "Error al obtener el consejo. Revisa la consola.";
                        dailyTipBox.classList.remove('hidden');
                    } finally {
                        getTipButton.disabled = false;
                        getTipButton.innerHTML = '✨ Obtener Consejo del Día ✨';
                    }
                });
            });