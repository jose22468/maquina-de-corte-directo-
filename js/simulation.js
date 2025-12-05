// simulation.js - VERSIÓN FINAL CORREGIDA
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando simulación...');
    
    // Elementos del DOM
    const canvas = document.getElementById('simulationCanvas');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    // Verificar que estamos en la página correcta
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
    
    // Datos para gráficos
    let chartPoints = [];
    let maxChartPoints = 50;
    
    // Inicializar gráficos ANTES de todo
    initCharts();
    
    // Configurar botones
    startBtn.addEventListener('click', startSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    
    // Configurar controles
    setupControls();
    
    // Dibujar estado inicial
    drawMachine();
    
    // FUNCIONES PRINCIPALES
    function initCharts() {
        console.log('Inicializando gráficos...');
        
        // Gráfico de esfuerzo-deformación
        const chartCanvas = document.getElementById('chartCanvas');
        if (!chartCanvas) return;
        
        const chartCtx = chartCanvas.getContext('2d');
        
        // DESTRUIR gráfico anterior si existe
        if (window.shearChart instanceof Chart) {
            window.shearChart.destroy();
        }
        
        // Crear nuevo gráfico con configuración CORRECTA
        window.shearChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Esfuerzo de Corte (kPa)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear', // IMPORTANTE: Eje lineal
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Desplazamiento Horizontal (mm)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 10,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        },
                        grid: {
                            display: true
                        }
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Esfuerzo de Corte (kPa)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 400,
                        ticks: {
                            stepSize: 50
                        },
                        grid: {
                            display: true
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `τ: ${context.parsed.y.toFixed(2)} kPa, δ: ${context.parsed.x.toFixed(2)} mm`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('Gráfico inicializado');
    }
    
    function setupControls() {
        const soilTypeSelect = document.getElementById('soilType');
        const cohesionSlider = document.getElementById('cohesion');
        const frictionSlider = document.getElementById('friction');
        const normalStressSlider = document.getElementById('normalStress');
        const saturationSelect = document.getElementById('saturation');
        const speedSlider = document.getElementById('speed');
        
        // Configurar valores iniciales
        updateControlValues();
        
        // Event listeners
        if (soilTypeSelect) {
            soilTypeSelect.addEventListener('change', function() {
                updateSoilParameters(this.value);
                updateControlValues();
                drawMachine();
            });
        }
        
        if (cohesionSlider) {
            cohesionSlider.addEventListener('input', function() {
                updateControlValues();
                drawMachine();
            });
        }
        
        if (frictionSlider) {
            frictionSlider.addEventListener('input', function() {
                updateControlValues();
                drawMachine();
            });
        }
        
        if (normalStressSlider) {
            normalStressSlider.addEventListener('input', function() {
                updateControlValues();
                drawMachine();
            });
        }
        
        if (saturationSelect) {
            saturationSelect.addEventListener('change', function() {
                drawMachine();
            });
        }
        
        if (speedSlider) {
            speedSlider.addEventListener('input', function() {
                updateControlValues();
            });
        }
    }
    
    function updateSoilParameters(soilType) {
        const cohesionSlider = document.getElementById('cohesion');
        const frictionSlider = document.getElementById('friction');
        
        switch(soilType) {
            case 'sand':
                cohesionSlider.value = 0;
                frictionSlider.value = 35;
                break;
            case 'clay':
                cohesionSlider.value = 25;
                frictionSlider.value = 20;
                break;
            case 'silt':
                cohesionSlider.value = 10;
                frictionSlider.value = 28;
                break;
            case 'clayeySand':
                cohesionSlider.value = 15;
                frictionSlider.value = 30;
                break;
        }
    }
    
    function updateControlValues() {
        const cohesion = document.getElementById('cohesion').value;
        const friction = document.getElementById('friction').value;
        const normalStress = document.getElementById('normalStress').value;
        const speed = document.getElementById('speed').value;
        
        document.getElementById('cohesionValue').textContent = cohesion + ' kPa';
        document.getElementById('frictionValue').textContent = friction + '°';
        document.getElementById('normalStressValue').textContent = normalStress + ' kPa';
        document.getElementById('speedValue').textContent = speed + ' mm/min';
    }
    
    function getSoilColor() {
        const soilType = document.getElementById('soilType').value;
        const saturation = document.getElementById('saturation').value;
        
        switch(soilType) {
            case 'sand': return saturation === 'saturated' ? '#D2B48C' : '#F4A460';
            case 'clay': return saturation === 'saturated' ? '#8B4513' : '#A0522D';
            case 'silt': return saturation === 'saturated' ? '#BC8F8F' : '#DEB887';
            case 'clayeySand': return saturation === 'saturated' ? '#CD853F' : '#D2691E';
            default: return '#F4A460';
        }
    }
    
    function calculateShearStress() {
        const cohesion = parseFloat(document.getElementById('cohesion').value);
        const frictionAngle = parseFloat(document.getElementById('friction').value);
        const normalStress = parseFloat(document.getElementById('normalStress').value);
        const saturation = document.getElementById('saturation').value;
        const soilType = document.getElementById('soilType').value;
        
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
    
    function drawMachine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar fondo
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Caja de corte
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
        
        // Información
        ctx.fillStyle = '#2c3e50';
        ctx.font = '16px Arial';
        ctx.fillText('Máquina de Corte Directo HM-5750', 20, 30);
        ctx.font = '14px Arial';
        ctx.fillText(`Desplazamiento: ${displacement.toFixed(2)} mm`, 20, 105);
    }
    
    // FUNCIONES DE SIMULACIÓN
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
    
    function resetSimulation() {
        console.log('Reiniciando simulación...');
        
        isRunning = false;
        displacement = 0;
        chartPoints = [];
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
        
        // Reiniciar gráfico
        if (window.shearChart) {
            window.shearChart.data.datasets[0].data = [];
            window.shearChart.update();
        }
        
        // Reiniciar resultados
        document.getElementById('shearStrength').textContent = '-';
        document.getElementById('horizontalDeformation').textContent = '-';
        document.getElementById('verticalDeformation').textContent = '-';
        document.getElementById('shearForce').textContent = '-';
        
        drawMachine();
        
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
    
    function animate() {
        if (!isRunning) return;
        
        // Incrementar desplazamiento
        const speed = parseFloat(document.getElementById('speed').value);
        displacement += speed / 60;
        
        if (displacement >= maxDisplacement) {
            displacement = maxDisplacement;
            stopSimulation();
            return;
        }
        
        // Actualizar visualización
        drawMachine();
        
        // Calcular y actualizar resultados
        const shearStress = calculateShearStress();
        
        document.getElementById('shearStrength').textContent = shearStress.toFixed(2);
        document.getElementById('horizontalDeformation').textContent = displacement.toFixed(2);
        document.getElementById('verticalDeformation').textContent = (displacement * 0.05).toFixed(3);
        document.getElementById('shearForce').textContent = (shearStress * 1000).toFixed(0);
        
        // Actualizar gráfico - CORRECTO
        updateChart(displacement, shearStress);
        
        // Continuar animación
        animationId = requestAnimationFrame(animate);
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
    
    // FUNCIÓN CRÍTICA CORREGIDA: Actualizar gráfico
    function updateChart(x, y) {
        if (!window.shearChart) {
            console.error('Gráfico no inicializado');
            return;
        }
        
        try {
            // Agregar nuevo punto
            chartPoints.push({x: x, y: y});
            
            // Limitar número de puntos
            if (chartPoints.length > maxChartPoints) {
                chartPoints.shift();
            }
            
            // Actualizar datos del gráfico
            window.shearChart.data.datasets[0].data = chartPoints;
            
            // Ajustar límite del eje X si es necesario
            if (x > window.shearChart.options.scales.x.max) {
                window.shearChart.options.scales.x.max = Math.ceil(x) + 1;
            }
            
            // Actualizar gráfico SIN animación
            window.shearChart.update('none');
            
        } catch (error) {
            console.error('Error actualizando gráfico:', error);
        }
    }
    
    console.log('Simulación lista');
});
