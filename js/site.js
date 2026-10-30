(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var THEME_KEY = 'mewco-theme';
  var header = document.querySelector('[data-header]');
  var backtop = document.querySelector('[data-backtop]');
  var progress = document.querySelector('[data-read-progress]');
  var progressBar = progress ? progress.querySelector('span') : null;
  var articleBody = document.querySelector('[data-article-body]');
  var themeButtons = document.querySelectorAll('[data-theme-toggle]');

  function applyThemeLabel(theme) {
    themeButtons.forEach(function (btn) {
      var dark = theme === 'dark';
      btn.setAttribute('aria-label', dark ? '切换为浅色模式' : '切换为深色模式');
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('title', dark ? '当前：深色模式，点击切换浅色' : '当前：浅色模式，点击切换深色');
    });
    var meta = document.querySelector('meta[name="theme-color"][data-theme-color]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#050c18' : '#f5f8ff');
  }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
    }
    applyThemeLabel(theme);
  }

  applyThemeLabel(root.getAttribute('data-theme') || 'light');
  themeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });

  var menuBtn = document.querySelector('[data-menu-toggle]');
  var nav = document.querySelector('[data-nav]');

  function closeNav() {
    if (!menuBtn) return;
    document.body.classList.remove('nav-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  function openNav() {
    if (!menuBtn) return;
    document.body.classList.add('nav-open');
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      if (document.body.classList.contains('nav-open')) {
        closeNav();
      } else {
        openNav();
      }
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });

    var desktopQuery = window.matchMedia('(min-width: 901px)');
    var handleDesktop = function (event) {
      if (event.matches) closeNav();
    };
    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', handleDesktop);
    } else if (typeof desktopQuery.addListener === 'function') {
      desktopQuery.addListener(handleDesktop);
    }
  }

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('[data-toc] a[href^="#"]'));
  var tocTargets = tocLinks
    .map(function (link) {
      var id = link.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      return el ? { link: link, el: el } : null;
    })
    .filter(Boolean);

  var scrollQueued = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
    }

    if (backtop) {
      backtop.classList.toggle('show', y > 560);
    }

    if (progressBar && articleBody) {
      var rect = articleBody.getBoundingClientRect();
      var start = rect.top + y;
      var span = Math.max(rect.height - window.innerHeight * 0.5, 1);
      var pct = Math.min(Math.max((y - start + 120) / span, 0), 1);
      progressBar.style.width = (pct * 100).toFixed(2) + '%';
      if (progress) progress.style.opacity = pct > 0.005 && pct < 0.999 ? '1' : '0';
    }

    if (tocTargets.length) {
      var current = tocTargets[0];
      tocTargets.forEach(function (item) {
        if (item.el.getBoundingClientRect().top <= 140) current = item;
      });
      tocLinks.forEach(function (link) {
        link.classList.toggle('active', link === current.link);
      });
    }
  }

  function queueScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(function () {
      updateScrollUI();
      scrollQueued = false;
    });
  }

  window.addEventListener('scroll', queueScrollUpdate, { passive: true });
  window.addEventListener('resize', queueScrollUpdate);
  updateScrollUI();

  if (backtop) {
    backtop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      var id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  });

  var revealItems = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealItems.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealItems.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  var counters = document.querySelectorAll('[data-count]');

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    if (reduceMotion.matches) {
      el.textContent = String(target);
      return;
    }
    var duration = 1150;
    var startedAt = null;

    function tick(timestamp) {
      if (startedAt === null) startedAt = timestamp;
      var p = Math.min((timestamp - startedAt) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.floor(target * eased));
      if (p < 1) {
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = String(target);
      }
    }

    window.requestAnimationFrame(tick);
  }

  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) {
        counterObserver.observe(el);
      });
    } else {
      counters.forEach(animateCounter);
    }
  }
})();