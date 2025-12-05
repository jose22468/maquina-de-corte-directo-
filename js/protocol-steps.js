// protocol-steps.js - Control del cuaderno de protocolo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando pasos del protocolo...');
    
    // Verificar que estamos en la página de protocolo
    const stepsNav = document.querySelector('.steps-navigation');
    if (!stepsNav) {
        console.log('No es la página de protocolo');
        return;
    }
    
    // Datos de los pasos
    const stepsData = {
        1: {
            icon: 'fa-tools',
            title: 'Preparación de la Máquina',
            content: `Antes de comenzar el ensayo, es fundamental verificar que la máquina Humboldt HM-5750 esté correctamente nivelada y estable. Utilice un nivel de burbuja para comprobar la horizontalidad de la base. Asegúrese de que todos los componentes móviles se desplacen suavemente sin obstrucciones.<br><br>
            Verifique que todos los indicadores de lectura (dial gauges) estén en posición cero. Si es necesario, ajuste los indicadores girando suavemente la corona exterior hasta que la aguja coincida con el cero.`
        },
        2: {
            icon: 'fa-box-open',
            title: 'Montaje de la Caja de Corte',
            content: `Ensamble cuidadosamente la caja de corte, que consta de dos mitades: superior e inferior. Coloque las placas porosas en la base para permitir el drenaje del agua durante ensayos saturados. Sobre estas placas, posicione la placa de grid que servirá de apoyo a la muestra.<br><br>
            Una vez colocadas las placas, inserte los tornillos de sujeción negros en los orificios correspondientes y apriételos firmemente para mantener unidas ambas mitades de la caja durante la preparación de la muestra.`
        },
        3: {
            icon: 'fa-mountain',
            title: 'Preparación de la Muestra',
            content: `Prepare la muestra de suelo siguiendo las especificaciones del estándar ASTM D3080. La muestra debe tener un diámetro y altura específicos según el tamaño de la caja de corte utilizada. Para la HM-5750, típicamente se usan muestras de 2.5" x 2.5" (63.5 mm x 63.5 mm).<br><br>
            Si el suelo es cohesivo, puede tallarse directamente de una muestra inalterada. Si es granular, debe compactarse por capas dentro de la caja de corte. Determine la densidad inicial y el contenido de humedad de la muestra.`
        },
        4: {
            icon: 'fa-hammer',
            title: 'Compactación de la Muestra',
            content: `Para suelos granulares o remoldeados, utilice el dolly/tamper (pisón) para compactar la muestra en capas uniformes. Típicamente se compacta en 3-5 capas, aplicando el mismo número de golpes por capa para asegurar uniformidad.<br><br>
            La altura final de la muestra debe alcanzar el borde superior de la caja de corte. Enrase cuidadosamente la superficie superior con una espátula o regla metálica para obtener una superficie plana y horizontal.`
        },
        5: {
            icon: 'fa-weight-hanging',
            title: 'Aplicación de Carga Normal',
            content: `Coloque la placa de carga superior sobre la muestra preparada. Aplique la carga normal utilizando el sistema de pesos muertos. Para ensayos consolidados-drenados (CD), la carga se aplica gradualmente para permitir la consolidación completa.<br><br>
            Registre la deformación vertical durante la consolidación. La consolidación se considera completa cuando la deformación vertical se estabiliza (generalmente en 24 horas para suelos finos).`
        },
        6: {
            icon: 'fa-compress-alt',
            title: 'Inicio del Ensayo de Corte',
            content: `Una vez completada la consolidación, retire los tornillos de sujeción que mantienen unidas las dos mitades de la caja de corte. Esto permite que la mitad superior se desplace libremente durante el corte.<br><br>
            Active el motor de corte a una velocidad constante. Para suelos drenados, use una velocidad lenta (0.5-1.0 mm/min) para permitir la disipación de presión de poro.`
        },
        7: {
            icon: 'fa-ruler-combined',
            title: 'Monitoreo del Ensayo',
            content: `Durante el ensayo, registre continuamente la fuerza de corte y el desplazamiento horizontal. También monitoree la deformación vertical para detectar si el suelo se está dilatando o contrayendo.<br><br>
            Tome lecturas a intervalos regulares: cada 0.1 mm de desplazamiento al inicio y cada 0.5 mm una vez que la resistencia al corte comience a estabilizarse.`
        },
        8: {
            icon: 'fa-stop-circle',
            title: 'Finalización del Ensayo',
            content: `Detenga el ensayo cuando la fuerza de corte se estabilice o comience a disminuir, indicando que se ha alcanzado la resistencia máxima al corte. Alternativamente, detenga al alcanzar un desplazamiento horizontal del 10% del diámetro de la muestra.<br><br>
            Apague el motor de corte y retire cuidadosamente los pesos de carga normal. Documente la fuerza de corte final y el desplazamiento total alcanzado.`
        },
        9: {
            icon: 'fa-vial',
            title: 'Análisis de la Muestra Fallada',
            content: `Desmonte cuidadosamente la caja de corte y extraiga la muestra fallada. Fotografíe la superficie de falla para documentar su orientación y características.<br><br>
            Tome muestras representativas del suelo para determinar el contenido de humedad final. Compare con el contenido de humedad inicial para evaluar cambios durante el ensayo.`
        },
        10: {
            icon: 'fa-calculator',
            title: 'Cálculos y Reporte',
            content: `Calcule la resistencia al corte no drenada o los parámetros de resistencia efectivos según el tipo de ensayo realizado. Para ensayos CD, determine la cohesión (c) y el ángulo de fricción (φ).<br><br>
            Prepare un reporte completo que incluya: condiciones iniciales de la muestra, curva esfuerzo-deformación, parámetros de resistencia obtenidos, y observaciones del comportamiento durante el ensayo.`
        }
    };
    
    // Elementos del DOM
    const stepLinks = document.querySelectorAll('.step-link');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const stepIcon = document.getElementById('step-icon');
    const stepNumberDisplay = document.getElementById('step-number');
    const stepTitleIcon = document.getElementById('step-title-icon');
    const stepTitleText = document.getElementById('step-title-text');
    const stepContent = document.getElementById('step-content');
    const currentStepDisplay = document.getElementById('current-step');
    
    // Paso actual
    let currentStep = 1;
    const totalSteps = Object.keys(stepsData).length;
    
    // Función para actualizar el paso
    function updateStep(step) {
        currentStep = step;
        const stepData = stepsData[step];
        
        // Actualizar contenido
        stepIcon.className = 'fas ' + stepData.icon;
        stepNumberDisplay.textContent = step;
        stepTitleIcon.className = 'fas ' + stepData.icon;
        stepTitleText.textContent = stepData.title;
        stepContent.innerHTML = stepData.content;
        currentStepDisplay.textContent = step;
        
        // Actualizar navegación de pasos
        stepLinks.forEach(link => {
            link.classList.remove('active');
            if (parseInt(link.getAttribute('data-step')) === step) {
                link.classList.add('active');
            }
        });
        
        // Actualizar botones de navegación
        prevBtn.disabled = step === 1;
        nextBtn.disabled = step === totalSteps;
        
        // Efecto de transición
        stepContent.style.opacity = '0';
        setTimeout(() => {
            stepContent.style.opacity = '1';
        }, 150);
    }
    
    // Configurar event listeners
    stepLinks.forEach(link => {
        link.addEventListener('click', function() {
            const step = parseInt(this.getAttribute('data-step'));
            updateStep(step);
        });
    });
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentStep > 1) {
                updateStep(currentStep - 1);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentStep < totalSteps) {
                updateStep(currentStep + 1);
            }
        });
    }
    
    // Inicializar con el primer paso
    updateStep(1);
    
    console.log('Pasos del protocolo configurados correctamente');
});
