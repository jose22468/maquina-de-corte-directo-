// simulation.js - Simulación de la máquina de corte directo - VERSIÓN FINAL CORREGIDA
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
    let simulationDurationHours = 8;

    const RESULTS_STORAGE_KEY = 'directShearLastRun';
    
    // Datos para gráficos - ARRAYS VACÍOS
    let chartData = {
        points: []       // Puntos {x, y} para eje lineal
    };
    
    // Límites fijos para los gráficos
    const chartLimits = {
        xMin: 0,
        xMax: 12,        // Desplazamiento máximo en mm
        yMin: 0,
        yMax: 400        // Esfuerzo máximo en kPa
    };

    const SIMULATION_STORAGE_KEY = 'directShear:lastSimulation';

    const availableDurations = [8, 12, 24];
    const simulationPresets = {
        sand: { cohesion: 0, friction: 35 },
        softClay: { cohesion: 18, friction: 18 },
        stiffClay: { cohesion: 35, friction: 25 }
    };

    const defaultTableRows = [
        { time: 0, load: 0, horizontal: 0, vertical: 0 },
        { time: 2, load: 35, horizontal: 0.4, vertical: 0.08 },
        { time: 4, load: 72, horizontal: 1.1, vertical: 0.16 },
        { time: 6, load: 108, horizontal: 2.3, vertical: 0.23 },
        { time: 8, load: 135, horizontal: 3.4, vertical: 0.28 }
    ];

    function getTableDataFromDOM() {
        const rows = document.querySelectorAll('#simulationDataBody tr');
        return Array.from(rows).map((row) => ({
            time: parseFloat(row.querySelector('[data-field="time"]')?.value) || 0,
            load: parseFloat(row.querySelector('[data-field="load"]')?.value) || 0,
            horizontal: parseFloat(row.querySelector('[data-field="horizontal"]')?.value) || 0,
            vertical: parseFloat(row.querySelector('[data-field="vertical"]')?.value) || 0
        }));
    }

    function saveSimulationSnapshot() {
        if (!chartData.points.length) return;

        const peakShear = chartData.points.reduce((maxValue, point) => {
            const currentY = Number.isFinite(point.y) ? point.y : 0;
            return Math.max(maxValue, currentY);
        }, 0);

        const payload = {
            timestamp: new Date().toISOString(),
            soilType,
            cohesion,
            frictionAngle,
            normalStress,
            saturation,
            points: chartData.points,
            peakShear,
            durationHours: simulationDurationHours,
            tableData: getTableDataFromDOM()
        };

        try {
            localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('No se pudo guardar la simulación en localStorage:', error);
        }
    }
    
    // Actualizar valores de los controles
    function updateControlValues() {
        document.getElementById('cohesionValue').textContent = cohesion + ' kPa';
        document.getElementById('frictionValue').textContent = frictionAngle + '°';
        document.getElementById('normalStressValue').textContent = normalStress + ' kPa';
        document.getElementById('speedValue').textContent = speed + ' mm/min';
        const selectedDuration = document.getElementById('duration')?.value;
        simulationDurationHours = Number(selectedDuration) || simulationDurationHours;
        const durationInfo = document.getElementById('durationInfo');
        if (durationInfo) {
            durationInfo.textContent = `Simulación acelerada: ${simulationDurationHours} h`;
        }
    }
    
    // Configurar event listeners para controles
    soilTypeSelect.addEventListener('change', function() {
        soilType = this.value;

        // Actualizar valores según tipo de suelo
        if (simulationPresets[soilType]) {
            cohesion = simulationPresets[soilType].cohesion;
            frictionAngle = simulationPresets[soilType].friction;
        }
        
        cohesionSlider.value = cohesion;
        frictionSlider.value = frictionAngle;
        updateControlValues();
        drawMachine();
        updateMohrChart();
    });
    
    cohesionSlider.addEventListener('input', function() {
        cohesion = parseInt(this.value);
        updateControlValues();
        drawMachine();
        updateMohrChart();
    });
    
    frictionSlider.addEventListener('input', function() {
        frictionAngle = parseInt(this.value);
        updateControlValues();
        drawMachine();
        updateMohrChart();
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
        const shearStress = Math.max(0, calculateShearStress());
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
        const peakDisplacement = soilType === 'sand' ? 2 : 4;
        if (displacement <= peakDisplacement) {
            return strength * (displacement / peakDisplacement);
        } else {
            return strength * (1 - 0.1 * (displacement - peakDisplacement));
        }
    }
    
    // Función de animación
    function animate() {
        if (!isRunning) return;
        
        // Incrementar desplazamiento (modo de prueba rápida para 8h, 12h y 24h)
        const durationFactor = 24 / simulationDurationHours;
        displacement += (speed / 60) * durationFactor;
        
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
    
    function saveResultsToStorage(currentShearStress) {
        const safeStress = Number.isFinite(currentShearStress) ? Number(currentShearStress.toFixed(3)) : 0;
        const safeDisplacement = Number.isFinite(displacement) ? Number(displacement.toFixed(3)) : 0;
        const safeNormalStress = Number.isFinite(normalStress) ? normalStress : 0;

        const payload = {
            timestamp: new Date().toISOString(),
            parameters: {
                soilType,
                cohesion,
                frictionAngle,
                normalStress: safeNormalStress,
                saturation,
                speed,
                durationHours: simulationDurationHours
            },
            latest: {
                displacement: safeDisplacement,
                shearStress: safeStress,
                verticalDeformation: Number((safeDisplacement * 0.05).toFixed(3)),
                shearForce: Number((safeStress * 1000).toFixed(0))
            },
            stressStrainPoints: chartData.points,
            mohrEnvelope: window.mohrChart?.data?.datasets?.[0]?.data || [],
            consolidationPoints: window.consolidationChart?.data?.datasets?.[0]?.data || [],
            dataTable: getTableDataFromDOM()
        };

        try {
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('No se pudo guardar resultados en localStorage:', error);
        }
    }

    function clearResultsStorage() {
        try {
            localStorage.removeItem(RESULTS_STORAGE_KEY);
        } catch (error) {
            console.warn('No se pudo limpiar resultados en localStorage:', error);
        }
    }

    function updateResults() {
        const shearStress = calculateShearStress();
        
        // Actualizar valores en la interfaz
        document.getElementById('shearStrength').textContent = shearStress.toFixed(2);
        document.getElementById('horizontalDeformation').textContent = displacement.toFixed(2);
        document.getElementById('verticalDeformation').textContent = (displacement * 0.05).toFixed(3);
        document.getElementById('shearForce').textContent = (shearStress * 1000).toFixed(0);
        
        // Actualizar gráficos
        updateChart(displacement, shearStress);

        // Persistir para la pestaña de resultados
        saveResultsToStorage(shearStress);
    }
    
    // FUNCIÓN CORREGIDA: Actualizar gráfico principal CON LÍMITES FIJOS
    function updateChart(currentDisplacement, currentStress) {
        if (!window.shearChart) return;
        
        try {
            // Agregar nuevo punto
            const safeX = Number.isFinite(currentDisplacement) ? Number(currentDisplacement.toFixed(2)) : 0;
            const safeY = Number.isFinite(currentStress) ? Math.max(0, currentStress) : 0;
            chartData.points.push({ x: safeX, y: safeY });
            
            // Actualizar el gráfico
            window.shearChart.data.datasets[0].data = chartData.points;

            // Mantener límites fijos en X para mostrar la curva completa
            window.shearChart.options.scales.x.min = chartLimits.xMin;
            window.shearChart.options.scales.x.max = chartLimits.xMax;
            
            // IMPORTANTE: Mantener límites fijos en el eje Y
            // Esto evita que la gráfica se mueva hacia arriba/abajo
            window.shearChart.options.scales.y.min = chartLimits.yMin;
            window.shearChart.options.scales.y.max = chartLimits.yMax;
            
            // Actualizar solo si hay cambios
            window.shearChart.update('none');
            saveSimulationSnapshot();
            
        } catch (error) {
            console.error('Error en updateChart:', error);
        }
    }
    

    function createDataRow(values = {}) {
        const tbody = document.getElementById('simulationDataBody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="number" data-field="time" min="0" step="0.1" value="${values.time ?? ''}"></td>
            <td><input type="number" data-field="load" min="0" step="0.1" value="${values.load ?? ''}"></td>
            <td><input type="number" data-field="horizontal" min="0" step="0.01" value="${values.horizontal ?? ''}"></td>
            <td><input type="number" data-field="vertical" step="0.01" value="${values.vertical ?? ''}"></td>
            <td><button type="button" class="remove-row-btn"><i class="fas fa-times"></i></button></td>
        `;

        row.querySelectorAll('input').forEach((input) => {
            input.addEventListener('input', syncChartsFromTable);
        });

        row.querySelector('.remove-row-btn').addEventListener('click', () => {
            row.remove();
            syncChartsFromTable();
        });

        tbody.appendChild(row);
    }

    function setupSimulationTable() {
        const addBtn = document.getElementById('addDataRowBtn');
        const clearBtn = document.getElementById('clearDataRowsBtn');
        const durationSelect = document.getElementById('duration');

        defaultTableRows.forEach((row) => createDataRow(row));

        addBtn?.addEventListener('click', () => createDataRow());
        clearBtn?.addEventListener('click', () => {
            const tbody = document.getElementById('simulationDataBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            createDataRow();
            syncChartsFromTable();
        });

        durationSelect?.addEventListener('change', () => {
            updateControlValues();
            syncChartsFromTable();
        });

        syncChartsFromTable();
    }

    function syncChartsFromTable() {
        const rawData = getTableDataFromDOM();
        const validData = rawData
            .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.load) && Number.isFinite(row.horizontal) && Number.isFinite(row.vertical))
            .sort((a, b) => a.horizontal - b.horizontal);

        chartData.points = validData.map((row) => ({ x: row.horizontal, y: row.load }));

        if (window.shearChart) {
            window.shearChart.data.datasets[0].data = chartData.points;
            window.shearChart.update();
        }

        if (window.consolidationChart) {
            window.consolidationChart.data.datasets[0].data = validData.map((row) => ({ x: row.time, y: row.vertical }));
            window.consolidationChart.options.scales.x.max = simulationDurationHours;
            window.consolidationChart.update();
        }

        if (window.mohrChart) {
            updateMohrChart();
        }

        saveSimulationSnapshot();
        saveResultsToStorage(calculateShearStress());
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
            animationId = null;
        }

        saveSimulationSnapshot();
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

        saveSimulationSnapshot();
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
        
        // Reiniciar datos del gráfico
        chartData = {
            points: []
        };
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';
        
        // Reiniciar gráficos
        if (window.shearChart) {
            window.shearChart.data.datasets[0].data = [];
            // Restaurar límites iniciales
            window.shearChart.options.scales.x.max = chartLimits.xMax;
            window.shearChart.update();
        }
        
        // Reiniciar resultados
        document.getElementById('shearStrength').textContent = '-';
        document.getElementById('horizontalDeformation').textContent = '-';
        document.getElementById('verticalDeformation').textContent = '-';
        document.getElementById('shearForce').textContent = '-';
        
        clearResultsStorage();

        drawMachine();
        console.log('Ensayo reiniciado');
    }
    
    // Configurar event listeners para botones
    startBtn.addEventListener('click', startSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    resetBtn.addEventListener('click', resetSimulation);
    
    // Inicializar gráficos - VERSIÓN CORREGIDA CON LÍMITES FIJOS
    function initCharts() {
        const chartCanvas = document.getElementById('chartCanvas');
        const mohrCanvas = document.getElementById('mohrCanvas');
        const consolidationCanvas = document.getElementById('consolidationCanvas');
        
        if (!chartCanvas || !mohrCanvas || !consolidationCanvas) {
            console.error('No se encontraron los canvas de gráficos');
            return;
        }

        // Evitar ciclos de redimensionado (canvas creciendo infinitamente)
        // al entrar en la pestaña de simulación.
        chartCanvas.style.height = '250px';
        mohrCanvas.style.height = '250px';
        consolidationCanvas.style.height = '250px';
        
        // Gráfico de esfuerzo-deformación - CONFIGURACIÓN CORREGIDA CON LÍMITES FIJOS
        const chartCtx = chartCanvas.getContext('2d');
        window.shearChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Esfuerzo de Corte (kPa)',
                    data: [],
                    borderColor: '#2c3e50',
                    backgroundColor: 'rgba(44, 62, 80, 0.1)',
                    tension: 0.3,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    parsing: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.6,
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
                            font: {
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        min: chartLimits.xMin,
                        max: chartLimits.xMax,
                        ticks: {
                            stepSize: 1,
                            color: '#2c3e50'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Esfuerzo de Corte (kPa)',
                            color: '#2c3e50',
                            font: {
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        min: chartLimits.yMin,     // LÍMITE FIJO INFERIOR
                        max: chartLimits.yMax,     // LÍMITE FIJO SUPERIOR
                        ticks: {
                            stepSize: 50,          // ESCALA FIJA
                            color: '#2c3e50'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#2c3e50',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff'
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
                    borderWidth: 2,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.6,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Esfuerzo Normal (kPa)',
                            color: '#2c3e50',
                            font: {
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 450,
                        ticks: {
                            color: '#2c3e50'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Resistencia al Corte (kPa)',
                            color: '#2c3e50',
                            font: {
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 300,
                        ticks: {
                            color: '#2c3e50'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#2c3e50',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
        
        const consolidationCtx = consolidationCanvas.getContext('2d');
        window.consolidationChart = new Chart(consolidationCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Desplazamiento Vertical (mm)',
                    data: [],
                    borderColor: '#16a085',
                    backgroundColor: 'rgba(22, 160, 133, 0.1)',
                    fill: true,
                    tension: 0.25,
                    parsing: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.6,
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Tiempo (h)' },
                        min: 0,
                        max: simulationDurationHours,
                        ticks: { stepSize: 2 }
                    },
                    y: {
                        title: { display: true, text: 'Desplazamiento Vertical (mm)' },
                        min: 0
                    }
                }
            }
        });

        // Actualizar gráfico de Mohr con la línea inicial
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

            // Mantener envolvente actualizada para la pestaña de resultados
            saveResultsToStorage(calculateShearStress());
        } catch (error) {
            console.error('Error en updateMohrChart:', error);
        }
    }
    
    // Inicializar
    updateControlValues();
    initCharts();
    setupSimulationTable();
    drawMachine();
    
    console.log('Simulación inicializada correctamente');
});
