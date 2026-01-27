/**
 * Módulo DOM Utils
 * Funções utilitárias para manipulação do DOM
 */

/**
 * Busca um elemento por ID
 */
export function el(id) {
  return document.getElementById(id);
}

/**
 * Busca múltiplos elementos por seletores
 */
export function els(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Adiciona classe CSS
 */
export function addClass(element, className) {
  if (element) element.classList.add(className);
}

/**
 * Remove classe CSS
 */
export function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

/**
 * Mostra elemento
 */
export function show(element) {
  if (element) element.classList.remove('hidden');
}

/**
 * Esconde elemento
 */
export function hide(element) {
  if (element) element.classList.add('hidden');
}

/**
 * Define o innerHTML
 */
export function setHTML(element, html) {
  if (element) element.innerHTML = html;
}

/**
 * Limpa o innerHTML
 */
export function clear(element) {
  if (element) element.innerHTML = '';
}

/**
 * Adiciona listener de evento
 */
export function on(element, event, callback) {
  if (element) element.addEventListener(event, callback);
}

/**
 * Remove listener de evento
 */
export function off(element, event, callback) {
  if (element) element.removeEventListener(event, callback);
}

/**
 * Define atributo
 */
export function attr(element, attribute, value) {
  if (element) element.setAttribute(attribute, value);
}

/**
 * Obtém atributo
 */
export function getAttr(element, attribute) {
  return element ? element.getAttribute(attribute) : null;
}

/**
 * Obtém valor de input
 */
export function getValue(element) {
  return element ? element.value : '';
}

/**
 * Define valor de input
 */
export function setValue(element, value) {
  if (element) element.value = value;
}

/**
 * Cria um elemento
 */
export function create(tag, className = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/**
 * Toggle classe CSS
 */
export function toggleClass(element, className) {
  if (element) element.classList.toggle(className);
}

/**
 * Verifica se elemento tem classe
 */
export function hasClass(element, className) {
  return element ? element.classList.contains(className) : false;
}
