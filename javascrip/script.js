// script.js - Solo para inicialización de gráficos en páginas de resultados
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráficos si existen
    initializeCharts();
});

function initializeCharts() {
    // Gráfico de esfuerzo vs deformación (resultados)
    const stressStrainChartCanvas = document.getElementById('stressStrainChart');
    if (stressStrainChartCanvas) {
        const ctx = stressStrainChartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['0', '0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'],
                datasets: [
                    {
                        label: 'Esfuerzo Normal: 100 kPa',
                        data: [0, 45, 75, 95, 110, 120, 125, 125, 124, 122, 120],
                        borderColor: '#1e3c72',
                        backgroundColor: 'rgba(30, 60, 114, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Esfuerzo Normal: 200 kPa',
                        data: [0, 65, 110, 140, 165, 185, 200, 210, 215, 214, 212],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Esfuerzo Normal: 300 kPa',
                        data: [0, 85, 145, 185, 220, 250, 275, 295, 305, 304, 302],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Desplazamiento Horizontal (mm)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Esfuerzo de Corte (kPa)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Gráfico de envolvente de falla (resultados)
    const failureEnvelopeChartCanvas = document.getElementById('failureEnvelopeChart');
    if (failureEnvelopeChartCanvas) {
        const ctx = failureEnvelopeChartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Puntos de Falla',
                    data: [
                        {x: 100, y: 125},
                        {x: 200, y: 215},
                        {x: 300, y: 305}
                    ],
                    backgroundColor: '#1e3c72',
                    pointRadius: 6
                }, {
                    label: 'Envolvente de Falla',
                    data: [
                        {x: 0, y: 25},
                        {x: 100, y: 125},
                        {x: 200, y: 225},
                        {x: 300, y: 325},
                        {x: 400, y: 425}
                    ],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    showLine: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Esfuerzo Normal (kPa)'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Esfuerzo de Corte (kPa)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Actualizar parámetros en la página de resultados
        updateResultsParameters();
    }
}

function updateResultsParameters() {
    const cohesionValue = document.getElementById('cohesionValue');
    const frictionAngleValue = document.getElementById('frictionAngleValue');
    const maxShearStressValue = document.getElementById('maxShearStressValue');
    const resultsTableBody = document.getElementById('resultsTableBody');
    
    if (cohesionValue) cohesionValue.textContent = '25 kPa';
    if (frictionAngleValue) frictionAngleValue.textContent = '30°';
    if (maxShearStressValue) maxShearStressValue.textContent = '305 kPa';
    
    if (resultsTableBody) {
        resultsTableBody.innerHTML = `
            <tr>
                <td>100</td>
                <td>125</td>
                <td>3.5</td>
            </tr>
            <tr>
                <td>200</td>
                <td>215</td>
                <td>3.8</td>
            </tr>
            <tr>
                <td>300</td>
                <td>305</td>
                <td>4.2</td>
            </tr>
        `;
    }
}
