document.addEventListener('DOMContentLoaded', () => {
    initializePreparationSheetPersistence();
    initializePreparationSimulation();
});

function initializePreparationSheetPersistence() {
    const PREPARATION_STORAGE_KEY = 'directShear:preparationSheet';
    const table = document.querySelector('.checklist-section table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    function serializeSheet() {
        const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
        const rows = Array.from(tbody.querySelectorAll('tr')).map((tr) => {
            const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim());
            return cells;
        });
        return { headers, rows, updatedAt: new Date().toISOString() };
    }

    function saveSheet() {
        try {
            localStorage.setItem(PREPARATION_STORAGE_KEY, JSON.stringify(serializeSheet()));
        } catch (error) {
            console.warn('No se pudo guardar la hoja de preparación:', error);
        }
    }

    function loadSheet() {
        try {
            const raw = localStorage.getItem(PREPARATION_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
            if (!rows.length) return;

            const existingRows = Array.from(tbody.querySelectorAll('tr'));
            rows.forEach((savedRow, rowIndex) => {
                let row = existingRows[rowIndex];
                if (!row) {
                    row = document.createElement('tr');
                    const totalCols = table.querySelectorAll('thead th').length;
                    for (let i = 0; i < totalCols; i += 1) {
                        const td = document.createElement('td');
                        td.contentEditable = 'true';
                        row.appendChild(td);
                    }
                    tbody.appendChild(row);
                }

                const cells = row.querySelectorAll('td');
                savedRow.forEach((value, cellIndex) => {
                    if (cells[cellIndex]) {
                        cells[cellIndex].textContent = value || '';
                    }
                });
            });
        } catch (error) {
            console.warn('No se pudo restaurar la hoja de preparación:', error);
        }
    }

    loadSheet();
    tbody.addEventListener('input', saveSheet);
    tbody.addEventListener('blur', saveSheet, true);
}

function initializePreparationSimulation() {
    const canvas = document.getElementById('prepSimulationCanvas');
    const startBtn = document.getElementById('prepStartBtn');
    if (!canvas || !startBtn) {
        console.log('No es la página de preparación con simulador');
        return;
    }

    const pauseBtn = document.getElementById('prepPauseBtn');
    const resetBtn = document.getElementById('prepResetBtn');
    const forceInput = document.getElementById('prepForce');
    const forceValue = document.getElementById('prepForceValue');
    const layersInput = document.getElementById('prepLayers');
    const blowsInput = document.getElementById('prepBlows');
    const humidityInput = document.getElementById('prepHumidity');
    const humidityValue = document.getElementById('prepHumidityValue');
    const soilTypeInput = document.getElementById('prepSoilType');
    const phaseEl = document.getElementById('prepPhase');
    const energyEl = document.getElementById('prepEnergy');
    const compactEl = document.getElementById('prepCompaction');
    const heightEl = document.getElementById('prepHeight');

    const ctx = canvas.getContext('2d');
    let animationId = null;
    let isRunning = false;
    let phaseTick = 0;

    const soilConfigs = {
        arena: { optimumHumidity: 11, baseCompressibility: 0.65, energyFactor: 0.9, color: '#D9A066' },
        limo: { optimumHumidity: 14, baseCompressibility: 0.8, energyFactor: 1.05, color: '#B08D64' },
        arcilla: { optimumHumidity: 19, baseCompressibility: 1.2, energyFactor: 1.2, color: '#8E5E3B' }
    };

    const state = {
        layerIndex: 1,
        blowIndex: 0,
        totalBlowsDone: 0,
        accumulatedEnergy: 0,
        relativeDensity: 35,
        heightReduction: 0,
        estimatedFinalHeight: 20,
        currentPhase: 'Listo para iniciar'
    };

    function getInputConfig() {
        return {
            force: Number(forceInput.value),
            layers: Math.max(1, Number(layersInput.value)),
            blows: Math.max(1, Number(blowsInput.value)),
            humidity: Number(humidityInput.value),
            soilType: soilTypeInput.value
        };
    }

    function updateInputLabels() {
        forceValue.textContent = `${forceInput.value} kN/m³`;
        humidityValue.textContent = `${humidityInput.value}%`;
    }

    function calculateCompactionResponse(config) {
        const soil = soilConfigs[config.soilType] || soilConfigs.arena;
        const humidityGap = Math.abs(config.humidity - soil.optimumHumidity);
        const humidityEffect = Math.max(0.55, 1 - humidityGap * 0.035);
        const impactEnergy = (config.force * soil.energyFactor * humidityEffect) / (config.layers * 1.8);
        state.accumulatedEnergy += impactEnergy;

        const blowGain = soil.baseCompressibility * humidityEffect * Math.log1p(config.force / 10);
        state.relativeDensity = Math.min(100, state.relativeDensity + blowGain);
        state.heightReduction = Math.min(8.5, (state.relativeDensity - 35) * 0.09);
        state.estimatedFinalHeight = Math.max(11.5, 20 - state.heightReduction);
    }

    function updatePhaseBlock() {
        phaseEl.textContent = state.currentPhase;
        energyEl.textContent = `${state.accumulatedEnergy.toFixed(1)} kJ/m³`;
        compactEl.textContent = `${state.relativeDensity.toFixed(1)}%`;
        heightEl.textContent = `${state.estimatedFinalHeight.toFixed(2)} mm`;
    }

    function drawSimulation() {
        const config = getInputConfig();
        const soil = soilConfigs[config.soilType] || soilConfigs.arena;
        const mold = { x: 180, y: 90, width: 280, height: 210 };

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f4f6f9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(mold.x, mold.y, mold.width, mold.height);
        ctx.clearRect(mold.x + 12, mold.y + 12, mold.width - 24, mold.height - 24);

        const compactRatio = state.relativeDensity / 100;
        const soilHeight = 150 - compactRatio * 70;
        const soilTop = mold.y + mold.height - 18 - soilHeight;

        ctx.fillStyle = soil.color;
        ctx.fillRect(mold.x + 14, soilTop, mold.width - 28, soilHeight);

        ctx.fillStyle = '#5d6d7e';
        const pistonY = soilTop - 26 + Math.sin(phaseTick * 0.25) * 4;
        ctx.fillRect(mold.x + 20, pistonY, mold.width - 40, 20);
        ctx.fillRect(mold.x + mold.width / 2 - 12, pistonY - 38, 24, 38);

        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mold.x + mold.width / 2, mold.y + mold.height / 2, 115, 0, Math.PI * 2);
        ctx.stroke();
    }

    function stepSimulation() {
        if (!isRunning) return;
        const config = getInputConfig();

        const phaseOrder = ['Colocación de capa', 'Aplicación de golpe', 'Verificación de altura', 'Ajuste de humedad'];
        const phaseIndex = phaseTick % phaseOrder.length;
        state.currentPhase = `${phaseOrder[phaseIndex]} (capa ${state.layerIndex}/${config.layers})`;

        if (phaseOrder[phaseIndex] === 'Aplicación de golpe') {
            calculateCompactionResponse(config);
            state.blowIndex += 1;
            state.totalBlowsDone += 1;

            if (state.blowIndex >= config.blows) {
                state.blowIndex = 0;
                state.layerIndex += 1;
                if (state.layerIndex > config.layers) {
                    state.currentPhase = 'Compactación completada';
                    isRunning = false;
                }
            }
        }

        phaseTick += 1;
        updatePhaseBlock();
        drawSimulation();

        if (isRunning) {
            animationId = window.setTimeout(() => {
                requestAnimationFrame(stepSimulation);
            }, 500);
        }
    }

    function resetSimulation() {
        if (animationId) {
            clearTimeout(animationId);
            animationId = null;
        }
        isRunning = false;
        phaseTick = 0;
        state.layerIndex = 1;
        state.blowIndex = 0;
        state.totalBlowsDone = 0;
        state.accumulatedEnergy = 0;
        state.relativeDensity = 35;
        state.heightReduction = 0;
        state.estimatedFinalHeight = 20;
        state.currentPhase = 'Listo para iniciar';
        updateInputLabels();
        updatePhaseBlock();
        drawSimulation();
    }

    startBtn.addEventListener('click', () => {
        if (isRunning) return;
        isRunning = true;
        stepSimulation();
    });

    pauseBtn.addEventListener('click', () => {
        isRunning = false;
        if (animationId) {
            clearTimeout(animationId);
            animationId = null;
        }
        state.currentPhase = 'Pausado';
        updatePhaseBlock();
    });

    resetBtn.addEventListener('click', resetSimulation);
    [forceInput, humidityInput, layersInput, blowsInput, soilTypeInput].forEach((input) => {
        input.addEventListener('input', () => {
            updateInputLabels();
            drawSimulation();
        });
    });

    resetSimulation();
}
