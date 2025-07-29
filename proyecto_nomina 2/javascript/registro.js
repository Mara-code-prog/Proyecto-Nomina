document.getElementById('registerForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const messageBox = document.getElementById('messageBox');

        // Limpiar mensajes 
        messageBox.textContent = '';
        messageBox.classList.add('hidden');
        messageBox.classList.remove('bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');

        // Validación
        if (password !== confirmPassword) {
            messageBox.textContent = 'Las contraseñas no coinciden.';
            messageBox.classList.remove('hidden');
            messageBox.classList.add('bg-red-100', 'text-red-800');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                messageBox.textContent = 'Registro exitoso en Tu Nómina. ¡Ya puedes iniciar sesión!';
                messageBox.classList.remove('hidden');
                messageBox.classList.add('bg-green-100', 'text-green-800');
                this.reset();
            } else {
                messageBox.textContent = result.message || 'Error al registrar.';
                messageBox.classList.remove('hidden');
                messageBox.classList.add('bg-red-100', 'text-red-800');
            }
        } catch (error) {
            console.error('Error en el registro:', error);
            messageBox.textContent = 'Error de conexión con el servidor.';
            messageBox.classList.remove('hidden');
            messageBox.classList.add('bg-red-100', 'text-red-800');
        }
    });