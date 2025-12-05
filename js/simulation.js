// simulation.js - Simulación de la máquina de corte directo - VERSIÓN FINAL CON GRÁFICOS ESTABLES
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando simulación...');
    
    // Elementos del DOM
    const canvas = document.getElementById('simulationCanvas');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const soilTypeSelect = document.getElementById('soilType');
    const cohesionSlider = document.getElementById('cohesion');
    const frictionSlider = document.getElementById('friction');
    const normalStressSlider = document.getElementById('normalStress');
    const saturationSelect = document.getElementById('saturation');
    const speedSlider = document.getElementById('speed');
    
    // Verificar que todos los elementos existan
    if (!canvas || !startBtn) {
        console.log('No es la página de simulación');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Variables de simulación
    let isRunning = false;
    let animationId = null;
    let displacement = 0;
    const maxDisplacement = 10;
    
    // Parámetros del suelo
    let soilType = 'sand';
    let cohesion = 0;
    let frictionAngle = 35;
    let normalStress = 100;
    let saturation = 'dry';
    let speed = 1.2;
    
    // Datos para gráficos
    let chartData = {
        labels: [],
        values: []
    };
    
    // Límites fijos para los gráficos
    const chartLimits = {
        xMin: 0,
        xMax: 12,
        yMin: 0,
        yMax: 400  // Este valor se ajusta según el tipo de suelo más adelante
    };
    
    // Calcular el límite Y máximo basado en parámetros del suelo
    function calculateYMax() {
        const frictionRad = frictionAngle * Math.PI / 180;
        const maxShear = cohesion + normalStress * Math.tan(frictionRad);
        // Devolver el mayor entre el cálculo y un mínimo de 100
        return Math.max(maxShear * 1.5, 100);
    }
    
    // Actualizar valores de los controles
    function updateControlValues() {
        document.getElementById('cohesionValue').textContent = cohesion + ' kPa';
        document.getElementById('frictionValue').textContent = frictionAngle + '°';
        document.getElementById('normalStressValue').textContent = normalStress + ' kPa';
        document.getElementById('speedValue').textContent = speed + ' mm/min';
    }
    
    // Configurar event listeners para controles
    soilTypeSelect.addEventListener('change', function() {
        soilType = this.value;
        
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
        
        cohesionSlider.value = cohesion;
        frictionSlider.value = frictionAngle;
        updateControlValues();
        drawMachine();
        updateMohrChart();
        updateYLimit();
    });
    
    cohesionSlider.addEventListener('input', function() {
        cohesion = parseInt(this.value);
        updateControlValues();
        drawMachine();
        updateMohrChart();
        updateYLimit();
    });
    
    frictionSlider.addEventListener('input', function() {
        frictionAngle = parseInt(this.value);
        updateControlValues();
        drawMachine();
        updateMohrChart();
        updateYLimit();
    });
    
    normalStressSlider.addEventListener('input', function() {
        normalStress = parseInt(this.value);
        updateControlValues();
        drawMachine();
        updateYLimit();
    });
    
    saturationSelect.addEventListener('change', function() {
        saturation = this.value;
        drawMachine();
    });
    
    speedSlider.addEventListener('input', function() {
        speed = parseFloat(this.value);
        updateControlValues();
    });
    
    // Actualizar límite Y
    function updateYLimit() {
        chartLimits.yMax = calculateYMax();
        if (window.shearChart) {
            window.shearChart.options.scales.y.max = chartLimits.yMax;
            window.shearChart.update('none');
        }
    }
    
    // Función para dibujar la máquina
    function drawMachine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar fondo
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la caja de corte
        const boxWidth = 400;
        const boxHeight = 200;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = 150;
        
        // Mitad inferior (fija)
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior (móvil)
        const displacementPixels = (displacement / maxDisplacement) * 100;
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacementPixels, boxY, boxWidth, boxHeight/2);
        
        // Muestra de suelo
        ctx.fillStyle = getSoilColor();
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth)/2;
        const soilY = boxY + (boxHeight - soilHeight)/2;
        ctx.fillRect(soilX + displacementPixels * 0.8, soilY, soilWidth, soilHeight);
        
        // Línea de separación
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxHeight/2);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight/2);
        ctx.stroke();
        
        // Tornillos
        drawScrews(boxX + displacementPixels, boxY, boxWidth, boxHeight);
        
        // Sistema de pesos
        drawWeightSystem(boxX, boxY, boxWidth);
        
        // Fuerzas
        drawForces(boxX, boxY, boxWidth, boxHeight, displacementPixels);
        
        // Información
        ctx.fillStyle = '#2c3e50';
        ctx.font = '16px Arial';
        ctx.fillText('Máquina de Corte Directo HM-5750', 20, 30);
        ctx.font = '14px Arial';
        ctx.fillText(`Tipo: ${soilType} | Cohesión: ${cohesion} kPa | φ: ${frictionAngle}°`, 20, 55);
        ctx.fillText(`σ: ${normalStress} kPa | Estado: ${saturation === 'saturated' ? 'Saturado' : 'Seco'}`, 20, 80);
        ctx.fillText(`Desplazamiento: ${displacement.toFixed(2)} mm`, 20, 105);
    }
    
    function getSoilColor() {
        switch(soilType) {
            case 'sand': return saturation === 'saturated' ? '#D2B48C' : '#F4A460';
            case 'clay': return saturation === 'saturated' ? '#8B4513' : '#A0522D';
            case 'silt': return saturation === 'saturated' ? '#BC8F8F' : '#DEB887';
            case 'clayeySand': return saturation === 'saturated' ? '#CD853F' : '#D2691E';
            default: return '#F4A460';
        }
    }
    
    function drawScrews(x, y, width, height) {
        ctx.fillStyle = '#e74c3c';
        const screwPositions = [
            {x: x + 30, y: y + height/2 - 15},
            {x: x + width - 30, y: y + height/2 - 15},
            {x: x + 30, y: y + height/2 + 15},
            {x: x + width - 30, y: y + height/2 + 15}
        ];
        
        screwPositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    function drawWeightSystem(x, y, width) {
        const systemX = x - 100;
        const systemY = y + 50;
        const systemWidth = 60;
        const systemHeight = 120;
        
        // Poste
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(systemX + systemWidth/2 - 5, systemY, 10, systemHeight);
        
        // Base
        ctx.fillRect(systemX, systemY + systemHeight - 10, systemWidth, 10);
        
        // Pesos
        const weightCount = Math.min(Math.floor(normalStress / 50), 5);
        ctx.fillStyle = '#2c3e50';
        for (let i = 0; i < weightCount; i++) {
            ctx.fillRect(systemX + 10, systemY + 20 + i * 20, systemWidth - 20, 15);
        }
    }
    
    function drawForces(x, y, width, height, displacement) {
        // Fuerza normal
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + width/2 + displacement, y - 30);
        ctx.lineTo(x + width/2 + displacement, y);
        ctx.stroke();
        
        // Flecha
        ctx.beginPath();
        ctx.moveTo(x + width/2 + displacement - 5, y - 20);
        ctx.lineTo(x + width/2 + displacement, y - 30);
        ctx.lineTo(x + width/2 + displacement + 5, y - 20);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        
        ctx.fillStyle = '#3498db';
        ctx.font = '12px Arial';
        ctx.fillText('σ = ' + normalStress + ' kPa', x + width/2 + displacement - 30, y - 40);
        
        // Fuerza de corte
        ctx.strokeStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x + width + 30, y + height/2);
        ctx.lineTo(x + width + 10, y + height/2);
        ctx.stroke();
        
        // Flecha
        ctx.beginPath();
        ctx.moveTo(x + width + 20, y + height/2 - 5);
        ctx.lineTo(x + width + 30, y + height/2);
        ctx.lineTo(x + width + 20, y + height/2 + 5);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        
        const shearStress = calculateShearStress();
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('τ = ' + shearStress.toFixed(2) + ' kPa', x + width + 35, y + height/2 - 10);
    }
    
    function calculateShearStress() {
        const frictionRad = frictionAngle * Math.PI / 180;
        let strength = cohesion + normalStress * Math.tan(frictionRad);
        
        if (saturation === 'saturated') {
            strength *= 0.7;
        }
        
        const peakDisplacement = soilType === 'clay' ? 4 : 2;
        if (displacement <= peakDisplacement) {
            return strength * (displacement / peakDisplacement);
        } else {
            return strength * (1 - 0.1 * (displacement - peakDisplacement));
        }
    }
    
    // Función de animación
    function animate() {
        if (!isRunning) return;
        
        displacement += speed / 60;
        
        if (displacement >= maxDisplacement) {
            stopSimulation();
            displacement = maxDisplacement;
        }
        
        drawMachine();
        updateResults();
        
        if (isRunning) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    function updateResults() {
        const shearStress = calculateShearStress();
        
        document.getElementById('shearStrength').textContent = shearStress.toFixed(2);
        document.getElementById('horizontalDeformation').textContent = displacement.toFixed(2);
        document.getElementById('verticalDeformation').textContent = (displacement * 0.05).toFixed(3);
        document.getElementById('shearForce').textContent = (shearStress * 1000).toFixed(0);
        
        updateChart(displacement, shearStress);
    }
    
    // Función para actualizar gráfico principal - CON LÍMITES ESTRICTOS
    function updateChart(currentDisplacement, currentStress) {
        if (!window.shearChart) return;
        
        try {
            chartData.labels.push(currentDisplacement.toFixed(2));
            chartData.values.push(currentStress);
            
            // Limitar a 50 puntos
            if (chartData.labels.length > 50) {
                chartData.labels.shift();
                chartData.values.shift();
            }
            
            window.shearChart.data.labels = chartData.labels;
            window.shearChart.data.datasets[0].data = chartData.values;
            
            // Ajustar límite X dinámico
            window.shearChart.options.scales.x.max = Math.max(chartLimits.xMax, currentDisplacement + 2);
            
            // FORZAR que no haya ajuste automático en los ejes
            window.shearChart.options.scales.x.ticks.display = true;
            window.shearChart.options.scales.y.ticks.display = true;
            
            window.shearChart.update('none');
            
        } catch (error) {
            console.error('Error en updateChart:', error);
        }
    }
    
    // Control de la simulación
    function startSimulation() {
        if (isRunning) return;
        
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Ejecutando...';
        animate();
    }
    
    function pauseSimulation() {
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
    
    function stopSimulation() {
        isRunning = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-check"></i> Completado';
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
    
    // Función para reiniciar simulación
    function resetSimulation() {
        console.log('Reiniciando ensayo...');
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        isRunning = false;
        displacement = 0;
        chartData = { labels: [], values: [] };
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
        
        // Reiniciar gráficos
        if (window.shearChart) {
            window.shearChart.data.labels = [];
            window.shearChart.data.datasets[0].data = [];
            window.shearChart.options.scales.x.max = chartLimits.xMax;
            window.shearChart.update();
        }
        
        // Reiniciar resultados
        document.getElementById('shearStrength').textContent = '-';
        document.getElementById('horizontalDeformation').textContent = '-';
        document.getElementById('verticalDeformation').textContent = '-';
        document.getElementById('shearForce').textContent = '-';
        
        drawMachine();
        console.log('Ensayo reiniciado');
    }
    
    // Configurar event listeners para botones
    startBtn.addEventListener('click', startSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    
    // Inicializar gráficos - CONFIGURACIÓN ESTRICTA
    function initCharts() {
        const chartCanvas = document.getElementById('chartCanvas');
        const mohrCanvas = document.getElementById('mohrCanvas');
        
        if (!chartCanvas || !mohrCanvas) {
            console.error('No se encontraron los canvas de gráficos');
            return;
        }
        
        // Calcular límite Y inicial
        chartLimits.yMax = calculateYMax();
        
        // Gráfico de esfuerzo-deformación - CONFIGURACIÓN ESTRICTA
        const chartCtx = chartCanvas.getContext('2d');
        window.shearChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Esfuerzo de Corte (kPa)',
                    data: [],
                    borderColor: '#005792',
                    backgroundColor: 'rgba(0, 87, 146, 0.1)',
                    tension: 0.3,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Desplazamiento Horizontal (mm)',
                            color: '#2c3e50',
                            font: { weight: 'bold', size: 14 }
                        },
                        beginAtZero: true,
                        min: chartLimits.xMin,
                        max: chartLimits.xMax,
                        ticks: {
                            stepSize: 1,
                            color: '#2c3e50',
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: true
                        },
                        // IMPORTANTE: Deshabilitar ajuste automático
                        grace: '0%',
                        suggestedMin: chartLimits.xMin,
                        suggestedMax: chartLimits.xMax
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Esfuerzo de Corte (kPa)',
                            color: '#2c3e50',
                            font: { weight: 'bold', size: 14 }
                        },
                        beginAtZero: true,
                        min: chartLimits.yMin,
                        max: chartLimits.yMax,
                        ticks: {
                            stepSize: 50,
                            color: '#2c3e50',
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: true
                        },
                        // IMPORTANTE: Deshabilitar ajuste automático
                        grace: '0%',
                        suggestedMin: chartLimits.yMin,
                        suggestedMax: chartLimits.yMax
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#2c3e50',
                            font: { weight: 'bold', size: 13 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        titleFont: { size: 13 },
                        bodyFont: { size: 13 }
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
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    showLine: true,
                    fill: false,
                    borderWidth: 3,
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
                            color: '#2c3e50',
                            font: { weight: 'bold', size: 14 }
                        },
                        min: 0,
                        max: 450,
                        ticks: {
                            color: '#2c3e50',
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Resistencia al Corte (kPa)',
                            color: '#2c3e50',
                            font: { weight: 'bold', size: 14 }
                        },
                        min: 0,
                        max: 300,
                        ticks: {
                            color: '#2c3e50',
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#2c3e50',
                            font: { weight: 'bold', size: 13 }
                        }
                    }
                }
            }
        });
        
        updateMohrChart();
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
    
    // Inicializar
    updateControlValues();
    initCharts();
    drawMachine();
    
    console.log('Simulación inicializada correctamente');
});
