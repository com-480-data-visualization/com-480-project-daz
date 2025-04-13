document.addEventListener("DOMContentLoaded", () => {
  VANTA.NET({
    el: "#vanta-bg",   // The container div
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    scale: 0.6,
    scaleMobile: 1,
   
    color: 0xD3D3D3,         
    backgroundColor: 0xFFFFFF,  // Pure white background

    points: 10.0,           
    maxDistance: 25.0
  });

  // Initialize Typed.js as before
  new Typed('#typed-subtitle', {
    strings: [
      'Exploring Global Well-being Through Data...',
      'Integrating Happiness, Quality of Life, HDI...'
    ],
    typeSpeed: 40,
    backSpeed: 30,
    backDelay: 2000,
    loop: true
  });
});
