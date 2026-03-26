document.addEventListener("DOMContentLoaded", () => {
    // 1. Hero Background Parallax logic
    const heroBg = document.querySelector('.parallax-bg');
    if(heroBg) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20; // -10px to +10px
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            heroBg.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
        });
    }

    // 2. 3D Card Hover Logic (Preserve-3D Tilt Effect)
    const tiltCards = document.querySelectorAll('.tilt-card');
    
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const wrapper = card.parentElement;
            const rect = wrapper.getBoundingClientRect();
            
            // Get mouse position relative to the wrapper center
            const x = e.clientX - rect.left; // x pos within the element
            const y = e.clientY - rect.top;  // y pos within the element
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Calculate rotation. Inverse relationship to create natural tilt
            // Max rotation is roughly 15 degrees
            const rotateX = ((y - centerY) / centerY) * -15; 
            const rotateY = ((x - centerX) / centerX) * 15;

            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        // Reset transform when mouse leaves
        card.addEventListener('mouseleave', () => {
            card.style.transform = `rotateX(0deg) rotateY(0deg)`;
            // Add transition class for smooth return
            card.classList.add('transition-return');
            setTimeout(() => card.classList.remove('transition-return'), 300);
        });
        
        // Remove return transition when entering to keep instantaneous mouse tracking
        card.addEventListener('mouseenter', () => {
            card.classList.remove('transition-return');
        });
    });
});
