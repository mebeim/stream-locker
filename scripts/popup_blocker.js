let s = document.createElement('script');

s.textContent = '(() => {\
	console_log = console.log.bind(console);\
	window.open = function() {};\
	console.clear = function() {};\
	console.log = function() {};\
	console_log("popup blocker loaded in " + window.location.href);\
})();';

document.documentElement.appendChild(s);

var m = new MutationObserver(muts => {
	muts.forEach(mut => {
		Array.prototype.forEach.call(mut.addedNodes, node => {
			if (node.tagName == "IFRAME" || node.nodeName == "IFRAME") {
				console.log(node);
				
				node.sandbox = "allow-scripts allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-top-navigation-by-user-activation";
				
				/**
				 * TAKE NOTE, MAY NEED TO AVOID THIS IN THE FUTURE:
				 *
				 * When the embedded document has the same origin as the main page,
				 * it is strongly discouraged to use both allow-scripts and allow-same-origin
				 * at the same time, as that allows the embedded document to programmatically
				 * remove the sandbox attribute. Although it is accepted, this case is no more
				 * secure than not using the sandbox attribute.
				 *
				 * FROM: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
				 */					
			}
		});
	});
});

m.observe(document.documentElement, {childList: true, subtree: true});