        const RUNS_STORAGE_KEY = 'directShear:runs';
        const FAILURE_CRITERION_STORAGE_KEY = 'directShear:failureCriterion';
        const REPORT_METADATA_STORAGE_KEY = 'directShear:reportMetadata';
        const PREPARATION_STORAGE_KEY = 'directShear:preparationSheet';
        const PREPARATION_STATE_STORAGE_KEY = 'directShear:preparationState';
        const LAST_SIMULATION_STORAGE_KEY = 'directShear:lastSimulation';
        const LAST_RUN_STORAGE_KEY = 'directShearLastRun';
        const RESULTS_STORAGE_PREFIX = 'directShear:result';

        function getReportMetadata() {
            try {
                const raw = localStorage.getItem(REPORT_METADATA_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : {};
                return {
                    sampleId: typeof parsed.sampleId === 'string' ? parsed.sampleId : '',
                    testDate: typeof parsed.testDate === 'string' ? parsed.testDate : '',
                    operator: typeof parsed.operator === 'string' ? parsed.operator : '',
                    standard: typeof parsed.standard === 'string' ? parsed.standard : ''
                };
            } catch (error) {
                return { sampleId: '', testDate: '', operator: '', standard: '' };
            }
        }

        function saveReportMetadata(metadata) {
            try {
                localStorage.setItem(REPORT_METADATA_STORAGE_KEY, JSON.stringify(metadata));
            } catch (error) {
                console.warn('No se pudo guardar metadata de reporte:', error);
            }
        }


        function getPreparationSheet() {
            try {
                const raw = localStorage.getItem(PREPARATION_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : null;
                if (!parsed || !Array.isArray(parsed.rows)) {
                    return { headers: [], rows: [], updatedAt: null };
                }
                return {
                    headers: Array.isArray(parsed.headers) ? parsed.headers : [],
                    rows: parsed.rows,
                    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null
                };
            } catch (error) {
                console.warn('No se pudo leer hoja de preparación:', error);
                return { headers: [], rows: [], updatedAt: null };
            }
        }

        function renderPreparationSheet(preparationSheet) {
            const section = document.getElementById('preparationSheetSection');
            const content = document.getElementById('preparationSheetContent');
            const updatedAt = document.getElementById('preparationUpdatedAt');
            if (!section || !content || !updatedAt) return;

            section.style.display = 'block';
            const hasRows = Array.isArray(preparationSheet.rows) && preparationSheet.rows.length > 0;
            if (!hasRows) {
                updatedAt.textContent = '';
                content.textContent = 'No hay datos de preparación registrados';
                return;
            }

            const stamp = preparationSheet.updatedAt ? new Date(preparationSheet.updatedAt) : null;
            updatedAt.textContent = stamp && !Number.isNaN(stamp.getTime())
                ? `Última actualización: ${stamp.toLocaleString()}`
                : '';

            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');
            const headers = Array.isArray(preparationSheet.headers) ? preparationSheet.headers : [];

            if (headers.length) {
                const headRow = document.createElement('tr');
                headers.forEach((header) => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    headRow.appendChild(th);
                });
                thead.appendChild(headRow);
                table.appendChild(thead);
            }

            preparationSheet.rows.forEach((row) => {
                const tr = document.createElement('tr');
                (Array.isArray(row) ? row : []).forEach((cell) => {
                    const td = document.createElement('td');
                    td.textContent = cell == null ? '' : String(cell);
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            content.innerHTML = '';
            content.appendChild(table);
        }

        function downloadFile(content, fileName, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function escapeCsvValue(value) {
            const safeValue = value == null ? '' : String(value);
            if (safeValue.includes(',') || safeValue.includes('"') || safeValue.includes('\n')) {
                return `"${safeValue.replace(/"/g, '""')}"`;
            }
            return safeValue;
        }

        function getBehaviorType(cohesion, friction) {
            if (!Number.isFinite(cohesion) || !Number.isFinite(friction)) return 'indeterminado';
            if (cohesion <= 12 && friction >= 28) return 'friccionante';
            if (cohesion >= 25 && friction <= 20) return 'cohesivo';
            return 'mixto';
        }

        function getParameterRecommendation(behavior, criterion) {
            if (behavior === 'friccionante') {
                return criterion === 'peak'
                    ? 'Use parámetros de pico para diseño a corto plazo y estabilidad inicial.'
                    : 'Prefiera parámetros residuales para deformaciones acumuladas o estado drenado avanzado.';
            }
            if (behavior === 'cohesivo') {
                return criterion === 'peak'
                    ? 'Validar parámetros de pico con controles de sensibilidad y dispersión de corridas.'
                    : 'Para análisis conservador de largo plazo, priorice parámetros residuales.';
            }
            return 'Para suelos mixtos, reporte pico y residual; use pico en verificación inicial y residual en condición post-falla.';
        }

        function buildExportPayload(runs, analysis, metadata, preparationSheet) {
            return {
                exportTimestamp: new Date().toISOString(),
                metadata,
                criterion: analysis.criterion,
                validRuns: analysis.validRuns,
                maxShear: analysis.maxShear,
                fit: analysis.fit,
                metrics: analysis.metrics,
                runs,
                preparationSheet
            };
        }

        function validateCriticalData(runs, analysis, metadata) {
            const missing = [];
            if (!runs.length || !analysis.validRuns) missing.push('corridas válidas');
            if (!metadata.sampleId) missing.push('ID de muestra');
            if (!metadata.testDate) missing.push('fecha de ensayo');
            if (!metadata.operator) missing.push('operador');
            if (!metadata.standard) missing.push('norma seleccionada');
            return missing;
        }

        function toSafePoints(points) {
            return Array.isArray(points)
                ? points
                    .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
                    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
                    .sort((a, b) => a.x - b.x)
                : [];
        }

        function getRunCollection() {
            try {
                const raw = localStorage.getItem(RUNS_STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.warn('No se pudieron leer corridas:', error);
                return [];
            }
        }

        function clearResultsStorage() {
            const keysToRemove = [
                PREPARATION_STORAGE_KEY,
                PREPARATION_STATE_STORAGE_KEY,
                LAST_SIMULATION_STORAGE_KEY,
                LAST_RUN_STORAGE_KEY,
                RUNS_STORAGE_KEY,
                FAILURE_CRITERION_STORAGE_KEY,
                REPORT_METADATA_STORAGE_KEY
            ];

            keysToRemove.forEach((key) => localStorage.removeItem(key));
            Object.keys(localStorage)
                .filter((key) => key.startsWith(RESULTS_STORAGE_PREFIX))
                .forEach((key) => localStorage.removeItem(key));
        }

        function getFailureCriterion() {
            const raw = localStorage.getItem(FAILURE_CRITERION_STORAGE_KEY);
            return raw === 'residual' ? 'residual' : 'peak';
        }

        function computeRunMetrics(run, criterion) {
            const points = toSafePoints(run?.points);
            if (!points.length) return null;

            const sigma = Number(run?.normalStress);
            if (!Number.isFinite(sigma)) return null;

            const peakPoint = points.reduce((best, point) => (point.y > best.y ? point : best), points[0]);
            const tail = points.slice(-Math.min(5, points.length));
            const residual = tail.reduce((sum, point) => sum + point.y, 0) / tail.length;
            const tauFailure = criterion === 'residual' ? residual : peakPoint.y;

            if (!Number.isFinite(tauFailure)) return null;

            return {
                normalStress: Number(sigma.toFixed(3)),
                peakShear: Number(peakPoint.y.toFixed(3)),
                displacementAtPeak: Number(peakPoint.x.toFixed(3)),
                residualShear: Number(residual.toFixed(3)),
                failureShear: Number(tauFailure.toFixed(3))
            };
        }

        function linearRegression(points) {
            const n = points.length;
            if (!n) return null;

            const sumX = points.reduce((acc, point) => acc + point.x, 0);
            const sumY = points.reduce((acc, point) => acc + point.y, 0);
            const sumXY = points.reduce((acc, point) => acc + point.x * point.y, 0);
            const sumX2 = points.reduce((acc, point) => acc + point.x * point.x, 0);
            const denominator = n * sumX2 - sumX * sumX;

            if (!Number.isFinite(denominator) || Math.abs(denominator) < Number.EPSILON) return null;

            const slope = (n * sumXY - sumX * sumY) / denominator;
            const intercept = (sumY - slope * sumX) / n;
            const meanY = sumY / n;

            const ssRes = points.reduce((acc, point) => {
                const predicted = intercept + slope * point.x;
                return acc + (point.y - predicted) ** 2;
            }, 0);
            const ssTot = points.reduce((acc, point) => acc + (point.y - meanY) ** 2, 0);
            const r2 = ssTot <= Number.EPSILON ? 1 : 1 - (ssRes / ssTot);

            return { slope, intercept, r2 };
        }

        function computeFailureAnalysis(runs, criterion) {
            const metrics = runs
                .map((run) => computeRunMetrics(run, criterion))
                .filter(Boolean)
                .sort((a, b) => a.normalStress - b.normalStress);

            const regressionInput = metrics.map((item) => ({ x: item.normalStress, y: item.failureShear }));
            const fit = linearRegression(regressionInput);
            const linePoints = fit && metrics.length
                ? [
                    { x: 0, y: fit.intercept },
                    { x: Math.max(...metrics.map((item) => item.normalStress), 400), y: fit.intercept + fit.slope * Math.max(...metrics.map((item) => item.normalStress), 400) }
                ]
                : [];

            return {
                criterion,
                metrics,
                fit,
                linePoints,
                validRuns: metrics.length,
                maxShear: metrics.length ? Math.max(...metrics.map((item) => item.failureShear)) : 0,
                preliminary: metrics.length > 0 && metrics.length < 3
            };
        }

        // Inicializar gráficos en la página de resultados
        document.addEventListener('DOMContentLoaded', function() {
            const tableBody = document.getElementById('resultsTableBody');
            const fitQuality = document.getElementById('fitQualityInfo');
            const warning = document.getElementById('preliminaryWarning');
            const cohesionValue = document.getElementById('cohesionValue');
            const frictionValue = document.getElementById('frictionAngleValue');
            const maxShearValue = document.getElementById('maxShearStressValue');
            const sampleIdInput = document.getElementById('sampleIdInput');
            const testDateInput = document.getElementById('testDateInput');
            const operatorInput = document.getElementById('operatorInput');
            const standardInput = document.getElementById('standardInput');
            const validationMessage = document.getElementById('validationMessage');
            const conclusionBehavior = document.getElementById('conclusionBehavior');
            const conclusionRecommendation = document.getElementById('conclusionRecommendation');
            const preparationSheetContent = document.getElementById('preparationSheetContent');
            const preparationUpdatedAt = document.getElementById('preparationUpdatedAt');
            const resetAllDataBtn = document.getElementById('resetAllDataBtn');
            let stressStrainChartInstance = null;
            let failureEnvelopeChartInstance = null;

            function showValidationMessage(message, isError = true) {
                validationMessage.style.display = 'block';
                validationMessage.style.color = isError ? '#b3261e' : '#1b7f3b';
                validationMessage.textContent = message;
            }

            function hideValidationMessage() {
                validationMessage.style.display = 'none';
                validationMessage.textContent = '';
            }

            function renderCharts(runs, analysis) {
                const chartTextOptions = {
                    color: '#1f2d3d',
                    font: { size: 14, weight: '600' }
                };

                const chartCommonPlugins = {
                    legend: {
                        labels: {
                            color: '#1f2d3d',
                            font: { size: 13 }
                        }
                    }
                };

                const chartDpi = Math.max(2, window.devicePixelRatio || 1);
                const datasets = runs
                    .map((run, idx) => {
                        const points = toSafePoints(run?.points);
                        if (!points.length) return null;
                        const hue = (idx * 53) % 360;
                        return {
                            label: `σ=${Number(run?.normalStress || 0).toFixed(0)} kPa`,
                            data: points,
                            parsing: false,
                            borderColor: `hsl(${hue}, 65%, 35%)`,
                            backgroundColor: `hsla(${hue}, 65%, 35%, 0.1)`,
                            borderWidth: 2,
                            fill: false,
                            tension: 0.2,
                            pointRadius: 1
                        };
                    })
                    .filter(Boolean);

                const stressStrainChartCanvas = document.getElementById('stressStrainChart');
                if (stressStrainChartCanvas) {
                    if (stressStrainChartInstance) stressStrainChartInstance.destroy();
                    stressStrainChartInstance = new Chart(stressStrainChartCanvas.getContext('2d'), {
                        type: 'line',
                        data: {
                            datasets: datasets.length ? datasets : [{
                                label: 'Sin corridas disponibles',
                                data: [{ x: 0, y: 0 }],
                                parsing: false,
                                borderColor: '#9aa0a6',
                                pointRadius: 3,
                                showLine: false
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, devicePixelRatio: chartDpi, plugins: chartCommonPlugins, scales: { x: { type: 'linear', title: { display: true, text: 'Desplazamiento Horizontal (mm)', ...chartTextOptions }, ticks: chartTextOptions, beginAtZero: true }, y: { title: { display: true, text: 'Esfuerzo de Corte (kPa)', ...chartTextOptions }, ticks: chartTextOptions, beginAtZero: true, min: 0, max: 400 } } }
                    });
                }

                const failureEnvelopeChartCanvas = document.getElementById('failureEnvelopeChart');
                if (failureEnvelopeChartCanvas) {
                    if (failureEnvelopeChartInstance) failureEnvelopeChartInstance.destroy();
                    failureEnvelopeChartInstance = new Chart(failureEnvelopeChartCanvas.getContext('2d'), {
                        type: 'scatter',
                        data: { datasets: [{ label: `Puntos experimentales (${analysis.criterion})`, data: analysis.metrics.map((item) => ({ x: item.normalStress, y: item.failureShear })), backgroundColor: '#1e3c72', pointRadius: 6 }, { label: 'Recta ajustada', data: analysis.linePoints, borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', borderWidth: 2, fill: false, showLine: true, pointRadius: 0 }] },
                        options: { responsive: true, maintainAspectRatio: false, devicePixelRatio: chartDpi, plugins: chartCommonPlugins, scales: { x: { title: { display: true, text: 'Esfuerzo Normal (kPa)', ...chartTextOptions }, ticks: chartTextOptions, beginAtZero: true, max: 450 }, y: { title: { display: true, text: 'Resistencia al Corte (kPa)', ...chartTextOptions }, ticks: chartTextOptions, beginAtZero: true, max: 300 } } }
                    });
                }
            }

            function renderAll() {
                const runs = getRunCollection();
                const criterion = getFailureCriterion();
                const analysis = computeFailureAnalysis(runs, criterion);
                const metadataState = getReportMetadata();
                const preparationSheet = getPreparationSheet();
                renderPreparationSheet(preparationSheet);
                tableBody.innerHTML = '';
                analysis.metrics.forEach((item) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${item.normalStress.toFixed(2)}</td><td>${item.peakShear.toFixed(2)}</td><td>${item.displacementAtPeak.toFixed(2)}</td><td>${item.residualShear.toFixed(2)}</td>`;
                    tableBody.appendChild(row);
                });
                sampleIdInput.value = metadataState.sampleId;
                testDateInput.value = metadataState.testDate;
                operatorInput.value = metadataState.operator;
                standardInput.value = metadataState.standard;

                if (analysis.fit) {
                    const friction = Math.atan(analysis.fit.slope) * (180 / Math.PI);
                    cohesionValue.textContent = `${analysis.fit.intercept.toFixed(2)} kPa`;
                    frictionValue.textContent = `${friction.toFixed(2)}°`;
                    fitQuality.innerHTML = `<strong>Calidad de ajuste:</strong> R²: ${analysis.fit.r2.toFixed(4)} | Corridas válidas: ${analysis.validRuns} | Criterio: ${analysis.criterion}`;
                    const behavior = getBehaviorType(analysis.fit.intercept, friction);
                    conclusionBehavior.textContent = `Tipo de comportamiento: ${behavior}`;
                    conclusionRecommendation.textContent = `Recomendación de parámetros: ${getParameterRecommendation(behavior, analysis.criterion)}`;
                } else {
                    cohesionValue.textContent = '-- kPa';
                    frictionValue.textContent = '--°';
                    fitQuality.innerHTML = `<strong>Calidad de ajuste:</strong> R²: -- | Corridas válidas: ${analysis.validRuns} | Criterio: ${analysis.criterion}`;
                    conclusionBehavior.textContent = 'Tipo de comportamiento: indeterminado (faltan datos para ajustar c y φ).';
                    conclusionRecommendation.textContent = 'Recomendación de parámetros: complete al menos 3 corridas válidas para emitir una conclusión robusta.';
                }
                maxShearValue.textContent = `${analysis.maxShear.toFixed(2)} kPa`;
                warning.style.display = analysis.preliminary ? 'block' : 'none';
                renderCharts(runs, analysis);
                return { runs, analysis, preparationSheet };
            }

            let currentState = renderAll();

            const metadataInputs = [sampleIdInput, testDateInput, operatorInput, standardInput];
            metadataInputs.forEach((input) => {
                input.addEventListener('change', () => {
                    saveReportMetadata({
                        sampleId: sampleIdInput.value.trim(),
                        testDate: testDateInput.value,
                        operator: operatorInput.value.trim(),
                        standard: standardInput.value
                    });
                });
            });

            function validateBeforeExport() {
                const metadata = {
                    sampleId: sampleIdInput.value.trim(),
                    testDate: testDateInput.value,
                    operator: operatorInput.value.trim(),
                    standard: standardInput.value
                };
                saveReportMetadata(metadata);
                const missing = validateCriticalData(currentState.runs, currentState.analysis, metadata);
                if (missing.length) {
                    showValidationMessage(`⚠ Faltan datos críticos: ${missing.join(', ')}.`);
                    return null;
                }
                hideValidationMessage();
                return metadata;
            }

            const exportJsonBtn = document.getElementById('exportJsonBtn');
            const exportCsvBtn = document.getElementById('exportCsvBtn');
            const printReportBtn = document.getElementById('printReportBtn');

            exportJsonBtn.addEventListener('click', () => {
                const metadata = validateBeforeExport();
                if (!metadata) return;
                const payload = buildExportPayload(currentState.runs, currentState.analysis, metadata, currentState.preparationSheet);
                const stamp = metadata.testDate || new Date().toISOString().slice(0, 10);
                downloadFile(JSON.stringify(payload, null, 2), `ensayo-corte-directo-${stamp}.json`, 'application/json;charset=utf-8');
            });

            exportCsvBtn.addEventListener('click', () => {
                const metadata = validateBeforeExport();
                if (!metadata) return;
                const header = ['ID muestra', 'Fecha', 'Operador', 'Norma', 'Criterio', 'σn (kPa)', 'τ pico (kPa)', 'Despl. falla (mm)', 'τ residual (kPa)', 'τ usada (kPa)'];
                const rows = currentState.analysis.metrics.map((item) => [
                    metadata.sampleId,
                    metadata.testDate,
                    metadata.operator,
                    metadata.standard,
                    currentState.analysis.criterion,
                    item.normalStress,
                    item.peakShear,
                    item.displacementAtPeak,
                    item.residualShear,
                    item.failureShear
                ]);
                const csvLines = [header, ...rows]
                    .map((row) => row.map(escapeCsvValue).join(','));

                if (currentState.preparationSheet.rows.length) {
                    csvLines.push('');
                    csvLines.push('Hoja de preparación');
                    csvLines.push(`updatedAt,${escapeCsvValue(currentState.preparationSheet.updatedAt || '')}`);
                    if (currentState.preparationSheet.headers.length) {
                        csvLines.push(currentState.preparationSheet.headers.map(escapeCsvValue).join(','));
                    }
                    currentState.preparationSheet.rows.forEach((row) => {
                        csvLines.push((Array.isArray(row) ? row : []).map(escapeCsvValue).join(','));
                    });
                }

                const csv = csvLines.join('\n');
                const stamp = metadata.testDate || new Date().toISOString().slice(0, 10);
                downloadFile(csv, `tabla-resultados-corte-directo-${stamp}.csv`, 'text/csv;charset=utf-8');
            });

            printReportBtn.addEventListener('click', () => {
                const currentPreparationSheet = getPreparationSheet();
                renderPreparationSheet(currentPreparationSheet);
                window.print();
            });
            if (resetAllDataBtn) {
                resetAllDataBtn.addEventListener('click', () => {
                    const accepted = window.confirm('Se eliminarán todas las corridas, metadatos y hoja de preparación. ¿Desea continuar?');
                    if (!accepted) return;
                    clearResultsStorage();
                    currentState = renderAll();
                    if (preparationSheetContent) preparationSheetContent.textContent = 'No hay datos de preparación registrados';
                    if (preparationUpdatedAt) preparationUpdatedAt.textContent = '';
                    hideValidationMessage();
                    showValidationMessage('✅ Datos reiniciados correctamente.', false);
                });
            }
        });
