/* Reveal article text as it enters from below; replay after scrolling back up. */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;

  var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var nodes = document.querySelectorAll(
    '.article__body > h2, .article__body > h3, .article__body > p, ' +
    '.article__body figcaption, #method h2, #method h3, #method p, #method li, ' +
    '.corrections h2, .corrections p'
  );
  var observer;

  function reveal(node) {
    node.classList.remove('is-pending');
  }

  function configure() {
    if (observer) observer.disconnect();
    nodes.forEach(function (node) {
      node.classList.remove('scroll-reveal', 'is-pending');
    });
    if (preference.matches) return;

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
        } else if (entry.boundingClientRect.top >=
          (entry.rootBounds ? entry.rootBounds.bottom : window.innerHeight - 24)) {
          // Only re-arm text below the viewport. Text already read stays visible.
          entry.target.classList.add('is-pending');
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    nodes.forEach(function (node) {
      if (node.getBoundingClientRect().top >= window.innerHeight) {
        node.classList.add('is-pending');
      }
      node.classList.add('scroll-reveal');
      observer.observe(node);
    });
  }

  // Keyboard navigation must reveal a focused link even before scrolling ends.
  document.addEventListener('focusin', function (event) {
    var target = event.target.closest('.scroll-reveal');
    if (target) reveal(target);
  });
  if (preference.addEventListener) preference.addEventListener('change', configure);
  configure();
})();
