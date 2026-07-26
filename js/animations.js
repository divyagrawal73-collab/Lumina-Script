// js/animations.js - Page transitions and loading skeletons

const Animations = {
  showSkeleton(container, templateFn, count = 6) {
    if (!container) return;
    container.innerHTML = '';
    container.classList.add('skeleton-loading');
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      skeleton.innerHTML = templateFn ? templateFn() : `
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      `;
      container.appendChild(skeleton);
    }
  },

  hideSkeleton(container, realContent) {
    if (!container) return;
    container.classList.remove('skeleton-loading');
    if (realContent !== undefined) {
      container.innerHTML = realContent;
    }
  },

  initPageTransition() {
    document.body.classList.add('page-enter');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('page-enter');
        document.body.classList.add('page-enter-active');
      });
    });
    setTimeout(() => {
      document.body.classList.remove('page-enter-active');
    }, 300);
  },

  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Animations.initPageTransition();
  Animations.initScrollAnimations();
});