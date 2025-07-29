document.addEventListener('DOMContentLoaded', () => {
        const employeeSelect = document.getElementById('employee');
        const BACKEND_BASE_URL = 'http://127.0.0.1:5000'; // Asegúrate de que esta URL sea correcta

        // Función para cargar los empleados desde el backend
        async function fetchEmployees() {
            try {
                // Mensaje de carga mientras se obtienen los datos
                employeeSelect.innerHTML = '<option value="">-- Cargando empleados... --</option>';
                
                const response = await fetch(`${BACKEND_BASE_URL}/api/employees`);

                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }

                const employees = await response.json();

                // Limpiar opciones existentes (excepto la de "Cargando...")
                employeeSelect.innerHTML = '<option value="">-- Selecciona un empleado --</option>';

                // Añadir cada empleado como una opción
                employees.forEach(employee => {
                    const option = document.createElement('option');
                    // Puedes usar employee.id como value si tienes IDs únicos en tu CSV
                    // Y employee.name para el texto visible
                    option.value = employee.id; 
                    option.textContent = employee.name;
                    employeeSelect.appendChild(option);
                });

            } catch (error) {
                console.error('Error al cargar la lista de empleados:', error);
                employeeSelect.innerHTML = '<option value="">-- Error al cargar empleados --</option>';
                // Opcional: mostrar un mensaje de error visible al usuario
            }
        }

        // Llamar a la función para cargar los empleados cuando la página esté lista
        fetchEmployees();
    });
        document.addEventListener('DOMContentLoaded', () => {
            const payrollForm = document.getElementById('payrollForm');
            const employeeSelect = document.getElementById('employee');
            const periodTypeSelect = document.getElementById('periodType');
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            const grossSalaryInput = document.getElementById('grossSalary');
            const bonusesInput = document.getElementById('bonuses');
            const deductionsInput = document.getElementById('deductions');
            const netSalaryDisplay = document.getElementById('netSalaryDisplay');
            const commentsTextarea = document.getElementById('comments');
            const processButton = document.getElementById('processButton');
            const messageBox = document.getElementById('message-box');
            const payrollSummaryDiv = document.getElementById('payrollSummary');
            const getTipButton = document.getElementById('getTipButton');
            const dailyTipBox = document.getElementById('dailyTip');

            // Asegúrate de que esta URL coincida con la dirección y puerto de tu servidor Flask
            const BACKEND_BASE_URL = 'http://127.0.0.1:5000'; 

            const formatCurrencyCOP = (amount) => {
                if (typeof amount !== 'number' || isNaN(amount)) {
                    return 'COP 0,00';
                }
                return new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(amount);
            };

            function showMessage(message, type) {
                messageBox.textContent = message;
                messageBox.className = ''; // Limpia todas las clases existentes
                messageBox.classList.add('p-4', 'mb-4', 'text-sm', 'rounded-lg', 'w-full', 'text-left');

                if (type === 'error') {
                    messageBox.classList.add('bg-red-100', 'text-red-800');
                } else if (type === 'success') {
                    messageBox.classList.add('bg-green-100', 'text-green-800');
                }
                messageBox.classList.remove('hidden');
                dailyTipBox.classList.add('hidden'); // Oculta el consejo si se muestra un mensaje
            }

            function hideMessage() {
                messageBox.classList.add('hidden');
            }

            // Establecer fechas por defecto al cargar la página
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            startDateInput.value = `${year}-${month}-01`; // Primer día del mes actual
            endDateInput.value = `${year}-${month}-${day}`; // Día actual

            async function callPythonBackendForCalculation(data) {
                try {
                    const response = await fetch(`${BACKEND_BASE_URL}/api/process-payroll`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.success) {
                        return {
                            netSalary: result.netSalary,
                            details: result.details
                        };
                    } else {
                        throw new Error(result.message || 'Error desconocido en el backend.');
                    }
                } catch (error) {
                    console.error('Error al comunicarse con el backend Python:', error);
                    // Proporciona un mensaje más amigable para el usuario
                    throw new Error(`No se pudo conectar con el servicio de nómina. Asegúrate de que el servidor esté corriendo en ${BACKEND_BASE_URL}. Detalles: ${error.message}`);
                }
            }

            // Función para calcular y mostrar el salario neto estimado
            async function calculateNetSalary() {
                const gross = parseFloat(grossSalaryInput.value) || 0;
                const bonuses = parseFloat(bonusesInput.value) || 0;
                const deductions = parseFloat(deductionsInput.value) || 0;

                // Solo necesitamos estos campos para la estimación
                const dataToSend = {
                    grossSalary: gross,
                    bonuses: bonuses,
                    deductions: deductions
                };

                try {
                    const result = await callPythonBackendForCalculation(dataToSend);
                    netSalaryDisplay.value = formatCurrencyCOP(result.netSalary);
                } catch (error) {
                    netSalaryDisplay.value = 'Error de conexión';
                    console.error("Error al estimar salario neto:", error);
                    // Opcional: mostrar un mensaje de error en la UI si la estimación falla
                    // showMessage('No se pudo estimar el salario neto. Verifica la conexión con el servidor.', 'error');
                }
            }

            // Escuchadores de eventos para la estimación del salario neto
            grossSalaryInput.addEventListener('input', calculateNetSalary);
            bonusesInput.addEventListener('input', calculateNetSalary);
            deductionsInput.addEventListener('input', calculateNetSalary);

            // Calcular salario neto al cargar la página por primera vez
            calculateNetSalary();

            // Evento para el envío del formulario
            payrollForm.addEventListener('submit', async (event) => {
                event.preventDefault(); // ¡Esta línea es CRUCIAL para evitar la recarga!
                hideMessage(); // Oculta cualquier mensaje anterior

                const employee = employeeSelect.value;
                const periodType = periodTypeSelect.value;
                const startDate = startDateInput.value;
                const endDate = endDateInput.value;
                const grossSalary = parseFloat(grossSalaryInput.value) || 0;
                const bonuses = parseFloat(bonusesInput.value) || 0;
                const deductions = parseFloat(deductionsInput.value) || 0;
                const comments = commentsTextarea.value.trim();

                // Validaciones básicas del lado del cliente
                if (!employee || !periodType || !startDate || !endDate || grossSalary <= 0) {
                    showMessage('Por favor, completa todos los campos obligatorios y asegúrate de que el salario bruto sea mayor que cero.', 'error');
                    return;
                }

                if (new Date(startDate) > new Date(endDate)) {
                    showMessage('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
                    return;
                }

                // Deshabilitar botón y mostrar spinner
                processButton.disabled = true;
                processButton.innerHTML = '<span class="spinner"></span> Procesando...';

                try {
                    const dataToSend = {
                        employee: employee,
                        periodType: periodType,
                        startDate: startDate,
                        endDate: endDate,
                        grossSalary: grossSalary,
                        bonuses: bonuses,
                        deductions: deductions,
                        comments: comments
                    };

                    const result = await callPythonBackendForCalculation(dataToSend);
                    const netSalary = result.netSalary;
                    const details = result.details;

                    showMessage(`¡Nómina para ${employee} procesada con éxito!`, 'success');

                    // Actualizar el resumen de nómina
                    payrollSummaryDiv.innerHTML = `
                        <div class="summary-card">
                            <h3 class="text-xl font-semibold text-gray-800 mb-2">Última Nómina Procesada</h3>
                            <p><strong>Empleado:</strong> ${employee}</p>
                            <p><strong>Período:</strong> ${periodType} (${startDate} al ${endDate})</p>
                            <p><strong>Salario Bruto:</strong> ${formatCurrencyCOP(details.grossSalary)}</p>
                            <p><strong>Bonificaciones:</strong> ${formatCurrencyCOP(details.bonuses)}</p>
                            <p><strong>Subsidio de Transporte:</strong> ${formatCurrencyCOP(details.subsidio_transporte)}</p>
                            <p><strong>Otras Deducciones:</strong> ${formatCurrencyCOP(details.deductions)}</p>
                            <hr class="my-3 border-gray-200">
                            <p><strong>Aporte Salud (4%):</strong> - ${formatCurrencyCOP(details.aporte_salud_empleado)}</p>
                            <p><strong>Aporte Pensión (4%):</strong> - ${formatCurrencyCOP(details.aporte_pension_empleado)}</p>
                            <p><strong>Retención en la Fuente:</strong> - ${formatCurrencyCOP(details.retencion_en_la_fuente)}</p>
                            <hr class="my-3 border-gray-200">
                            <p class="text-lg font-bold text-green-700 mt-2"><strong>Salario Neto:</strong> ${formatCurrencyCOP(netSalary)}</p>
                            ${comments ? `<p class="text-sm text-gray-500 mt-2">Notas: ${comments}</p>` : ''}
                        </div>
                    `;
                    
                    // Resetear el formulario después de un envío exitoso
                    payrollForm.reset();
                    // Restaurar fechas por defecto después del reset
                    startDateInput.value = `${year}-${month}-01`; 
                    endDateInput.value = `${year}-${month}-${day}`;
                    calculateNetSalary(); // Recalcular el salario neto estimado para el formulario reseteado
                } catch (error) {
                    console.error('Error al procesar la nómina:', error);
                    showMessage(error.message || 'Ocurrió un error al procesar la nómina. Inténtalo de nuevo.', 'error');
                } finally {
                    // Volver a habilitar el botón y restaurar su texto
                    processButton.disabled = false;
                    processButton.innerHTML = '<i class="fas fa-calculator mr-2"></i> Procesar Nómina';
                }
            });

            // Evento para obtener el consejo de Gemini
            getTipButton.addEventListener('click', async () => {
                getTipButton.disabled = true;
                getTipButton.innerHTML = '<span class="spinner"></span> Generando...';
                dailyTipBox.classList.add('hidden'); // Oculta el tip anterior

                try {
                    const response = await fetch(`${BACKEND_BASE_URL}/api/get-payroll-tip`);

                    if (!response.ok) {
                        throw new Error(`Error HTTP: ${response.status}`);
                    }

                    const result = await response.json();
                    if (result.tip) {
                        dailyTipBox.textContent = result.tip;
                        dailyTipBox.classList.remove('hidden');
                    } else {
                        dailyTipBox.textContent = "No se pudo obtener el consejo. Inténtalo de nuevo.";
                        dailyTipBox.classList.add('hidden');
                        console.error('Estructura de respuesta inesperada del tip:', result);
                    }
                } catch (error) {
                    console.error('Error al obtener el consejo:', error);
                    dailyTipBox.textContent = `Error: ${error.message}`;
                    dailyTipBox.classList.remove('hidden');
                } finally {
                    getTipButton.disabled = false;
                    getTipButton.innerHTML = '✨ Obtener Consejo de Nómina ✨';
                }
            });
        });