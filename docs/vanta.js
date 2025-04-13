// 1) Initialize Vanta Background
document.addEventListener("DOMContentLoaded", () => {
    VANTA.NET({
      el: "#vanta-bg",   // The container div
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      scale: 1.0,
      scaleMobile: 1.0,
      // Customize color, background, etc.:
     color: 0xAED6F1,         // Soft pastel blue
    backgroundColor: 0xFFFFFF  // Pure white background
    });
  
    // 2) Initialize Typed.js
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