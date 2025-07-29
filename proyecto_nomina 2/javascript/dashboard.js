document.addEventListener('DOMContentLoaded', async () => {
            const welcomeMessageElement = document.getElementById('welcomeMessage');
            const getTipButton = document.getElementById('getTipButton'); 
            const dailyTipBox = document.getElementById('dailyTip');     

            // 1. Obtener el correo electrónico del localStorage
            const userEmail = localStorage.getItem('username'); 

            if (userEmail) {
                welcomeMessageElement.textContent = `¡Bienvenido de nuevo, ${userEmail}!`;
            } else {
                welcomeMessageElement.textContent = `¡Bienvenido de nuevo!`;
            }

            // URL base de tu backend Flask
            const BACKEND_BASE_URL = 'http://127.0.0.1:5000'; 

            // Función para obtener un consejo de nómina del backend (usando la API de Gemini)
            if (getTipButton && dailyTipBox) {
                getTipButton.addEventListener('click', async () => {
                    getTipButton.disabled = true;
                    getTipButton.innerHTML = '<span class="spinner"></span> Generando...';
                    dailyTipBox.classList.add('hidden'); 

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
                            dailyTipBox.classList.remove('hidden'); 
                            console.error('Estructura de respuesta inesperada del tip:', result);
                        }
                    } catch (error) {
                        console.error('Error al obtener el consejo:', error);
                        dailyTipBox.textContent = `Error: No se pudo conectar con el servicio de consejos. Asegúrate de que el backend esté corriendo. Detalles: ${error.message}`;
                        dailyTipBox.classList.remove('hidden');
                    } finally {
                        getTipButton.disabled = false;
                        getTipButton.innerHTML = '✨ Obtener Consejo de Nómina ✨';
                    }
                });
            }

            // --- Configuración y Renderizado del Gráfico de Torta ---
            let employeeNetSalaries = [];

            try {
                // Realiza la petición para obtener los datos de salarios netos desde el backend
                const response = await fetch(`${BACKEND_BASE_URL}/api/net-salaries`);
                
                if (!response.ok) {
                    throw new Error(`Error HTTP! estado: ${response.status}`);
                }
                employeeNetSalaries = await response.json();
                
                if (!Array.isArray(employeeNetSalaries) || employeeNetSalaries.length === 0) {
                    console.warn("No se encontraron datos de salarios netos o el formato es incorrecto.");
                    // Muestra un mensaje al usuario si no hay datos
                    const chartContainer = document.getElementById('netSalaryPieChart').parentElement;
                    if (chartContainer) {
                        chartContainer.innerHTML = '<p class="text-red-500">No hay datos disponibles para mostrar el gráfico de salarios netos. Asegúrate de que el archivo CSV exista y tenga las columnas correctas.</p>';
                    }
                    return; // Sale de la función si no hay datos
                }

            } catch (error) {
                console.error('Error al obtener los datos de salarios netos:', error);
                const chartContainer = document.getElementById('netSalaryPieChart').parentElement;
                if (chartContainer) {
                    chartContainer.innerHTML = `<p class="text-red-500">Error al cargar los datos de salarios: ${error.message}. Asegúrate de que tu servidor Python esté ejecutándose.</p>`;
                }
                return; // Sale de la función si falla la obtención de datos
            }

            // Prepara los datos para Chart.js
            const labels = employeeNetSalaries.map(emp => emp.name);
            const data = employeeNetSalaries.map(emp => emp.salary);

            // Generar colores dinámicamente para el gráfico
            function generateColors(numColors) {
                const colors = [];
                for (let i = 0; i < numColors; i++) {
                    // Genera un tono basado en el índice para distribuir los colores
                    const hue = (i * 360 / numColors) % 360; 
                    colors.push(`hsl(${hue}, 70%, 60%)`); // Tonos saturados para buena visibilidad
                }
                return colors;
            }

            const backgroundColors = generateColors(labels.length);
            // Hace los bordes un poco más oscuros para contraste
            const borderColors = backgroundColors.map(color => {
                // Función simple para oscurecer HSL (reduciendo la luminosidad)
                const parts = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                if (parts) {
                    const h = parseInt(parts[1]);
                    const s = parseInt(parts[2]);
                    const l = Math.max(0, parseInt(parts[3]) - 20); // Reduce la luminosidad en 20%
                    return `hsl(${h}, ${s}%, ${l}%)`;
                }
                return color;
            });

            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Salario Neto',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            };

            const config = {
                type: 'pie',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Permite que el tamaño se ajuste al contenedor
                    plugins: {
                        title: {
                            display: false, // El título ya está en el HTML
                            text: 'Distribución de salario neto por empleado'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        // Formato de moneda colombiana
                                        label += new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(context.parsed);
                                    }
                                    return label;
                                },
                                // Muestra el porcentaje en el tooltip
                                afterLabel: function(context) {
                                    const total = context.dataset.data.reduce((sum, current) => sum + current, 0);
                                    const value = context.parsed;
                                    const percentage = ((value / total) * 100).toFixed(1) + '%';
                                    return percentage;
                                }
                            }
                        },
                        legend: {
                            position: 'bottom', // Coloca la leyenda en la parte inferior para más espacio
                            labels: {
                                padding: 20 // Espacio entre elementos de la leyenda
                            }
                        }
                    }
                },
            };

            const netSalaryPieChartCtx = document.getElementById('netSalaryPieChart');
            if (netSalaryPieChartCtx) {
                new Chart(netSalaryPieChartCtx, config);
            }
        });