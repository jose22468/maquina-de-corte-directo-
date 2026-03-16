document.addEventListener('DOMContentLoaded', () => {
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
});
