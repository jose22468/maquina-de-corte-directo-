// Variables globales para la simulación
let simulationInterval;
let currentDisplacement = 0;
let currentShearForce = 0;
let currentShearStress = 0;
let currentVerticalStrain = 0;
let isSimulationRunning = false;
let shearData = [];
let normalStressData = [];
let shearStressData = [];

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráficos si existen en la página
    initializeCharts();
    
    // Configurar event listeners para la simulación
    setupSimulationControls();
    
    // Actualizar valores de controles deslizantes
    updateSliderValues();
});

// Inicializar gráficos
function initializeCharts() {
    // Gráfico de esfuerzo vs deformación (simulación)
    const shearChartCanvas = document.getElementById('shearChart');
    if (shearChartCanvas) {
        // Establecer dimensiones fijas
        shearChartCanvas.width = 400;
        shearChartCanvas.height = 250;
        
        const ctx = shearChartCanvas.getContext('2d');
        window.shearChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Esfuerzo de Corte (kPa)',
                    data: [],
                    borderColor: '#1e3c72',
                    backgroundColor: 'rgba(30, 60, 114, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
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
    
    // Gráfico de esfuerzo vs deformación (resultados)
    const stressStrainChartCanvas = document.getElementById('stressStrainChart');
    if (stressStrainChartCanvas) {
        // Establecer dimensiones fijas
        stressStrainChartCanvas.width = 400;
        stressStrainChartCanvas.height = 250;
        
        const ctx = stressStrainChartCanvas.getContext('2d');
        window.stressStrainChart = new Chart(ctx, {
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
        // Establecer dimensiones fijas
        failureEnvelopeChartCanvas.width = 400;
        failureEnvelopeChartCanvas.height = 250;
        
        const ctx = failureEnvelopeChartCanvas.getContext('2d');
        window.failureEnvelopeChart = new Chart(ctx, {
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

// Configurar controles de simulación
function setupSimulationControls() {
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const normalStressSlider = document.getElementById('normalStress');
    const speedSlider = document.getElementById('speed');
    
    if (startBtn) {
        startBtn.addEventListener('click', toggleSimulation);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }
    
    if (normalStressSlider) {
        normalStressSlider.addEventListener('input', updateSliderValues);
    }
    
    if (speedSlider) {
        speedSlider.addEventListener('input', updateSliderValues);
    }
}

// Actualizar valores de controles deslizantes
function updateSliderValues() {
    const normalStressSlider = document.getElementById('normalStress');
    const normalStressValue = document.getElementById('normalStressValue');
    const speedSlider = document.getElementById('speed');
    const speedValue = document.getElementById('speedValue');
    
    if (normalStressSlider && normalStressValue) {
        normalStressValue.textContent = `${normalStressSlider.value} kPa`;
    }
    
    if (speedSlider && speedValue) {
        speedValue.textContent = `${speedSlider.value} mm/min`;
    }
}

// Alternar simulación (iniciar/detener)
function toggleSimulation() {
    const startBtn = document.getElementById('startBtn');
    
    if (!isSimulationRunning) {
        // Iniciar simulación
        isSimulationRunning = true;
        startBtn.innerHTML = '<i class="fas fa-pause"></i> Pausar Simulación';
        startSimulation();
    } else {
        // Pausar simulación
        isSimulationRunning = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar Simulación';
        clearInterval(simulationInterval);
    }
}

// Iniciar simulación
function startSimulation() {
    const soilType = document.getElementById('soilType').value;
    const normalStress = parseInt(document.getElementById('normalStress').value);
    const speed = parseFloat(document.getElementById('speed').value);
    
    // Reiniciar datos si es necesario
    if (currentDisplacement === 0) {
        shearData = [];
        if (window.shearChart) {
            window.shearChart.data.labels = [];
            window.shearChart.data.datasets[0].data = [];
            window.shearChart.update();
        }
    }
    
    // Configurar intervalo de actualización
    simulationInterval = setInterval(() => {
        // Incrementar desplazamiento
        currentDisplacement += speed / 60; // Convertir mm/min a mm/segundo (asumiendo 60 FPS)
        
        // Calcular fuerza de corte basada en el tipo de suelo y esfuerzo normal
        currentShearForce = calculateShearForce(soilType, normalStress, currentDisplacement);
        
        // Calcular esfuerzo de corte (asumiendo área de 36 cm²)
        currentShearStress = currentShearForce / 36 * 10; // Convertir a kPa
        
        // Calcular deformación vertical (dilatancia/contracción)
        currentVerticalStrain = calculateVerticalStrain(soilType, currentDisplacement);
        
        // Actualizar visualización
        updateVisualization();
        
        // Actualizar gráfico
        updateShearChart();
        
        // Verificar si se alcanzó el final de la simulación
        if (currentDisplacement >= 5.0) {
            clearInterval(simulationInterval);
            isSimulationRunning = false;
            document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i> Iniciar Simulación';
        }
    }, 1000 / 60); // 60 FPS
}

// Calcular fuerza de corte basada en parámetros
function calculateShearForce(soilType, normalStress, displacement) {
    let maxShearStress;
    
    // Determinar resistencia máxima basada en tipo de suelo y esfuerzo normal
    switch(soilType) {
        case 'sand':
            // Arena: alto ángulo de fricción, sin cohesión
            maxShearStress = normalStress * Math.tan(35 * Math.PI / 180);
            break;
        case 'clay':
            // Arcilla: cohesión, bajo ángulo de fricción
            maxShearStress = 50 + normalStress * Math.tan(20 * Math.PI / 180);
            break;
        case 'silt':
            // Limo: propiedades intermedias
            maxShearStress = 20 + normalStress * Math.tan(28 * Math.PI / 180);
            break;
        case 'sandClay':
            // Arena-arcilla: propiedades mixtas
            maxShearStress = 30 + normalStress * Math.tan(32 * Math.PI / 180);
            break;
        default:
            maxShearStress = normalStress * 0.5;
    }
    
    // Convertir a fuerza (asumiendo área de 36 cm²)
    const maxForce = maxShearStress * 36 / 10;
    
    // Modelar curva de esfuerzo-deformación
    if (displacement < 1.0) {
        // Fase elástica
        return maxForce * (displacement / 1.0) * 0.7;
    } else if (displacement < 3.0) {
        // Fase plástica
        const progress = (displacement - 1.0) / 2.0;
        return maxForce * (0.7 + 0.3 * progress);
    } else {
        // Fase de ablandamiento/endurecimiento
        const progress = (displacement - 3.0) / 2.0;
        if (soilType === 'sand') {
            // Las arenas generalmente muestran endurecimiento
            return maxForce * (1.0 + 0.1 * progress);
        } else {
            // Las arcillas generalmente muestran ablandamiento
            return maxForce * (1.0 - 0.1 * progress);
        }
    }
}

// Calcular deformación vertical
function calculateVerticalStrain(soilType, displacement) {
    // Modelar dilatancia/contracción basada en tipo de suelo
    if (soilType === 'sand') {
        // Las arenas generalmente se dilatan
        if (displacement < 2.0) {
            return displacement * 0.05; // Dilatancia inicial
        } else {
            return 2.0 * 0.05 - (displacement - 2.0) * 0.02; // Dilatancia máxima seguida de leve contracción
        }
    } else {
        // Las arcillas generalmente se contraen
        return -displacement * 0.03; // Contracción constante
    }
}

// Actualizar visualización de la máquina
function updateVisualization() {
    // Actualizar indicador de desplazamiento
    const displacementIndicator = document.querySelector('.indicator-bar');
    if (displacementIndicator) {
        const displacementPercentage = (currentDisplacement / 5.0) * 100;
        displacementIndicator.style.setProperty('--displacement-width', `${displacementPercentage}%`);
    }
    
    // Actualizar indicador de fuerza
    const loadFill = document.querySelector('.load-fill');
    if (loadFill) {
        // Calcular porcentaje de fuerza máxima (asumiendo 10 kN como máximo)
        const forcePercentage = (currentShearForce / 10) * 100;
        loadFill.style.width = `${Math.min(forcePercentage, 100)}%`;
    }
    
    // Actualizar valores numéricos
    const displacementValue = document.getElementById('displacementValue');
    const shearForceValue = document.getElementById('shearForceValue');
    const realDisplacement = document.getElementById('realDisplacement');
    const realShearForce = document.getElementById('realShearForce');
    const realShearStress = document.getElementById('realShearStress');
    const realVerticalStrain = document.getElementById('realVerticalStrain');
    
    if (displacementValue) displacementValue.textContent = currentDisplacement.toFixed(2);
    if (shearForceValue) shearForceValue.textContent = currentShearForce.toFixed(2);
    if (realDisplacement) realDisplacement.textContent = currentDisplacement.toFixed(2);
    if (realShearForce) realShearForce.textContent = currentShearForce.toFixed(2);
    if (realShearStress) realShearStress.textContent = currentShearStress.toFixed(2);
    if (realVerticalStrain) realVerticalStrain.textContent = currentVerticalStrain.toFixed(2);
}

// Actualizar gráfico de esfuerzo-deformación
function updateShearChart() {
    if (window.shearChart) {
        // Agregar nuevo punto de datos
        window.shearChart.data.labels.push(currentDisplacement.toFixed(2));
        window.shearChart.data.datasets[0].data.push(currentShearStress);
        
        // Limitar a 50 puntos para rendimiento
        if (window.shearChart.data.labels.length > 50) {
            window.shearChart.data.labels.shift();
            window.shearChart.data.datasets[0].data.shift();
        }
        
        // Actualizar gráfico
        window.shearChart.update();
    }
}

// Reiniciar simulación
function resetSimulation() {
    // Detener simulación si está en ejecución
    if (isSimulationRunning) {
        clearInterval(simulationInterval);
        isSimulationRunning = false;
        document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i> Iniciar Simulación';
    }
    
    // Reiniciar variables
    currentDisplacement = 0;
    currentShearForce = 0;
    currentShearStress = 0;
    currentVerticalStrain = 0;
    shearData = [];
    
    // Reiniciar visualización
    updateVisualization();
    
    // Reiniciar gráfico
    if (window.shearChart) {
        window.shearChart.data.labels = [];
        window.shearChart.data.datasets[0].data = [];
        window.shearChart.update();
    }
}

// Actualizar parámetros en la página de resultados
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