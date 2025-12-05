// simulation.js - Simulación de la máquina de corte directo
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
    let maxDisplacement = 10;
    
    // Parámetros del suelo
    let soilType = 'sand';
    let cohesion = 0;
    let frictionAngle = 35;
    let normalStress = 100;
    let saturation = 'dry';
    let speed = 1.2;
    
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
        
        // Actualizar valores según tipo de suelo
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
    });
    
    cohesionSlider.addEventListener('input', function() {
        cohesion = parseInt(this.value);
        updateControlValues();
        drawMachine();
    });
    
    frictionSlider.addEventListener('input', function() {
        frictionAngle = parseInt(this.value);
        updateControlValues();
        drawMachine();
    });
    
    normalStressSlider.addEventListener('input', function() {
        normalStress = parseInt(this.value);
        updateControlValues();
        drawMachine();
    });
    
    saturationSelect.addEventListener('change', function() {
        saturation = this.value;
        drawMachine();
    });
    
    speedSlider.addEventListener('input', function() {
        speed = parseFloat(this.value);
        updateControlValues();
    });
    
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
        
        // Mitad superior (móvil - según desplazamiento)
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
        // Fuerza normal (vertical)
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
        
        // Texto
        ctx.fillStyle = '#3498db';
        ctx.font = '12px Arial';
        ctx.fillText('σ = ' + normalStress + ' kPa', x + width/2 + displacement - 30, y - 40);
        
        // Fuerza de corte (horizontal)
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
        
        // Calcular esfuerzo de corte
        const shearStress = calculateShearStress();
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('τ = ' + shearStress.toFixed(2) + ' kPa', x + width + 35, y + height/2 - 10);
    }
    
    function calculateShearStress() {
        // Fórmula simplificada de Mohr-Coulomb
        const frictionRad = frictionAngle * Math.PI / 180;
        let strength = cohesion + normalStress * Math.tan(frictionRad);
        
        // Reducción por saturación
        if (saturation === 'saturated') {
            strength *= 0.7;
        }
        
        // Ajustar según desplazamiento
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
        
        // Incrementar desplazamiento
        displacement += speed / 60; // Aproximadamente 1 minuto para completar
        
        if (displacement >= maxDisplacement) {
            stopSimulation();
            displacement = maxDisplacement;
        }
        
        // Actualizar visualización
        drawMachine();
        
        // Actualizar resultados
        updateResults();
        
        // Continuar animación
        if (isRunning) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    function updateResults() {
        const shearStress = calculateShearStress();
        
        // Actualizar valores en la interfaz
        document.getElementById('shearStrength').textContent = shearStress.toFixed(2);
        document.getElementById('horizontalDeformation').textContent = displacement.toFixed(2);
        document.getElementById('verticalDeformation').textContent = (displacement * 0.05).toFixed(3);
        document.getElementById('shearForce').textContent = (shearStress * 1000).toFixed(0);
        
        // Actualizar gráfico (si existe)
        if (window.shearChart) {
            const labels = window.shearChart.data.labels;
            const data = window.shearChart.data.datasets[0].data;
            
            labels.push(displacement.toFixed(2));
            data.push(shearStress);
            
            // Mantener solo los últimos 50 puntos
            if (labels.length > 50) {
                labels.shift();
                data.shift();
            }
            
            window.shearChart.update();
        }
    }
    
    // Control de la simulación
    function startSimulation() {
        if (isRunning) return;
        
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Ejecutando...';
        
        // Iniciar animación
        animate();
    }
    
    function pauseSimulation() {
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }
    
    function stopSimulation() {
        isRunning = false;
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-check"></i> Completado';
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }
    
    function resetSimulation() {
        isRunning = false;
        displacement = 0;
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
        
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // Reiniciar gráfico
        if (window.shearChart) {
            window.shearChart.data.labels = [];
            window.shearChart.data.datasets[0].data = [];
            window.shearChart.update();
        }
        
        // Reiniciar resultados
        document.getElementById('shearStrength').textContent = '-';
        document.getElementById('horizontalDeformation').textContent = '-';
        document.getElementById('verticalDeformation').textContent = '-';
        document.getElementById('shearForce').textContent = '-';
        
        drawMachine();
    }
    
    // Configurar event listeners para botones
    startBtn.addEventListener('click', startSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    
    // Inicializar gráficos
    function initCharts() {
        const chartCanvas = document.getElementById('chartCanvas');
        const mohrCanvas = document.getElementById('mohrCanvas');
        
        if (!chartCanvas || !mohrCanvas) return;
        
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
                    borderWidth: 2
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
                        },
                        beginAtZero: true,
                        max: 12
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
                    borderWidth: 2
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
                        min: 0,
                        max: 450
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Resistencia al Corte (kPa)'
                        },
                        min: 0,
                        max: 300
                    }
                }
            }
        });
        
        // Actualizar gráfico de Mohr
        updateMohrChart();
    }
    
    function updateMohrChart() {
        if (!window.mohrChart) return;
        
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
    }
    
    // Inicializar
    updateControlValues();
    initCharts();
    drawMachine();
    
    console.log('Simulación inicializada correctamente');
});
