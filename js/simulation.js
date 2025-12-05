// simulation.js - Versión SUPER SIMPLIFICADA Y FUNCIONAL
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cargando simulación simplificada...');
    
    // Elementos básicos
    const canvas = document.getElementById('simulationCanvas');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (!canvas || !startBtn) return;
    
    // Variables básicas
    let isRunning = false;
    let animationId = null;
    let displacement = 0;
    const maxDisplacement = 10;
    
    // Parámetros fijos para simplificar
    let soilType = 'sand';
    let cohesion = 0;
    let frictionAngle = 35;
    let normalStress = 100;
    let speed = 1.0;
    
    // Datos del gráfico - LIMITADOS A 20 PUNTOS
    let chartData = {
        labels: Array.from({length: 20}, (_, i) => i * 0.5), // 0, 0.5, 1.0, ... 9.5
        values: Array(20).fill(0)
    };
    
    // Dibujar máquina estática
    function drawMachine() {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fondo
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Caja de corte
        const boxWidth = 400;
        const boxHeight = 200;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = 150;
        
        // Mitad inferior
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight/2, boxWidth, boxHeight/2);
        
        // Mitad superior (se mueve)
        const displacementPixels = (displacement / maxDisplacement) * 100;
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacementPixels, boxY, boxWidth, boxHeight/2);
        
        // Suelo
        ctx.fillStyle = '#F4A460';
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth)/2;
        const soilY = boxY + (boxHeight - soilHeight)/2;
        ctx.fillRect(soilX + displacementPixels * 0.8, soilY, soilWidth, soilHeight);
        
        // Información
        ctx.fillStyle = '#2c3e50';
        ctx.font = '16px Arial';
        ctx.fillText('Máquina de Corte Directo HM-5750', 20, 30);
        ctx.font = '14px Arial';
        ctx.fillText(`Desplazamiento: ${displacement.toFixed(2)} mm`, 20, 55);
        ctx.fillText(`Esfuerzo Normal: ${normalStress} kPa`, 20, 80);
    }
    
    // Calcular esfuerzo de corte (fórmula simple)
    function calculateShearStress() {
        const frictionRad = frictionAngle * Math.PI / 180;
        let strength = cohesion + normalStress * Math.tan(frictionRad);
        
        // Curva típica de esfuerzo-deformación
        const peakDisplacement = 2.5;
        if (displacement <= peakDisplacement) {
            return strength * (displacement / peakDisplacement);
        } else {
            return strength * (1 - 0.15 * (displacement - peakDisplacement));
        }
    }
    
    // Actualizar gráfico de forma SIMPLE
    function updateChart() {
        if (!window.shearChart) return;
        
        // Calcular esfuerzo actual
        const currentStress = calculateShearStress();
        
        // Encontrar el índice correspondiente al desplazamiento actual
        const index = Math.min(Math.floor(displacement / 0.5), 19);
        
        // Actualizar solo el valor en ese índice
        if (index >= 0 && index < 20) {
            chartData.values[index] = currentStress;
        }
        
        // Suavizar la curva (rellenar valores entre puntos)
        for (let i = 0; i < 20; i++) {
            if (chartData.values[i] === 0 && i > 0) {
                chartData.values[i] = chartData.values[i-1] * 0.95;
            }
        }
        
        // Actualizar gráfico
        window.shearChart.data.datasets[0].data = chartData.values;
        window.shearChart.update('none');
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
        updateChart();
        
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
    }
    
    // Controles básicos
    startBtn.addEventListener('click', function() {
        if (isRunning) return;
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        animate();
    });
    
    pauseBtn.addEventListener('click', function() {
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    });
    
    resetBtn.addEventListener('click', function() {
        isRunning = false;
        displacement = 0;
        
        // Reiniciar datos del gráfico
        chartData.values = Array(20).fill(0);
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        
        if (window.shearChart) {
            window.shearChart.data.datasets[0].data = chartData.values;
            window.shearChart.update();
        }
        
        document.getElementById('shearStrength').textContent = '-';
        document.getElementById('horizontalDeformation').textContent = '-';
        document.getElementById('verticalDeformation').textContent = '-';
        document.getElementById('shearForce').textContent = '-';
        
        drawMachine();
    });
    
    // Inicializar gráficos SIMPLES
    function initSimpleCharts() {
        const chartCanvas = document.getElementById('chartCanvas');
        if (!chartCanvas) return;
        
        const ctx = chartCanvas.getContext('2d');
        window.shearChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Esfuerzo de Corte (kPa)',
                    data: chartData.values,
                    borderColor: '#005792',
                    backgroundColor: 'rgba(0, 87, 146, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Desplazamiento (mm)'
                        },
                        min: 0,
                        max: 10,
                        ticks: {
                            stepSize: 2
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Esfuerzo (kPa)'
                        },
                        min: 0,
                        max: 200, // LÍMITE FIJO
                        ticks: {
                            stepSize: 50
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Inicializar
    drawMachine();
    initSimpleCharts();
    
    // Ocultar controles complejos que no usaremos
    document.querySelectorAll('.control-group').forEach(el => {
        el.style.display = 'none';
    });
    
    // Mostrar mensaje simplificado
    const controlsContainer = document.querySelector('.controls');
    if (controlsContainer) {
        controlsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0;">
                <h4 style="color: #005792;">Simulación Simplificada</h4>
                <p>Esta versión muestra el comportamiento básico de la máquina de corte directo.</p>
                <p>Usa los botones para controlar la simulación.</p>
            </div>
        `;
    }
    
    console.log('Simulación simplificada cargada');
});
