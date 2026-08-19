/**
 * @license Apache-2.0
 * @aether/ssr - Resumable Micro-Hydration Delegator
 */

/**
 * Returns the ultra-lightweight inline event listener script for zero-overhead initial interaction capture.
 */
export function getDelegatedEventScript(events = ['click', 'input', 'submit', 'keydown']): string {
  const eventsList = JSON.stringify(events);
  return `<script>!function(){window.__AETHER_EVENTS__=[];var e=${eventsList};e.forEach(function(t){document.addEventListener(t,function(e){window.__AETHER_EVENTS__.push(e)},{capture:!0})})}();</script>`;
}
