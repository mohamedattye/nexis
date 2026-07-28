(() => {
  'use strict';

  let authState = window.NEXIS_AUTH || null;
  let applying = false;

  const adminOnlySelectors = [
    '#fleet-add-toggle',
    '#fleet-add-wrap',
    '[data-toggle-truck]',
    '#charges-add',
    '#charges-form-wrap',
    '[data-edit-charge]',
    '[data-delete-charge]',
    '#delete-mission-button',
    '[data-delete-expense]'
  ];

  const adminActionSelector = adminOnlySelectors.join(',');

  const style = document.createElement('style');
  style.textContent