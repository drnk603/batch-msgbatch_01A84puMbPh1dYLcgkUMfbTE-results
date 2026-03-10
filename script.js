(function (global) {
  'use strict';

  global.__app = global.__app || {};
  var __app = global.__app;

  function debounce(fn, wait) {
    var timer;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function throttle(fn, limit) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= limit) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  function getHeaderHeight() {
    var header = document.querySelector('.l-header');
    return header ? header.getBoundingClientRect().height : 72;
  }

  function isHomePage() {
    var path = global.location.pathname;
    return path === '/' || path === '/index.html' || path.endsWith('/index.html');
  }

  function isOnline() {
    return global.navigator.onLine !== false;
  }

  __app.notify = function (message, type) {
    type = type || 'success';
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      container.className = 'toast-container-fixed';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'c-toast c-toast--' + (type === 'error' ? 'error' : type);
    toast.setAttribute('role', 'alert');
    var msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'c-toast__close';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () {
      removeToast(toast);
    });
    toast.appendChild(msgSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);
    setTimeout(function () {
      removeToast(toast);
    }, 6000);
  };

  function removeToast(toast) {
    toast.classList.add('c-toast--hiding');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  __app.initNav = function () {
    if (__app._navReady) return;
    __app._navReady = true;

    var toggle = document.querySelector('.c-nav__toggle, .navbar-toggler');
    var collapse = document.querySelector('.navbar-collapse');
    var body = document.body;

    if (!toggle || !collapse) return;

    var headerLinks = document.querySelectorAll('.navbar-collapse .c-nav__link, .navbar-collapse .nav-link');

    function openMenu() {
      collapse.classList.add('show');
      toggle.setAttribute('aria-expanded', 'true');
      body.classList.add('u-no-scroll');
    }

    function closeMenu() {
      collapse.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
      body.classList.remove('u-no-scroll');
    }

    function isOpen() {
      return collapse.classList.contains('show');
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    for (var i = 0; i < headerLinks.length; i++) {
      headerLinks[i].addEventListener('click', function () {
        if (isOpen()) closeMenu();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeMenu();
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (!collapse.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        closeMenu();
      }
    });

    global.addEventListener('resize', debounce(function () {
      if (global.innerWidth >= 768 && isOpen()) {
        closeMenu();
      }
    }, 100));
  };

  __app.initActiveMenu = function () {
    if (__app._activeMenuReady) return;
    __app._activeMenuReady = true;

    var links = document.querySelectorAll('.c-nav__link, .navbar-nav .nav-link');
    var path = global.location.pathname;
    var normalizedPath = path.replace(/\/index\.html$/, '/') || '/';

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var linkHref = link.getAttribute('href') || '';
      var normalizedHref = linkHref.replace(/\/index\.html$/, '/') || '/';

      link.removeAttribute('aria-current');
      link.classList.remove('is-active');

      var isMatch = false;

      if (normalizedHref === '/' && (normalizedPath === '/' || isHomePage())) {
        isMatch = true;
      } else if (normalizedHref !== '/' && normalizedPath.indexOf(normalizedHref) === 0) {
        isMatch = true;
      }

      if (isMatch) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('is-active');
      }
    }
  };

  __app.initAnchors = function () {
    if (__app._anchorsReady) return;
    __app._anchorsReady = true;

    var anchors = document.querySelectorAll('a[href^="#"]');

    for (var i = 0; i < anchors.length; i++) {
      (function (anchor) {
        var href = anchor.getAttribute('href');
        if (!href || href === '#' || href === '#!') return;

        if (!isHomePage()) {
          anchor.setAttribute('href', '/' + href);
          return;
        }

        anchor.addEventListener('click', function (e) {
          var target = document.querySelector(href);
          if (!target) return;
          e.preventDefault();

          var offset = getHeaderHeight();
          var top = target.getBoundingClientRect().top + global.pageYOffset - offset;

          global.scrollTo({ top: top, behavior: 'smooth' });

          if (global.history.pushState) {
            global.history.pushState(null, '', href);
          } else {
            global.location.hash = href;
          }
        });
      })(anchors[i]);
    }
  };

  __app.initScrollSpy = function () {
    if (__app._scrollSpyReady) return;
    __app._scrollSpyReady = true;

    if (!isHomePage()) return;

    var navLinks = document.querySelectorAll('.c-nav__link[href^="#"], .navbar-nav .nav-link[href^="#"]');
    if (!navLinks.length) return;

    var sections = [];
    for (var i = 0; i < navLinks.length; i++) {
      var href = navLinks[i].getAttribute('href');
      if (href && href.length > 1) {
        var section = document.querySelector(href);
        if (section) {
          sections.push({ el: section, link: navLinks[i] });
        }
      }
    }

    if (!sections.length) return;

    function updateSpy() {
      var scrollY = global.pageYOffset;
      var headerH = getHeaderHeight();
      var activeIndex = -1;

      for (var j = 0; j < sections.length; j++) {
        var top = sections[j].el.getBoundingClientRect().top + scrollY - headerH - 10;
        if (scrollY >= top) {
          activeIndex = j;
        }
      }

      for (var k = 0; k < sections.length; k++) {
        sections[k].link.classList.remove('is-active');
        sections[k].link.removeAttribute('aria-current');
        if (k === activeIndex) {
          sections[k].link.classList.add('is-active');
          sections[k].link.setAttribute('aria-current', 'page');
        }
      }
    }

    global.addEventListener('scroll', throttle(updateSpy, 100), { passive: true });
    updateSpy();
  };

  __app.initScrollToTop = function () {
    if (__app._scrollTopReady) return;
    __app._scrollTopReady = true;

    var btn = document.querySelector('.c-scroll-top, .js-scroll-top, [data-scroll-top]');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'c-scroll-top';
      btn.setAttribute('aria-label', 'Scroll to top');
      btn.setAttribute('type', 'button');
      btn.textContent = '↑';
      document.body.appendChild(btn);
    }

    function toggleBtn() {
      if (global.pageYOffset > 400) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    }

    btn.addEventListener('click', function () {
      global.scrollTo({ top: 0, behavior: 'smooth' });
    });

    global.addEventListener('scroll', throttle(toggleBtn, 150), { passive: true });
    toggleBtn();
  };

  __app.initImages = function () {
    if (__app._imagesReady) return;
    __app._imagesReady = true;

    var images = document.querySelectorAll('img');
    var svgPlaceholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
      '<rect width="400" height="300" fill="#e9ecef"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#adb5bd" font-family="sans-serif" font-size="16">Image</text>' +
      '</svg>'
    );

    for (var i = 0; i < images.length; i++) {
      (function (img) {
        var isLogo = img.classList.contains('c-logo__img') || img.closest('.c-logo') !== null;
        var isCritical = img.hasAttribute('data-critical');

        if (!img.hasAttribute('loading') && !isLogo && !isCritical) {
          img.setAttribute('loading', 'lazy');
        }

        img.addEventListener('error', function () {
          if (img._fallbackApplied) return;
          img._fallbackApplied = true;
          img.src = svgPlaceholder;
        });
      })(images[i]);
    }
  };

  __app.initCountUp = function () {
    if (__app._countUpReady) return;
    __app._countUpReady = true;

    var counters = document.querySelectorAll('[data-count-up]');
    if (!counters.length) return;

    var started = [];

    function runCounter(el) {
      var target = parseFloat(el.getAttribute('data-count-up')) || 0;
      var duration = parseInt(el.getAttribute('data-count-duration'), 10) || 1500;
      var suffix = el.getAttribute('data-count-suffix') || '';
      var prefix = el.getAttribute('data-count-prefix') || '';
      var decimals = (target % 1 !== 0) ? 1 : 0;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = target * eased;
        el.textContent = prefix + current.toFixed(decimals) + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
        }
      }

      requestAnimationFrame(step);
    }

    if (!global.IntersectionObserver) {
      for (var i = 0; i < counters.length; i++) {
        runCounter(counters[i]);
      }
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      for (var e = 0; e < entries.length; e++) {
        var entry = entries[e];
        if (entry.isIntersecting && started.indexOf(entry.target) === -1) {
          started.push(entry.target);
          runCounter(entry.target);
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.3 });

    for (var j = 0; j < counters.length; j++) {
      observer.observe(counters[j]);
    }
  };

  __app.initRipple = function () {
    if (__app._rippleReady) return;
    __app._rippleReady = true;

    var buttons = document.querySelectorAll('.c-button, button.c-button');

    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          var existing = btn.querySelector('.c-ripple');
          if (existing) existing.parentNode.removeChild(existing);

          var rect = btn.getBoundingClientRect();
          var ripple = document.createElement('span');
          ripple.className = 'c-ripple';
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          ripple.setAttribute('data-x', x);
          ripple.setAttribute('data-y', y);
          btn.appendChild(ripple);

          setTimeout(function () {
            if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
          }, 600);
        });
      })(buttons[i]);
    }
  };

  __app.initPrivacyModal = function () {
    if (__app._privacyModalReady) return;
    __app._privacyModalReady = true;

    var triggers = document.querySelectorAll('.c-form__policy-link, [data-modal="privacy"], a[href="privacy.html"]');
    if (!triggers.length) return;

    var modal = document.getElementById('privacy-modal');
    var backdrop = document.getElementById('modal-backdrop');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'privacy-modal';
      modal.className = 'c-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Privacy Policy');

      var modalInner = document.createElement('div');
      modalInner.className = 'c-modal__inner';

      var modalHeader = document.createElement('div');
      modalHeader.className = 'c-modal__header';

      var modalTitle = document.createElement('h2');
      modalTitle.className = 'c-modal__title';
      modalTitle.textContent = 'Privacy Policy';

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'c-modal__close';
      closeBtn.setAttribute('aria-label', 'Close Privacy Policy');
      closeBtn.textContent = '×';

      var modalBody = document.createElement('div');
      modalBody.className = 'c-modal__body';
      modalBody.innerHTML = '<p>Please visit our <a href="privacy.html">Privacy Policy page</a> for full details on how we collect, use and protect your data.</p>';

      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeBtn);
      modalInner.appendChild(modalHeader);
      modalInner.appendChild(modalBody);
      modal.appendChild(modalInner);
      document.body.appendChild(modal);

      closeBtn.addEventListener('click', closeModal);
    }

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      backdrop.className = 'c-modal-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', closeModal);
    }

    function openModal(e) {
      var href = this.getAttribute('href');
      if (href && href !== '#' && href !== 'privacy.html' && href.indexOf('#') !== 0) return;
      if (href === 'privacy.html') return;
      e.preventDefault();
      modal.classList.add('is-open');
      backdrop.classList.add('is-visible');
      document.body.classList.add('u-no-scroll');
      modal.focus();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      document.body.classList.remove('u-no-scroll');
    }

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.keyCode === 27) && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', openModal);
    }
  };

  function setFieldError(errorEl, groupEl, message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'flex';
    }
    if (groupEl) groupEl.classList.add('has-error');
  }

  function clearFieldError(errorEl, groupEl) {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    if (groupEl) groupEl.classList.remove('has-error');
  }

  function getGroup(field) {
    return field.closest('.c-form__group') || field.closest('.mb-3') || field.parentNode;
  }

  function validateName(value) {
    return value.trim().length >= 2;
  }

  function validateEmail(value) {
    return /^[^s@]+@[^s@]+\.[^s@]+$/.test(value.trim());
  }

  function validatePhone(value) {
    return /^[-ds+()]{7,20}$/.test(value.trim());
  }

  function validateMessage(value) {
    return value.trim().length >= 10;
  }

  function validateSelect(value) {
    return value !== '' && value !== null && value !== undefined;
  }

  function validateDate(value) {
    if (!value) return false;
    var d = new Date(value);
    return !isNaN(d.getTime()) && d >= new Date(new Date().toDateString());
  }

  function blockSubmit(btn, originalHTML) {
    btn.disabled = true;
    var spinner = document.createElement('span');
    spinner.className = 'c-btn-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    btn.innerHTML = '';
    btn.appendChild(spinner);
    var txt = document.createTextNode(' Sending…');
    btn.appendChild(txt);
    return originalHTML;
  }

  function restoreSubmit(btn, originalHTML) {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }

  __app.initGdprForm = function () {
    var form = document.getElementById('gdpr-request-form');
    if (!form) return;

    var honeypot = form.querySelector('[name="website"]');
    if (!honeypot) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = 'website';
      hp.setAttribute('tabindex', '-1');
      hp.setAttribute('autocomplete', 'off');
      hp.className = 'u-sr-only';
      form.appendChild(hp);
      honeypot = hp;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (honeypot && honeypot.value) return;

      var nameField = document.getElementById('gdpr-name');
      var emailField = document.getElementById('gdpr-email');
      var typeField = document.getElementById('gdpr-request-type');
      var messageField = document.getElementById('gdpr-message');
      var consentField = document.getElementById('gdpr-consent');

      var nameError = document.getElementById('gdpr-name-error');
      var emailError = document.getElementById('gdpr-email-error');
      var typeError = document.getElementById('gdpr-request-type-error');
      var messageError = document.getElementById('gdpr-message-error');
      var consentError = document.getElementById('gdpr-consent-error');

      var valid = true;

      clearFieldError(nameError, getGroup(nameField));
      clearFieldError(emailError, getGroup(emailField));
      clearFieldError(typeError, getGroup(typeField));
      clearFieldError(messageError, getGroup(messageField));
      clearFieldError(consentError, getGroup(consentField));

      if (!nameField || !validateName(nameField.value)) {
        setFieldError(nameError, nameField ? getGroup(nameField) : null, 'Please enter your full name (at least 2 characters).');
        valid = false;
      }

      if (!emailField || !validateEmail(emailField.value)) {
        setFieldError(emailError, emailField ? getGroup(emailField) : null, 'Please enter a valid email address.');
        valid = false;
      }

      if (!typeField || !validateSelect(typeField.value)) {
        setFieldError(typeError, typeField ? getGroup(typeField) : null, 'Please select a request type.');
        valid = false;
      }

      if (!messageField || !validateMessage(messageField.value)) {
        setFieldError(messageError, messageField ? getGroup(messageField) : null, 'Please describe your request (at least 10 characters).');
        valid = false;
      }

      if (!consentField || !consentField.checked) {
        setFieldError(consentError, getGroup(consentField), 'You must accept the privacy policy to proceed.');
        valid = false;
      }

      if (!valid) {
        var firstErr = form.querySelector('.c-form__group.has-error .c-form__input');
        if (firstErr) firstErr.focus();
        return;
      }

      if (!isOnline()) {
        __app.notify('Error connecting to server, please try again later.', 'error');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var originalHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) blockSubmit(submitBtn, originalHTML);

      var formData = {};
      var elements = form.elements;
      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        if (el.name && el.type !== 'submit' && el.name !== 'website') {
          formData[el.name] = el.type === 'checkbox' ? el.checked : el.value;
        }
      }

      setTimeout(function () {
        if (submitBtn) restoreSubmit(submitBtn, originalHTML);
        global.location.href = 'thank_you.html';
      }, 800);
    });
  };

  __app.initServicesForm = function () {
    var form = document.getElementById('services-contact-form');
    if (!form) return;

    var honeypot = form.querySelector('[name="website"]');
    if (!honeypot) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = 'website';
      hp.setAttribute('tabindex', '-1');
      hp.setAttribute('autocomplete', 'off');
      hp.className = 'u-sr-only';
      form.appendChild(hp);
      honeypot = hp;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (honeypot && honeypot.value) return;

      var nameField = document.getElementById('svc-name');
      var emailField = document.getElementById('svc-email');
      var phoneField = document.getElementById('svc-phone');
      var serviceField = document.getElementById('svc-service');
      var consentField = document.getElementById('svc-consent');

      var nameError = document.getElementById('svc-name-error');
      var emailError = document.getElementById('svc-email-error');
      var phoneError = document.getElementById('svc-phone-error');
      var serviceError = document.getElementById('svc-service-error');
      var consentError = document.getElementById('svc-consent-error');

      var valid = true;

      clearFieldError(nameError, nameField ? getGroup(nameField) : null);
      clearFieldError(emailError, emailField ? getGroup(emailField) : null);
      clearFieldError(phoneError, phoneField ? getGroup(phoneField) : null);
      clearFieldError(serviceError, serviceField ? getGroup(serviceField) : null);
      clearFieldError(consentError, consentField ? getGroup(consentField) : null);

      if (!nameField || !validateName(nameField.value)) {
        setFieldError(nameError, nameField ? getGroup(nameField) : null, 'Please enter your name (at least 2 characters).');
        valid = false;
      }

      if (!emailField || !validateEmail(emailField.value)) {
        setFieldError(emailError, emailField ? getGroup(emailField) : null, 'Please enter a valid email address.');
        valid = false;
      }

      if (!phoneField || !validatePhone(phoneField.value)) {
        setFieldError(phoneError, phoneField ? getGroup(phoneField) : null, 'Please enter a valid phone number (7–20 digits).');
        valid = false;
      }

      if (!serviceField || !validateSelect(serviceField.value)) {
        setFieldError(serviceError, serviceField ? getGroup(serviceField) : null, 'Please select a service.');
        valid = false;
      }

      if (!consentField || !consentField.checked) {
        setFieldError(consentError, consentField ? getGroup(consentField) : null, 'You must accept the privacy policy.');
        valid = false;
      }

      if (!valid) {
        var firstErr = form.querySelector('.c-form__group.has-error .c-form__input, .c-form__group.has-error .form-select');
        if (firstErr) firstErr.focus();
        return;
      }

      if (!isOnline()) {
        __app.notify('Error connecting to server, please try again later.', 'error');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var originalHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) blockSubmit(submitBtn, originalHTML);

      setTimeout(function () {
        if (submitBtn) restoreSubmit(submitBtn, originalHTML);
        global.location.href = 'thank_you.html';
      }, 800);
    });
  };

  __app.initAppointmentForm = function () {
    var form = document.getElementById('appointment-form');
    if (!form) return;

    var honeypot = form.querySelector('[name="website"]');
    if (!honeypot) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = 'website';
      hp.setAttribute('tabindex', '-1');
      hp.setAttribute('autocomplete', 'off');
      hp.className = 'u-sr-only';
      form.appendChild(hp);
      honeypot = hp;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (honeypot && honeypot.value) return;

      var nameField = document.getElementById('appt-name');
      var emailField = document.getElementById('appt-email');
      var phoneField = document.getElementById('appt-phone');
      var dateField = document.getElementById('appt-date');
      var timeField = document.getElementById('appt-time');
      var privacyField = document.getElementById('appt-privacy');

      var nameError = document.getElementById('appt-name-error');
      var emailError = document.getElementById('appt-email-error');
      var phoneError = document.getElementById('appt-phone-error');
      var dateError = document.getElementById('appt-date-error');
      var timeError = document.getElementById('appt-time-error');
      var privacyError = document.getElementById('appt-privacy-error');

      var valid = true;

      clearFieldError(nameError, nameField ? getGroup(nameField) : null);
      clearFieldError(emailError, emailField ? getGroup(emailField) : null);
      clearFieldError(phoneError, phoneField ? getGroup(phoneField) : null);
      clearFieldError(dateError, dateField ? getGroup(dateField) : null);
      clearFieldError(timeError, timeField ? getGroup(timeField) : null);
      clearFieldError(privacyError, privacyField ? getGroup(privacyField) : null);

      if (!nameField || !validateName(nameField.value)) {
        setFieldError(nameError, nameField ? getGroup(nameField) : null, 'Please enter your name.');
        valid = false;
      }

      if (!emailField || !validateEmail(emailField.value)) {
        setFieldError(emailError, emailField ? getGroup(emailField) : null, 'Please enter a valid email address.');
        valid = false;
      }

      if (!phoneField || !validatePhone(phoneField.value)) {
        setFieldError(phoneError, phoneField ? getGroup(phoneField) : null, 'Please enter a valid phone number.');
        valid = false;
      }

      if (!dateField || !validateDate(dateField.value)) {
        setFieldError(dateError, dateField ? getGroup(dateField) : null, 'Please select a valid future date.');
        valid = false;
      }

      if (!timeField || !validateSelect(timeField.value)) {
        setFieldError(timeError, timeField ? getGroup(timeField) : null, 'Please select a preferred time.');
        valid = false;
      }

      if (!privacyField || !privacyField.checked) {
        setFieldError(privacyError, privacyField ? getGroup(privacyField) : null, 'You must accept the privacy policy.');
        valid = false;
      }

      if (!valid) {
        var firstErr = form.querySelector('.c-form__group.has-error .c-form__input, .c-form__group.has-error .form-select');
        if (firstErr) firstErr.focus();
        return;
      }

      if (!isOnline()) {
        __app.notify('Error connecting to server, please try again later.', 'error');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var originalHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) blockSubmit(submitBtn, originalHTML);

      setTimeout(function () {
        if (submitBtn) restoreSubmit(submitBtn, originalHTML);
        global.location.href = 'thank_you.html';
      }, 800);
    });
  };

  __app.initCallbackForm = function () {
    var form = document.getElementById('callback-form');
    if (!form) return;

    var honeypot = form.querySelector('[name="website"]');
    if (!honeypot) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = 'website';
      hp.setAttribute('tabindex', '-1');
      hp.setAttribute('autocomplete', 'off');
      hp.className = 'u-sr-only';
      form.appendChild(hp);
      honeypot = hp;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (honeypot && honeypot.value) return;

      var nameField = document.getElementById('cb-name');
      var phoneField = document.getElementById('cb-phone');
      var timeField = document.getElementById('cb-time');
      var privacyField = document.getElementById('cb-privacy');

      var nameError = document.getElementById('cb-name-error');
      var phoneError = document.getElementById('cb-phone-error');
      var timeError = document.getElementById('cb-time-error');
      var privacyError = document.getElementById('cb-privacy-error');

      var valid = true;

      clearFieldError(nameError, nameField ? getGroup(nameField) : null);
      clearFieldError(phoneError, phoneField ? getGroup(phoneField) : null);
      clearFieldError(timeError, timeField ? getGroup(timeField) : null);
      clearFieldError(privacyError, privacyField ? getGroup(privacyField) : null);

      if (!nameField || !validateName(nameField.value)) {
        setFieldError(nameError, nameField ? getGroup(nameField) : null, 'Please enter your name.');
        valid = false;
      }

      if (!phoneField || !validatePhone(phoneField.value)) {
        setFieldError(phoneError, phoneField ? getGroup(phoneField) : null, 'Please enter a valid phone number.');
        valid = false;
      }

      if (!timeField || !validateSelect(timeField.value)) {
        setFieldError(timeError, timeField ? getGroup(timeField) : null, 'Please select a preferred callback time.');
        valid = false;
      }

      if (!privacyField || !privacyField.checked) {
        setFieldError(privacyError, privacyField ? getGroup(privacyField) : null, 'You must accept the privacy policy.');
        valid = false;
      }

      if (!valid) {
        var firstErr = form.querySelector('.c-form__group.has-error .c-form__input, .c-form__group.has-error .form-select');
        if (firstErr) firstErr.focus();
        return;
      }

      if (!isOnline()) {
        __app.notify('Error connecting to server, please try again later.', 'error');
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      var originalHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) blockSubmit(submitBtn, originalHTML);

      setTimeout(function () {
        if (submitBtn) restoreSubmit(submitBtn, originalHTML);
        global.location.href = 'thank_you.html';
      }, 800);
    });
  };

  __app.initSidebarLinks = function () {
    if (__app._sidebarReady) return;
    __app._sidebarReady = true;

    var sidebarLinks = document.querySelectorAll('.c-legal-sidebar__link, .c-sidebar-link');
    if (!sidebarLinks.length) return;

    var currentPath = global.location.pathname.split('/').pop() || 'index.html';

    for (var i = 0; i < sidebarLinks.length; i++) {
      var link = sidebarLinks[i];
      var href = link.getAttribute('href') || '';
      var linkFile = href.split('/').pop();

      link.classList.remove('is-active');
      link.removeAttribute('aria-current');

      if (linkFile && linkFile === currentPath) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    }
  };

  __app.initLegalSidebarScroll = function () {
    if (__app._legalScrollReady) return;
    __app._legalScrollReady = true;

    var sidebarLinks = document.querySelectorAll('.c-legal-sidebar__link[href^="#"], .c-sidebar-link[href^="#"]');
    if (!sidebarLinks.length) return;

    for (var i = 0; i < sidebarLinks.length; i++) {
      (function (link) {
        link.addEventListener('click', function (e) {
          var href = link.getAttribute('href');
          if (!href || href === '#') return;
          var target = document.querySelector(href);
          if (!target) return;
          e.preventDefault();
          var offset = getHeaderHeight();
          var top = target.getBoundingClientRect().top + global.pageYOffset - offset - 16;
          global.scrollTo({ top: top, behavior: 'smooth' });
        });
      })(sidebarLinks[i]);
    }
  };

  __app.init = function () {
    if (__app._initDone) return;
    __app._initDone = true;

    __app.initNav();
    __app.initActiveMenu();
    __app.initAnchors();
    __app.initScrollSpy();
    __app.initScrollToTop();
    __app.initImages();
    __app.initCountUp();
    __app.initRipple();
    __app.initPrivacyModal();
    __app.initGdprForm();
    __app.initServicesForm();
    __app.initAppointmentForm();
    __app.initCallbackForm();
    __app.initSidebarLinks();
    __app.initLegalSidebarScroll();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      __app.init();
    });
  } else {
    __app.init();
  }

})(window);