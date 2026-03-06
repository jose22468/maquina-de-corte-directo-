// navigation.js - Para marcar la página activa en el menú
document.addEventListener('DOMContentLoaded', function() {
    console.log('Configurando navegación...');
    
    // Obtener el nombre del archivo actual
    const currentPage = window.location.pathname.split('/').pop();
    console.log('Página actual:', currentPage);
    
    // Encontrar todos los enlaces del menú
    const navLinks = document.querySelectorAll('nav a');
    
    // Marcar como activo el enlace que corresponde a la página actual
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        
        if (linkHref === currentPage) {
            link.classList.add('active');
            console.log('Marcando como activo:', linkHref);
        } else {
            link.classList.remove('active');
        }
    });
    
    // Si estamos en index.html y no hay enlace activo, marcar el primero
    if (currentPage === 'index.html' || currentPage === '') {
        const firstLink = document.querySelector('nav a[href="la-maquina.html"]');
        if (firstLink && !document.querySelector('nav a.active')) {
            firstLink.classList.add('active');
        }
    }
    
    console.log('Navegación configurada correctamente');
});
