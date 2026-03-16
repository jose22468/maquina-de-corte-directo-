// simulation.js - Simulación de la máquina de corte directo - flujo por fases
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando simulación...');

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

    if (!canvas || !startBtn) {
        console.log('No es la página de simulación');
        return;
    }

    const ctx = canvas.getContext('2d');

    let isRunning = false;
    let animationId = null;
    let displacement = 0;
    const maxDisplacement = 10;

    let soilType = 'sand';
    let cohesion = 0;
    let frictionAngle = 35;
    let normalStress = 100;
    let saturation = 'dry';
    let speed = 1.2;
    let simulationDurationHours = 8;

    const RESULTS_STORAGE_KEY = 'directShearLastRun';
    const RUNS_STORAGE_KEY = 'directShear:runs';
    const SIMULATION_STORAGE_KEY = 'directShear:lastSimulation';

    const sampleDimensions = { lengthMm: 60, widthMm: 60 };
    const initialAreaMm2 = sampleDimensions.lengthMm * sampleDimensions.widthMm;

    const consolidationSlopeThreshold = 0.002;
    const consolidationCheckInterval = 0.4;
    const consolidationDurationMax = 4;

    const chartLimits = { xMin: 0, xMax: 12, yMin: 0, yMax: 400 };

    const simulationPresets = {
        sand: { cohesion: 0, friction: 35, recommendedSpeed: 1.2, label: 'arena' },
        softClay: { cohesion: 18, friction: 18, recommendedSpeed: 0.5, label: 'arcilla blanda' },
        stiffClay: { cohesion: 35, friction: 25, recommendedSpeed: 0.3, label: 'arcilla rígida' }
    };

    const phaseLabels = {
        consolidation: 'Consolidando',
        shear: 'Cortando',
        finished: 'Finalizado'
    };

    const simulationData = {
        phase: 'finished',
        startedAt: null,
        consolidationTime: 0,
        lastConsolidationCheck: 0,
        lastConsolidationSettlement: 0,
        consolidationComplete: false,
        residualStress: 0
    };

    let chartData = {
        points: [],
        consolidationPoints: []
    };

    function getTableDataFromDOM() {
        const rows = document.querySelectorAll('#simulationDataBody tr');
        return Array.from(rows).map((row) => ({
            time: parseFloat(row.querySelector('[data-field="time"]')?.value) || 0,
            load: parseFloat(row.querySelector('[data-field="load"]')?.value) || 0,
            horizontal: parseFloat(row.querySelector('[data-field="horizontal"]')?.value) || 0,
            vertical: parseFloat(row.querySelector('[data-field="vertical"]')?.value) || 0
        }));
    }

    function getRunCollection() {
        try {
            const raw = localStorage.getItem(RUNS_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('No se pudo leer colección de corridas:', error);
            return [];
        }
    }

    function setPhase(phase) {
        simulationData.phase = phase;
        const phaseStatus = document.getElementById('phaseStatus');
        if (phaseStatus) phaseStatus.textContent = phaseLabels[phase] || phase;
    }

    function updateSpeedRecommendation() {
        const recommendationEl = document.getElementById('speedRecommendation');
        const preset = simulationPresets[soilType] || simulationPresets.sand;
        if (recommendationEl) {
            recommendationEl.textContent = `Recomendado para ${preset.label}: ${preset.recommendedSpeed} mm/min`;
        }
    }

    function updateControlValues() {
        document.getElementById('cohesionValue').textContent = cohesion + ' kPa';
        document.getElementById('frictionValue').textContent = frictionAngle + '°';
        document.getElementById('normalStressValue').textContent = normalStress + ' kPa';
        document.getElementById('speedValue').textContent = speed + ' mm/min';
        simulationDurationHours = Number(document.getElementById('duration')?.value) || simulationDurationHours;
        const durationInfo = document.getElementById('durationInfo');
        if (durationInfo) durationInfo.textContent = `Simulación acelerada: ${simulationDurationHours} h`;
        updateSpeedRecommendation();
    }

    function getSoilColor() {
        switch (soilType) {
            case 'sand': return saturation === 'saturated' ? '#D2B48C' : '#F4A460';
            case 'softClay':
            case 'stiffClay':
                return saturation === 'saturated' ? '#8B4513' : '#A0522D';
            default: return '#F4A460';
        }
    }

    function drawScrews(x, y, width, height) {
        ctx.fillStyle = '#e74c3c';
        [
            { x: x + 30, y: y + height / 2 - 15 },
            { x: x + width - 30, y: y + height / 2 - 15 },
            { x: x + 30, y: y + height / 2 + 15 },
            { x: x + width - 30, y: y + height / 2 + 15 }
        ].forEach((pos) => {
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
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(systemX + systemWidth / 2 - 5, systemY, 10, systemHeight);
        ctx.fillRect(systemX, systemY + systemHeight - 10, systemWidth, 10);
        const weightCount = Math.min(Math.floor(normalStress / 50), 7);
        ctx.fillStyle = '#2c3e50';
        for (let i = 0; i < weightCount; i += 1) {
            ctx.fillRect(systemX + 10, systemY + 20 + i * 14, systemWidth - 20, 10);
        }
    }

    function computeEffectiveArea() {
        const lengthEffective = Math.max(20, sampleDimensions.lengthMm - displacement);
        return Math.max(1, lengthEffective * sampleDimensions.widthMm);
    }

    function calculateShearStress() {
        const frictionRad = (frictionAngle * Math.PI) / 180;
        let peakStrength = cohesion + normalStress * Math.tan(frictionRad);

        if (saturation === 'saturated') {
            peakStrength *= 0.75;
        }

        const isFrictional = soilType === 'sand';
        const peakDisplacement = isFrictional ? 1.6 : 4.5;
        const residualTarget = isFrictional ? peakStrength * 0.9 : Math.max(cohesion * 0.8 + normalStress * 0.35, peakStrength * 0.62);

        let nominalStress;
        if (displacement <= peakDisplacement) {
            nominalStress = peakStrength * (displacement / peakDisplacement);
        } else {
            const postPeakSpan = Math.max(0.1, maxDisplacement - peakDisplacement);
            const decayFactor = Math.min(1, (displacement - peakDisplacement) / postPeakSpan);
            nominalStress = peakStrength - (peakStrength - residualTarget) * decayFactor;
        }

        const correctedStress = nominalStress * (initialAreaMm2 / computeEffectiveArea());
        simulationData.residualStress = residualTarget;
        return Math.max(0, correctedStress);
    }

    function getConsolidationSettlement(currentTimeH) {
        const finalSettlement = 0.18 + normalStress * 0.0012;
        const rateFactor = soilType === 'sand' ? 1.3 : soilType === 'stiffClay' ? 0.55 : 0.75;
        return finalSettlement * (1 - Math.exp(-rateFactor * currentTimeH));
    }

    function drawForces(x, y, width, height, displacementPixels) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + width / 2 + displacementPixels, y - 30);
        ctx.lineTo(x + width / 2 + displacementPixels, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + width / 2 + displacementPixels - 5, y - 20);
        ctx.lineTo(x + width / 2 + displacementPixels, y - 30);
        ctx.lineTo(x + width / 2 + displacementPixels + 5, y - 20);
        ctx.fillStyle = '#3498db';
        ctx.fill();

        ctx.fillStyle = '#3498db';
        ctx.font = '12px Arial';
        ctx.fillText('σ = ' + normalStress + ' kPa', x + width / 2 + displacementPixels - 30, y - 40);

        ctx.strokeStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x + width + 30, y + height / 2);
        ctx.lineTo(x + width + 10, y + height / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + width + 20, y + height / 2 - 5);
        ctx.lineTo(x + width + 30, y + height / 2);
        ctx.lineTo(x + width + 20, y + height / 2 + 5);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        const shearStress = Math.max(0, calculateShearStress());
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('τ = ' + shearStress.toFixed(2) + ' kPa', x + width + 35, y + height / 2 - 10);
    }

    function drawMachine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const boxWidth = 400;
        const boxHeight = 200;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = 150;

        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(boxX, boxY + boxHeight / 2, boxWidth, boxHeight / 2);

        const displacementPixels = (displacement / maxDisplacement) * 100;
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(boxX + displacementPixels, boxY, boxWidth, boxHeight / 2);

        ctx.fillStyle = getSoilColor();
        const soilWidth = boxWidth * 0.9;
        const soilHeight = boxHeight * 0.8;
        const soilX = boxX + (boxWidth - soilWidth) / 2;
        const soilY = boxY + (boxHeight - soilHeight) / 2;
        ctx.fillRect(soilX + displacementPixels * 0.8, soilY, soilWidth, soilHeight);

        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + boxHeight / 2);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight / 2);
        ctx.stroke();

        drawScrews(boxX + displacementPixels, boxY, boxWidth, boxHeight);
        drawWeightSystem(boxX, boxY, boxWidth);
        drawForces(boxX, boxY, boxWidth, boxHeight, displacementPixels);

        ctx.fillStyle = '#2c3e50';
        ctx.font = '16px Arial';
        ctx.fillText('Máquina de Corte Directo HM-5750', 20, 30);
        ctx.font = '14px Arial';
        ctx.fillText(`Fase: ${phaseLabels[simulationData.phase]}`, 20, 55);
        ctx.fillText(`Tipo: ${soilType} | c: ${cohesion} kPa | φ: ${frictionAngle}°`, 20, 80);
        ctx.fillText(`σ: ${normalStress} kPa | Estado: ${saturation === 'saturated' ? 'Saturado' : 'Seco'}`, 20, 105);
        ctx.fillText(`Desplazamiento: ${displacement.toFixed(2)} mm`, 20, 130);
    }


    function getRunColor(index, alpha = 1) {
        const palette = ['#2c3e50', '#2980b9', '#8e44ad', '#d35400', '#16a085', '#c0392b'];
        const base = palette[index % palette.length];
        if (alpha === 1) return base;
        const bigint = parseInt(base.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function refreshHistoricalDatasets() {
        const runs = getRunCollection();

        if (window.shearChart) {
            const activeDataset = {
                label: 'Corrida actual',
                data: chartData.points,
                borderColor: getRunColor(0),
                backgroundColor: getRunColor(0, 0.12),
                tension: 0.3,
                fill: true,
                borderWidth: 2,
                pointRadius: 2,
                parsing: false
            };
            const historical = runs.map((run, idx) => ({
                label: `σ=${run.normalStress} kPa (${idx + 1})`,
                data: Array.isArray(run.points) ? run.points : [],
                borderColor: getRunColor(idx + 1),
                backgroundColor: 'transparent',
                tension: 0.25,
                fill: false,
                borderWidth: 2,
                pointRadius: 0,
                parsing: false
            }));
            window.shearChart.data.datasets = [activeDataset, ...historical];
            window.shearChart.update('none');
        }

        if (window.consolidationChart) {
            const activeConsolidation = {
                label: 'Consolidación actual',
                data: chartData.consolidationPoints,
                borderColor: '#16a085',
                backgroundColor: 'rgba(22, 160, 133, 0.1)',
                fill: true,
                tension: 0.25,
                parsing: false
            };
            const historicalConsolidation = runs.map((run, idx) => ({
                label: `Consolidación σ=${run.normalStress} (${idx + 1})`,
                data: Array.isArray(run.consolidationPoints) ? run.consolidationPoints : [],
                borderColor: getRunColor(idx + 1),
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.2,
                borderWidth: 1.7,
                pointRadius: 0,
                parsing: false
            }));
            window.consolidationChart.data.datasets = [activeConsolidation, ...historicalConsolidation];
            window.consolidationChart.update('none');
        }
    }

    function computeRunSummary() {
        if (!chartData.points.length) return null;
        const peakPoint = chartData.points.reduce((best, point) => (point.y > best.y ? point : best), chartData.points[0]);
        const tailPoints = chartData.points.slice(-Math.min(5, chartData.points.length));
        const residual = tailPoints.reduce((acc, point) => acc + point.y, 0) / tailPoints.length;
        return {
            runId: `run-${Date.now()}`,
            timestamp: new Date().toISOString(),
            soilType,
            normalStress,
            speed,
            peakShear: Number(peakPoint.y.toFixed(3)),
            displacementAtPeak: Number(peakPoint.x.toFixed(3)),
            residualShear: Number(residual.toFixed(3)),
            points: chartData.points,
            consolidationPoints: chartData.consolidationPoints,
            tableData: getTableDataFromDOM(),
            phase: simulationData.phase
        };
    }

    function renderRunSummary() {
        const body = document.getElementById('runSummaryBody');
        if (!body) return;
        const runs = getRunCollection();
        body.innerHTML = '';
        runs.slice().reverse().forEach((run, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${runs.length - idx}</td>
                <td>${Number(run.normalStress || 0).toFixed(0)}</td>
                <td>${Number(run.peakShear || 0).toFixed(2)}</td>
                <td>${Number(run.displacementAtPeak || 0).toFixed(2)}</td>
                <td>${Number(run.residualShear || 0).toFixed(2)}</td>
            `;
            body.appendChild(tr);
        });
    }

    function saveRunToCollection() {
        const summary = computeRunSummary();
        if (!summary) return;
        const runs = getRunCollection();
        runs.push(summary);
        try {
            localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs));
        } catch (error) {
            console.warn('No se pudo guardar corrida:', error);
        }
        renderRunSummary();
        refreshHistoricalDatasets();
    }

    function saveSimulationSnapshot() {
        if (!chartData.points.length && !chartData.consolidationPoints.length) return;
        const payload = {
            timestamp: new Date().toISOString(),
            soilType,
            cohesion,
            frictionAngle,
            normalStress,
            saturation,
            speed,
            phase: simulationData.phase,
            points: chartData.points,
            consolidationPoints: chartData.consolidationPoints,
            durationHours: simulationDurationHours,
            tableData: getTableDataFromDOM()
        };
        try {
            localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('No se pudo guardar snapshot:', error);
        }
    }

    function saveResultsToStorage(currentShearStress) {
        const safeStress = Number.isFinite(currentShearStress) ? Number(currentShearStress.toFixed(3)) : 0;
        const safeDisplacement = Number.isFinite(displacement) ? Number(displacement.toFixed(3)) : 0;
        const payload = {
            timestamp: new Date().toISOString(),
            parameters: { soilType, cohesion, frictionAngle, normalStress, saturation, speed, durationHours: simulationDurationHours },
            latest: {
                displacement: safeDisplacement,
                shearStress: safeStress,
                verticalDeformation: Number((getConsolidationSettlement(simulationData.consolidationTime) + safeDisplacement * 0.03).toFixed(3)),
                shearForce: Number((safeStress * computeEffectiveArea()).toFixed(0))
            },
            phase: simulationData.phase,
            stressStrainPoints: chartData.points,
            mohrEnvelope: window.mohrChart?.data?.datasets?.[0]?.data || [],
            consolidationPoints: chartData.consolidationPoints,
            runs: getRunCollection(),
            dataTable: getTableDataFromDOM()
        };
        try {
            localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('No se pudo guardar resultados:', error);
        }
    }

    function clearResultsStorage() {
        try {
            localStorage.removeItem(RESULTS_STORAGE_KEY);
            localStorage.removeItem(SIMULATION_STORAGE_KEY);
        } catch (error) {
            console.warn('No se pudo limpiar resultados:', error);
        }
    }

    function updateChart(currentDisplacement, currentStress) {
        if (!window.shearChart) return;
        const safeX = Number.isFinite(currentDisplacement) ? Number(currentDisplacement.toFixed(2)) : 0;
        const safeY = Number.isFinite(currentStress) ? Math.max(0, Number(currentStress.toFixed(2))) : 0;
        chartData.points.push({ x: safeX, y: safeY });
        window.shearChart.data.datasets[0].data = chartData.points;
        refreshHistoricalDatasets();
        window.shearChart.options.scales.x.min = chartLimits.xMin;
        window.shearChart.options.scales.x.max = chartLimits.xMax;
        window.shearChart.options.scales.y.min = chartLimits.yMin;
        window.shearChart.options.scales.y.max = chartLimits.yMax;
        window.shearChart.update('none');
        saveSimulationSnapshot();
    }

    function updateConsolidationChart() {
        if (!window.consolidationChart) return;
        window.consolidationChart.data.datasets[0].data = chartData.consolidationPoints;
        window.consolidationChart.options.scales.x.max = simulationDurationHours;
        window.consolidationChart.update('none');
    }

    function updateResults() {
        const shearStress = simulationData.phase === 'shear' || simulationData.phase === 'finished'
            ? calculateShearStress()
            : 0;
        const settlement = getConsolidationSettlement(simulationData.consolidationTime);

        document.getElementById('shearStrength').textContent = shearStress.toFixed(2);
        document.getElementById('horizontalDeformation').textContent = displacement.toFixed(2);
        document.getElementById('verticalDeformation').textContent = (settlement + displacement * 0.03).toFixed(3);
        document.getElementById('shearForce').textContent = (shearStress * computeEffectiveArea()).toFixed(0);

        if (simulationData.phase === 'shear') {
            updateChart(displacement, shearStress);
        }

        saveResultsToStorage(shearStress);
    }

    function checkConsolidationCriterion() {
        if (simulationData.consolidationTime - simulationData.lastConsolidationCheck < consolidationCheckInterval) {
            return false;
        }

        const currentSettlement = getConsolidationSettlement(simulationData.consolidationTime);
        const deltaS = currentSettlement - simulationData.lastConsolidationSettlement;
        const deltaT = simulationData.consolidationTime - simulationData.lastConsolidationCheck;
        const slope = deltaS / Math.max(0.0001, deltaT);

        simulationData.lastConsolidationCheck = simulationData.consolidationTime;
        simulationData.lastConsolidationSettlement = currentSettlement;

        return Math.abs(slope) < consolidationSlopeThreshold || simulationData.consolidationTime >= consolidationDurationMax;
    }

    function runConsolidationStep(durationFactor) {
        simulationData.consolidationTime += (speed / 120) * durationFactor;
        const settlement = getConsolidationSettlement(simulationData.consolidationTime);
        chartData.consolidationPoints.push({
            x: Number(simulationData.consolidationTime.toFixed(2)),
            y: Number(settlement.toFixed(3))
        });
        updateConsolidationChart();

        if (checkConsolidationCriterion()) {
            simulationData.consolidationComplete = true;
            setPhase('shear');
            startBtn.innerHTML = '<i class="fas fa-play"></i> Cortando...';
        }
    }

    function animate() {
        if (!isRunning) return;

        const durationFactor = 24 / simulationDurationHours;

        if (simulationData.phase === 'consolidation') {
            runConsolidationStep(durationFactor);
        } else if (simulationData.phase === 'shear') {
            displacement += (speed / 60) * durationFactor;
            if (displacement >= maxDisplacement) {
                displacement = maxDisplacement;
                stopSimulation();
            }
        }

        drawMachine();
        updateResults();

        if (isRunning) {
            animationId = requestAnimationFrame(animate);
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
        row.querySelectorAll('input').forEach((input) => input.addEventListener('input', syncChartsFromTable));
        row.querySelector('.remove-row-btn').addEventListener('click', () => {
            row.remove();
            syncChartsFromTable();
        });
        tbody.appendChild(row);
    }

    const defaultTableRows = [
        { time: 0, load: 0, horizontal: 0, vertical: 0 },
        { time: 2, load: 35, horizontal: 0.4, vertical: 0.08 },
        { time: 4, load: 72, horizontal: 1.1, vertical: 0.16 },
        { time: 6, load: 108, horizontal: 2.3, vertical: 0.23 },
        { time: 8, load: 135, horizontal: 3.4, vertical: 0.28 }
    ];

    function syncChartsFromTable() {
        const validData = getTableDataFromDOM()
            .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.load) && Number.isFinite(row.horizontal) && Number.isFinite(row.vertical))
            .sort((a, b) => a.horizontal - b.horizontal);

        chartData.points = validData.map((row) => ({ x: row.horizontal, y: row.load }));
        chartData.consolidationPoints = validData.map((row) => ({ x: row.time, y: row.vertical }));

        if (window.shearChart) {
            window.shearChart.data.datasets[0].data = chartData.points;
        refreshHistoricalDatasets();
            window.shearChart.update();
        }
        updateConsolidationChart();
        updateMohrChart();
        saveSimulationSnapshot();
        saveResultsToStorage(calculateShearStress());
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
            updateConsolidationChart();
        });
        syncChartsFromTable();
    }

    function startSimulation() {
        if (isRunning) return;
        if (!simulationData.consolidationComplete && simulationData.phase === 'finished') {
            setPhase('consolidation');
            chartData.points = [];
            chartData.consolidationPoints = [];
            displacement = 0;
            simulationData.consolidationTime = 0;
            simulationData.lastConsolidationCheck = 0;
            simulationData.lastConsolidationSettlement = 0;
        }
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        startBtn.innerHTML = simulationData.phase === 'consolidation'
            ? '<i class="fas fa-play"></i> Consolidando...'
            : '<i class="fas fa-play"></i> Cortando...';
        animate();
    }

    function pauseSimulation() {
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Reanudar';
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        saveSimulationSnapshot();
    }

    function stopSimulation() {
        isRunning = false;
        setPhase('finished');
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-check"></i> Completado';
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        saveSimulationSnapshot();
        saveRunToCollection();
    }

    function resetSimulation() {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        isRunning = false;
        displacement = 0;
        chartData = { points: [], consolidationPoints: [] };
        simulationData.consolidationTime = 0;
        simulationData.lastConsolidationCheck = 0;
        simulationData.lastConsolidationSettlement = 0;
        simulationData.consolidationComplete = false;
        setPhase('finished');
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ensayo';

        if (window.shearChart) {
            window.shearChart.data.datasets[0].data = [];
            refreshHistoricalDatasets();
            window.shearChart.options.scales.x.max = chartLimits.xMax;
            window.shearChart.update();
        }
        if (window.consolidationChart) {
            window.consolidationChart.data.datasets[0].data = [];
            refreshHistoricalDatasets();
            window.consolidationChart.update();
        }

        document.getElementById('shearStrength').textContent = '-';
        document.getElementById('horizontalDeformation').textContent = '-';
        document.getElementById('verticalDeformation').textContent = '-';
        document.getElementById('shearForce').textContent = '-';

        clearResultsStorage();
        drawMachine();
    }

    function initCharts() {
        const chartCanvas = document.getElementById('chartCanvas');
        const mohrCanvas = document.getElementById('mohrCanvas');
        const consolidationCanvas = document.getElementById('consolidationCanvas');
        if (!chartCanvas || !mohrCanvas || !consolidationCanvas) return;

        chartCanvas.style.height = '250px';
        mohrCanvas.style.height = '250px';
        consolidationCanvas.style.height = '250px';

        window.shearChart = new Chart(chartCanvas.getContext('2d'), {
            type: 'line',
            data: { datasets: [{ label: 'Esfuerzo de Corte (kPa)', data: [], borderColor: '#2c3e50', backgroundColor: 'rgba(44, 62, 80, 0.1)', tension: 0.3, fill: true, borderWidth: 2, pointRadius: 2, pointHoverRadius: 4, parsing: false }] },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.6,
                animation: { duration: 0 },
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Desplazamiento Horizontal (mm)' }, beginAtZero: true, min: chartLimits.xMin, max: chartLimits.xMax, ticks: { stepSize: 1 } },
                    y: { title: { display: true, text: 'Esfuerzo de Corte (kPa)' }, beginAtZero: true, min: chartLimits.yMin, max: chartLimits.yMax, ticks: { stepSize: 50 } }
                }
            }
        });

        window.mohrChart = new Chart(mohrCanvas.getContext('2d'), {
            type: 'scatter',
            data: { datasets: [{ label: 'Envolvente de Falla', data: [], borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.1)', showLine: true, fill: false, borderWidth: 2, pointRadius: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.6,
                scales: {
                    x: { title: { display: true, text: 'Esfuerzo Normal (kPa)' }, min: 0, max: 450 },
                    y: { title: { display: true, text: 'Resistencia al Corte (kPa)' }, min: 0, max: 350 }
                }
            }
        });

        window.consolidationChart = new Chart(consolidationCanvas.getContext('2d'), {
            type: 'line',
            data: { datasets: [{ label: 'Desplazamiento Vertical (mm)', data: [], borderColor: '#16a085', backgroundColor: 'rgba(22, 160, 133, 0.1)', fill: true, tension: 0.25, parsing: false }] },
            options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1.6, scales: { x: { type: 'linear', title: { display: true, text: 'Tiempo (h)' }, min: 0, max: simulationDurationHours }, y: { title: { display: true, text: 'Desplazamiento Vertical (mm)' }, min: 0 } } }
        });

        updateMohrChart();
        refreshHistoricalDatasets();
    }

    function updateMohrChart() {
        if (!window.mohrChart) return;
        const frictionRad = (frictionAngle * Math.PI) / 180;
        const data = [0, 100, 200, 300, 400].map((x) => ({ x, y: cohesion + x * Math.tan(frictionRad) }));
        window.mohrChart.data.datasets[0].data = data;
        window.mohrChart.update();
    }

    soilTypeSelect.addEventListener('change', function() {
        soilType = this.value;
        if (simulationPresets[soilType]) {
            cohesion = simulationPresets[soilType].cohesion;
            frictionAngle = simulationPresets[soilType].friction;
            speed = simulationPresets[soilType].recommendedSpeed;
        }
        cohesionSlider.value = cohesion;
        frictionSlider.value = frictionAngle;
        speedSlider.value = speed;
        updateControlValues();
        drawMachine();
        updateMohrChart();
        refreshHistoricalDatasets();
    });

    cohesionSlider.addEventListener('input', function() { cohesion = parseInt(this.value, 10); updateControlValues(); drawMachine(); updateMohrChart(); });
    frictionSlider.addEventListener('input', function() { frictionAngle = parseInt(this.value, 10); updateControlValues(); drawMachine(); updateMohrChart(); });
    normalStressSlider.addEventListener('input', function() { normalStress = parseInt(this.value, 10); updateControlValues(); drawMachine(); });
    saturationSelect.addEventListener('change', function() { saturation = this.value; drawMachine(); });
    speedSlider.addEventListener('input', function() { speed = parseFloat(this.value); updateControlValues(); });

    startBtn.addEventListener('click', startSimulation);
    pauseBtn.addEventListener('click', pauseSimulation);
    resetBtn.addEventListener('click', resetSimulation);

    updateControlValues();
    initCharts();
    setupSimulationTable();
    renderRunSummary();
        refreshHistoricalDatasets();
    setPhase('finished');
    drawMachine();

    console.log('Simulación inicializada correctamente');
});
