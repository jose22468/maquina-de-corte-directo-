// simulation.js - Versión corregida y unificada

// Variables globales para la simulación
let animationId = null;
let shearDisplacement = 0;
const maxShearDisplacement = 10;
let isPaused = false;
let testData = {
    displacements: [],
    shearForces: []
};

// Variables de control
let soilType = 'sand';
let cohesion = 0;
let frictionAngle = 35;
let normalStress = 100;
let saturation = 'dry';
let speed = 1.2;

// Variables para control de la curva
let peakStrength = 0;
let peakDisplacement = 0;
let postPeakReduction = 0;

// Referencias a elementos DOM
let canvas, ctx;
let startBtn, pauseBtn, resetBtn;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando simulación...');
    
    // Obtener referencias a elementos DOM
    canvas = document.getElementById('simulationCanvas');
    if (!canvas) {
        console.error('No se encontró el canvas con id "simulationCanvas"');
        return;
    }
    ctx = canvas.getContext('2d');
    
    startBtn = document.getElementById('startBtn');
    pauseBtn = document.getElementById('pauseBtn');
    resetBtn = document.getElementById('resetBtn');
    
    // Verificar que todos los elementos existan
    if (!startBtn || !pauseBtn || !resetBtn) {
        console.error('No se encontraron todos los botones');
        return;
    }
    
    // Inicializar gráficos
    initCharts();
    
    // Configurar la simulación
    setupSimulation();
    
    // Configurar event listeners para controles
    setupControls();
    
    // Configurar event listeners para botones
    startBtn.addEventListener('click', startTest);
    pauseBtn.addEventListener('click', pauseTest);
    resetBtn.addEventListener('click', resetTest);
    
    console.log('Simulación inicializada correctamente');
});

// Inicializar gráficos
function initCharts() {
    console.log('Inicializando gráficos...');
    
    const chartCanvas = document.getElementById('chartCanvas');
    const mohrCanvas = document.getElementById('mohrCanvas');
    
    if (!chartCanvas || !mohrCanvas) {
        console.error('No se encontraron los canvas de gráficos');
        return;
    }
    
    // Gráfico de esfuerzo-deformación
    const chartCtx = chartCanvas.getContext('2d');
    window.shearChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Esfuerzo de Corte (kPa)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1,
                fill: false,
                borderWidth: 3,
                pointRadius: 2,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Desplazamiento Horizontal (mm)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true,
                    max: 12
                },
                y: {
                    title: {
                        display: true,
                        text: 'Esfuerzo de Corte (kPa)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
    
    // Gráfico de Mohr-Coulomb
    const mohrCtx = mohrCanvas.getContext('2d');
    window.mohrChart = new Chart(mohrCtx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Envolvente de Falla',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                showLine: true,
                fill: false,
                borderWidth: 2,
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
                        text: 'Esfuerzo Normal (kPa)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: 450
                },
                y: {
                    title: {
                        display: true,
                        text: 'Resistencia al Corte (kPa)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: 300
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Configurar la simulación
function setupSimulation() {
    console.log('Configurando simulación...');
    
    // Calcular parámetros iniciales
    calculatePeakParameters();
    
    // Ajustar tamaño del canvas
    resizeCanvas();
    drawInitialState();
    updateMohrChart();
    
    // Configurar evento de redimensionamiento
    window.addEventListener('resize', resizeCanvas);
}

// Calcular resistencia pico y desplazamiento de pico
function calculatePeakParameters() {
    peakStrength = calculateShearStrength();
    
    // El desplazamiento de pico depende del tipo de suelo
    switch (soilType) {
        case 'sand':
            peakDisplacement = 2.0;
            postPeakReduction = 0.1;
            break;
        case 'clay':
            peakDisplacement = 4.0;
            postPeakReduction = 0.3;
            break;
        case 'silt':
            peakDisplacement = 3.0;
            postPeakReduction = 0.2;
            break;
        case 'clayeySand':
            peakDisplacement = 2.5;
            postPeakReduction = 0.15;
            break;
        default:
            peakDisplacement = 3.0;
            postPeakReduction = 0.2;
    }
    
    // Ajustar por saturación
    if (saturation === 'saturated') {
        peakDisplacement *= 1.2;
    }
    
    console.log('Parámetros calculados:', { peakStrength, peakDisplacement, postPeakReduction });
}

// Ajustar tamaño del canvas
function resizeCanvas() {
    if (!canvas) return;
    
    const container = canvas.parentElement;
    if (!container) return;
    
    // Mantener dimensiones fijas para el canvas principal
    canvas.width = container.clientWidth;
    canvas.height = 450;
    
    if (!animationId) {
        drawInitialState();
    }
}

// Dibujar estado inicial
function drawInitialState() {
    if (!ctx || !canvas) return;
    
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte
        const boxWidth = canvas.width * 0.7;
        const boxHeight = canvas.height * 0.4;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = canvas.height * 0.3;
        
        // Mitad inferior de la caja (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior de la caja
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight/2);
        
        // Línea de separación
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxHeight/2);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight/2);
        ctx.stroke();
        
        // Muestra de suelo
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth)/2;
        const soilY = boxY + (boxHeight - soilHeight)/2;
        
        ctx.fillStyle = getSoilColor();
        ctx.fillRect(soilX, soilY, soilWidth, soilHeight);
        
        // Dibujar tornillos
        drawScrews(boxX, boxY, boxWidth, boxHeight);
        
        // Sistema de pesos muertos
        drawWeightsSystem(boxX, boxY, boxWidth);
        
        // Texto informativo
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.fillText('Muestra de suelo', soilX + 10, soilY + 20);
        ctx.fillText(`c = ${cohesion} kPa, φ = ${frictionAngle}°`, soilX + 10, soilY + 40);
        ctx.fillText(`σ = ${normalStress} kPa - ${saturation === 'saturated' ? 'Saturado' : 'Seco'}`, soilX + 10, soilY + 60);
        
        // Fuerza normal
        const arrowStartX = boxX + boxWidth/2;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, `σ = ${normalStress} kPa`);
    } catch (error) {
        console.error('Error en drawInitialState:', error);
    }
}

function drawScrews(x, y, width, height) {
    if (!ctx) return;
    
    const screwRadius = 5;
    const positions = [
        {x: x + 20, y: y + height/2 - 10},
        {x: x + width - 20, y: y + height/2 - 10},
        {x: x + 20, y: y + height/2 + 10},
        {x: x + width - 20, y: y + height/2 + 10}
    ];
    
    ctx.fillStyle = '#e74c3c';
    positions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, screwRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x - screwRadius + 1, pos.y);
        ctx.lineTo(pos.x + screwRadius - 1, pos.y);
        ctx.stroke();
    });
}

function drawWeightsSystem(x, y, width) {
    if (!ctx) return;
    
    const systemWidth = 80;
    const systemHeight = 150;
    const systemX = x - systemWidth - 20;
    const systemY = y + 20;
    
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(systemX, systemY, systemWidth, systemHeight);
    
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(systemX + systemWidth/2 - 5, systemY, 10, 20);
    ctx.fillRect(systemX + systemWidth/2 - 40, systemY + 15, 80, 10);
    
    const weightCount = Math.min(Math.floor(normalStress/50), 6);
    ctx.fillStyle = '#2c3e50';
    for (let i = 0; i < weightCount; i++) {
        ctx.fillRect(systemX + systemWidth/2 - 20, systemY + 25 + i * 15, 40, 10);
    }
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px Arial';
    ctx.fillText(`${normalStress} kPa`, systemX, systemY - 10);
}

function getSoilColor() {
    let color;
    
    switch(soilType) {
        case 'sand':
            color = saturation === 'saturated' ? '#D2B48C' : '#F4A460';
            break;
        case 'clay':
            color = saturation === 'saturated' ? '#8B4513' : '#A0522D';
            break;
        case 'silt':
            color = saturation === 'saturated' ? '#BC8F8F' : '#DEB887';
            break;
        case 'clayeySand':
            color = saturation === 'saturated' ? '#CD853F' : '#D2691E';
            break;
        default:
            color = '#F4A460';
    }
    
    return color;
}

function drawArrow(fromX, fromY, toX, toY, text) {
    if (!ctx) return;
    
    const headlen = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI/6), toY - headlen * Math.sin(angle - Math.PI/6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI/6), toY - headlen * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px Arial';
    ctx.fillText(text, fromX - 40, fromY - 10);
}

// Funciones de control de la simulación
function startTest() {
    console.log('Iniciando ensayo...');
    
    if (animationId) {
        console.log('La simulación ya está en ejecución');
        return;
    }
    
    // Calcular parámetros de pico
    calculatePeakParameters();
    
    if (isPaused) {
        console.log('Reanudando ensayo...');
        isPaused = false;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
        animationId = requestAnimationFrame(animateTest);
        return;
    }
    
    console.log('Nuevo ensayo iniciado');
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = true;
    shearDisplacement = 0;
    testData = { displacements: [], shearForces: [] };
    
    // Reiniciar gráficos
    if (window.shearChart) {
        window.shearChart.data.labels = [];
        window.shearChart.data.datasets[0].data = [];
        window.shearChart.update();
    }
    
    updateMohrChart();
    animationId = requestAnimationFrame(animateTest);
}

function pauseTest() {
    console.log('Pausando ensayo...');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
        isPaused = true;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
        console.log('Ensayo pausado');
    }
}

function resetTest() {
    console.log('Reiniciando ensayo...');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
    startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
    isPaused = false;
    
    shearDisplacement = 0;
    testData = { displacements: [], shearForces: [] };
    
    // Reiniciar gráficos
    if (window.shearChart) {
        window.shearChart.data.labels = [];
        window.shearChart.data.datasets[0].data = [];
        window.shearChart.update();
    }
    
    // Reiniciar resultados
    const shearStrengthElem = document.getElementById('shearStrength');
    const horizontalDeformationElem = document.getElementById('horizontalDeformation');
    const verticalDeformationElem = document.getElementById('verticalDeformation');
    const shearForceElem = document.getElementById('shearForce');
    
    if (shearStrengthElem) shearStrengthElem.textContent = '-';
    if (horizontalDeformationElem) horizontalDeformationElem.textContent = '-';
    if (verticalDeformationElem) verticalDeformationElem.textContent = '-';
    if (shearForceElem) shearForceElem.textContent = '-';
    
    drawInitialState();
    console.log('Ensayo reiniciado');
}

function animateTest() {
    if (shearDisplacement >= maxShearDisplacement) {
        endTest();
        return;
    }
    
    try {
        const speedFactor = speed / 60; // Ajuste para que la animación dure aproximadamente 1 minuto a velocidad 1.0
        shearDisplacement = Math.min(shearDisplacement + speedFactor, maxShearDisplacement);
        
        updateTest();
        
        if (shearDisplacement < maxShearDisplacement) {
            animationId = requestAnimationFrame(animateTest);
        } else {
            endTest();
        }
    } catch (error) {
        console.error('Error en animateTest:', error);
        endTest();
    }
}

function endTest() {
    console.log('Finalizando ensayo...');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
    
    addMohrPoint(normalStress, peakStrength);
    showCompletionMessage();
    
    console.log('Ensayo finalizado');
}

function showCompletionMessage() {
    if (!ctx || !canvas) return;
    
    try {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('¡Ensayo Completado!', canvas.width/2, canvas.height/2 - 20);
        
        ctx.font = '18px Arial';
        ctx.fillText(`Resistencia Máxima: ${peakStrength.toFixed(2)} kPa`, canvas.width/2, canvas.height/2 + 20);
    } catch (error) {
        console.error('Error en showCompletionMessage:', error);
    }
}

function updateTest() {
    if (!ctx || !canvas) return;
    
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const boxWidth = canvas.width * 0.7;
        const boxHeight = canvas.height * 0.4;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = canvas.height * 0.3;
        
        // Mitad inferior de la caja (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior de la caja (se mueve según el desplazamiento)
        const displacementPixels = (shearDisplacement / maxShearDisplacement) * (boxWidth * 0.3);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacementPixels, boxY, boxWidth, boxHeight/2);
        
        // Sistema de pesos muertos
        drawWeightsSystem(boxX, boxY, boxWidth);
        
        // Muestra de suelo deformada
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth)/2;
        const soilY = boxY + (boxHeight - soilHeight)/2;
        
        ctx.fillStyle = getSoilColor();
        ctx.fillRect(soilX, soilY, soilWidth, soilHeight);
        
        // Dibujar tornillos
        drawScrews(boxX + displacementPixels, boxY, boxWidth, boxHeight);
        
        // Fuerza normal
        const arrowStartX = boxX + boxWidth/2 + displacementPixels;
        const arrowStartY = boxY - 30;
        drawArrow(arrowStartX, arrowStartY, arrowStartX, boxY, `σ = ${normalStress} kPa`);
        
        // Fuerza de corte
        const shearArrowX = boxX + boxWidth + 30;
        const shearArrowY = boxY + boxHeight/2;
        drawArrow(shearArrowX, shearArrowY, shearArrowX - 20, shearArrowY, 'τ');
        
        // Calcular esfuerzo de corte actual
        let currentShear;
        if (shearDisplacement <= peakDisplacement) {
            const progress = shearDisplacement / peakDisplacement;
            currentShear = peakStrength * (1 - Math.exp(-3 * progress));
        } else {
            const postPeakProgress = (shearDisplacement - peakDisplacement) / (maxShearDisplacement - peakDisplacement);
            currentShear = peakStrength * (1 - postPeakReduction * postPeakProgress);
        }
        
        // Calcular deformación vertical
        const verticalStrain = calculateVerticalStrain(shearDisplacement);
        
        // Actualizar resultados
        updateResultElement('shearStrength', currentShear.toFixed(2));
        updateResultElement('horizontalDeformation', shearDisplacement.toFixed(2));
        updateResultElement('verticalDeformation', verticalStrain.toFixed(4));
        updateResultElement('shearForce', (currentShear * 1000).toFixed(0));
        
        // Actualizar gráfico
        updateChart(shearDisplacement, currentShear);
    } catch (error) {
        console.error('Error en updateTest:', error);
    }
}

function updateResultElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function calculateShearStrength() {
    const frictionRad = frictionAngle * Math.PI / 180;
    let strength = cohesion + normalStress * Math.tan(frictionRad);
    
    if (saturation === 'saturated') {
        strength *= 0.7;
    }
    
    return strength;
}

function calculateVerticalStrain(horizontalDisp) {
    if (horizontalDisp <= peakDisplacement) {
        const progress = horizontalDisp / peakDisplacement;
        return -0.05 + (frictionAngle / 45) * progress * 0.3;
    } else {
        const baseStrain = -0.05 + (frictionAngle / 45) * 0.3;
        return baseStrain;
    }
}

function updateChart(displacement, stress) {
    if (!window.shearChart) return;
    
    try {
        testData.displacements.push(displacement);
        testData.shearForces.push(stress);
        
        window.shearChart.data.labels = testData.displacements;
        window.shearChart.data.datasets[0].data = testData.shearForces;
        window.shearChart.update('none');
    } catch (error) {
        console.error('Error en updateChart:', error);
    }
}

function updateMohrChart() {
    if (!window.mohrChart) return;
    
    try {
        const frictionRad = frictionAngle * Math.PI / 180;
        const data = [
            {x: 0, y: cohesion},
            {x: 100, y: cohesion + 100 * Math.tan(frictionRad)},
            {x: 200, y: cohesion + 200 * Math.tan(frictionRad)},
            {x: 300, y: cohesion + 300 * Math.tan(frictionRad)},
            {x: 400, y: cohesion + 400 * Math.tan(frictionRad)}
        ];
        
        window.mohrChart.data.datasets[0].data = data;
        window.mohrChart.update();
    } catch (error) {
        console.error('Error en updateMohrChart:', error);
    }
}

function addMohrPoint(normalStress, shearStress) {
    if (!window.mohrChart) return;
    
    try {
        if (!window.mohrChart.data.datasets[1]) {
            window.mohrChart.data.datasets[1] = {
                label: 'Puntos de Falla',
                data: [],
                backgroundColor: 'rgb(54, 162, 235)',
                pointRadius: 6,
                showLine: false
            };
        }
        
        window.mohrChart.data.datasets[1].data.push({
            x: normalStress,
            y: shearStress
        });
        
        window.mohrChart.update();
    } catch (error) {
        console.error('Error en addMohrPoint:', error);
    }
}

// Configurar controles
function setupControls() {
    console.log('Configurando controles...');
    
    const soilTypeSelect = document.getElementById('soilType');
    const cohesionSlider = document.getElementById('cohesion');
    const frictionSlider = document.getElementById('friction');
    const normalStressSlider = document.getElementById('normalStress');
    const saturationSelect = document.getElementById('saturation');
    const speedSlider = document.getElementById('speed');
    
    const cohesionValue = document.getElementById('cohesionValue');
    const frictionValue = document.getElementById('frictionValue');
    const normalStressValue = document.getElementById('normalStressValue');
    const speedValue = document.getElementById('speedValue');
    
    function updateSoilParameters() {
        switch(soilType) {
            case 'sand':
                cohesion = 0;
                frictionAngle = 35;
                break;
            case 'clay':
                cohesion = 25;
                frictionAngle = 20;
                break;
            case 'silt':
                cohesion = 10;
                frictionAngle = 28;
                break;
            case 'clayeySand':
                cohesion = 15;
                frictionAngle = 30;
                break;
        }
        
        if (cohesionSlider) cohesionSlider.value = cohesion;
        if (frictionSlider) frictionSlider.value = frictionAngle;
        if (cohesionValue) cohesionValue.textContent = `${cohesion} kPa`;
        if (frictionValue) frictionValue.textContent = `${frictionAngle}°`;
    }
    
    // Event listeners
    if (soilTypeSelect) {
        soilTypeSelect.addEventListener('change', function() {
            soilType = this.value;
            updateSoilParameters();
            if (!animationId) setupSimulation();
        });
    }
    
    if (cohesionSlider) {
        cohesionSlider.addEventListener('input', function() {
            cohesion = parseInt(this.value);
            if (cohesionValue) cohesionValue.textContent = `${cohesion} kPa`;
            if (!animationId) setupSimulation();
        });
    }
    
    if (frictionSlider) {
        frictionSlider.addEventListener('input', function() {
            frictionAngle = parseInt(this.value);
            if (frictionValue) frictionValue.textContent = `${frictionAngle}°`;
            if (!animationId) setupSimulation();
        });
    }
    
    if (normalStressSlider) {
        normalStressSlider.addEventListener('input', function() {
            normalStress = parseInt(this.value);
            if (normalStressValue) normalStressValue.textContent = `${normalStress} kPa`;
            if (!animationId) setupSimulation();
        });
    }
    
    if (saturationSelect) {
        saturationSelect.addEventListener('change', function() {
            saturation = this.value;
            if (!animationId) setupSimulation();
        });
    }
    
    if (speedSlider) {
        speedSlider.addEventListener('input', function() {
            speed = parseFloat(this.value);
            if (speedValue) speedValue.textContent = `${speed} mm/min`;
        });
    }
    
    // Inicializar valores
    updateSoilParameters();
    console.log('Controles configurados correctamente');
}
