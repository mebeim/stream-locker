/**
 * This file is part of the Stream Locker Chrome extension.
 * Copyright (c) 2017 Marco Bonelli.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 */

if (!window.run) {
	run = true;

	s = document.createElement('script');
	s.textContent = 'var me=document.getElementsByTagName("script");me=me[me.length-1];window.streamLocker_open=window.open;window.open=()=>{};me.parentElement.removeChild(me);';
	document.documentElement.appendChild(s);

	touchedFrames = [];
	m = new MutationObserver(muts => {
		muts.forEach(mut => {
			Array.prototype.forEach.call(mut.addedNodes, node => {
				if (node.tagName == 'IFRAME' || node.nodeName == 'IFRAME') {
					touchedFrames.push({
						element: node,
						oldSandbox: node.sandbox.value ? node.sandbox.value : 'allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation'
					});

					node.sandbox = 'allow-scripts allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-top-navigation-by-user-activation';

					/**
					 * TAKE NOTE, MAY NEED TO AVOID THIS IN THE FUTURE:
					 *
					 * When the embedded document has the same origin as the main page,
					 * it is strongly discouraged to use both allow-scripts and allow-same-origin
					 * at the same time, as that allows the embedded document to programmatically
					 * remove the sandbox attribute. Although it is accepted, this case is no more
					 * secure than not using the sandbox attribute.
					 *
					 * FROM: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/IFRAME
					 */
				}
			});
		});
	});

	m.observe(document.documentElement, {childList: true, subtree: true});
}

chrome.runtime.sendMessage("is_blacklisted", blacklisted => {
	if (!blacklisted) {
		let ss = document.createElement('script');
		ss.textContent = 'var me=document.getElementsByTagName("script");me=me[me.length-1];window.open=window.streamLocker_open;window.streamLocker_open=undefined;me.parentElement.removeChild(me);';
		document.documentElement.appendChild(ss);

		m.disconnect();
		touchedFrames.forEach(frame => {
			frame.element.sandbox = frame.oldSandbox;
		});
	}
});
