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

/**
 * Load blacklist and video extensions and start the listeners.
 */
function start() {
	var xhr = new XMLHttpRequest();

	xhr.addEventListener('readystatechange', function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			blacklist = xhr.responseText.split('\n');

			chrome.tabs.onCreated.addListener(blockPopupTab);
			chrome.tabs.onUpdated.addListener(blockPopupWindow);
			chrome.windows.onCreated.addListener(watchPopupWindow, {windowTypes: ['popup']});
			chrome.windows.onRemoved.addListener(unwatchPopupWindow, {windowTypes: ['popup']});
			chrome.webRequest.onHeadersReceived.addListener(handleRequests, {
				// sure checking extensions is the right way?
				urls: [
					'*://*/*.mkv*',
					'*://*/*.mp4*',
					'*://*/*.ogv*',
					'*://*/*.webm*'
				],
				types: ["object", "media", "xmlhttprequest", "other"] // do we need "xmlhttprequest"?
			}, ["blocking", "responseHeaders"]);
		}
	});

	xhr.open('GET', 'blacklist.txt', true);
	xhr.send();
}

/**
 * Blocks pupup tabs created by any tab which url is blacklisted.
 */
function blockPopupTab(tab){
	if (tab.openerTabId) {
		chrome.tabs.get(tab.openerTabId, function(parentTab) {
			for (address of blacklist) {
				if (~parentTab.url.indexOf(address)) {

					// Check the referrer because otherwise any tab is closed (even new tabs or bookmarks opened by the user).
					chrome.tabs.executeScript(tab.id, {code: 'document.referrer;', matchAboutBlank: true}, function(ref) {
						var dataURI = false;

						if (chrome.runtime.lastError) {
							// Cannot access data URIs, see http://stackoverflow.com/a/31052496/3889449
							if (/"data:.*"/i.test(chrome.runtime.lastError.message)) dataURI = true;
							else _log(chrome.runtime.lastError.message, 'crimson');
						}

						if (!tab.url || dataURI || ref && ref[0] && ~ref[0].indexOf(address)) {
							chrome.tabs.remove(tab.id, function() {
								_log('Blocked popup [tab #' + parentTab.id +  ' (' + (parentTab.index+1) + '): ' + parentTab.url + ']', 'orange');
								if (chrome.runtime.lastError) _log(chrome.runtime.lastError.message, 'crimson');
							});
						}
					});

					break;
				}
			}
		});
	}
}

/**
 * Adds any new popup window ID to windowWatchlist to check its referrer with blockPopupWindow.
 * With localStorage.closeBlankPopups set, bypasses referrer check if the URL is about:blank or empty.
 */
function watchPopupWindow(window) {
	chrome.windows.get(window.id, {populate: true}, function(window) {
		if (localStorage.closeBlankPopups) {
			// Bypass referrer check and close any popup window where the only tab url is about:blank or empty.
			if (window.tabs.length == 1 && (!window.tabs[0].url || window.tabs[0].url == 'about:blank')) {
				chrome.windows.remove(window.id, function() {
					_log('Blocked popup window (blank / no url) [window #' + window.id + ']', 'orange');
					if (chrome.runtime.lastError) _log(chrome.runtime.lastError.message, 'crimson');
				});

				return;
			}
		}

		// Add the ID to windowWatchlist to check using blockPopupWindows.
		windowWatchlist.push(window.id);
		_log('Added window to watchlist (currently watching ' + windowWatchlist.length + ' windows) [window #' + window.id + ']');
	});
}

/**
 * If a popup window is closed, its ID is removed from the watchlist.
 */
function unwatchPopupWindow(windowID) {
	var index = windowWatchlist.indexOf(windowID);

	if (~index) {
		windowWatchlist.splice(index, 1);
		_log('Removed window from watchlist (currently watching ' + windowWatchlist.length + ' windows) [window #' + windowID + ']');
	}
}

/**
 * Watches every blacklisted popup window and checks its referrer when its url is updated.
 * If the referrer is blacklisted, the window is removed.
 */
function blockPopupWindow(tabID, info, tab) {
	if (~windowWatchlist.indexOf(tab.windowId) && info.url && info.url != 'about:blank') {
		chrome.tabs.executeScript(tabID, {code: 'document.referrer;'}, function(ref) {
			if (ref && ref[0]) {
				for (address of blacklist) {
					if (~ref[0].indexOf(address)) {
						chrome.windows.remove(tab.windowId, function() {
							// It's a shame this is the only way to know who the fuck opened the window.
							// Also, this works about once in a hundred times because of the timing, so yeah... pretty sad.
							_log('Blocked popup window (blacklisted referrer) [window #' + tab.windowId + ': ' + info.url + ']', 'orange');
							if (chrome.runtime.lastError) _log(chrome.runtime.lastError.message, 'crimson');
						});;
					}
				}
			}
		});
	}
}


/**
 * Checks any possible video request and loads the player if request is made from a blacklisted page
 * and the video can be played.
 */
function handleRequests(details) {
	if (~details.tabId) {
		chrome.tabs.get(details.tabId, function(tab) {
			var contentType;

			for (address of blacklist) {
				if (~tab.url.indexOf(address)) {
					if (details.responseHeaders) {
						for (header of details.responseHeaders) {
							if (header.name == 'Content-Type' && contentTypePattern.test(header.value)) {
								contentType = header.value;

								if (goodContentTypePattern.test(contentType)) {
									// Supported Content-Type, load HTML5 player
									startPlayer(tab, 'HTML5', contentType, details.url, tab.title);
									return {cancel: true};
								}

								if (badContentTypePattern.test(contentType)) {
									// Unsupported Content-Type
									_log('Can\'t load video (bad Content-Type: ' + contentType + ') [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'crimson');
									return;
								}

								// Unknown Content-Type, needs "manual" check.
								startPlayer(tab, null, contentType, details.url, tab.title);
								return;
							}
						}
					}

					break;
				}
			}
		});
	}
}

function startPlayer(tab, playerType, contentType, url, pageTitle) {
	if (playerType) {
		chrome.tabs.update(tab.id, {
			url: '/player/player.html?' +
			'type=' + playerType +
			'&src=' + encodeURIComponent(url) +
			'&mime=' + contentType +
			'&title=' + pageTitle
		});

		_log('Launched ' + playerType + ' player (good Content-Type: ' + contentType + ') [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'limegreen');
	} else {
		var testPlayer = document.createElement('video');

		testPlayer.addEventListener('error', function(e) {
			_log('Can\'t load video (Content-Type: ' + contentType + ') [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'crimson');
		});

		testPlayer.addEventListener('canplay', function(e) {
			chrome.tabs.update(tab.id, {
				url: '/player/player.html?' +
				'type=HTML5' +
				'&src=' + encodeURIComponent(url) +
				'&mime=' + contentType +
				'&title=' + pageTitle
			});

			_log('Launched HTML5 player (Content-Type: ' + contentType + ') [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'limegreen');
		});

		testPlayer.src = url;
	}
}

var	contentTypePattern = /^(application\/octet\-stream|video\/.*)$/i,
    goodContentTypePattern = /^video\/(mp4|webm|ogg)$/i,
    badContentTypePattern = /^video\/(x\-)?flv$/i,
	windowWatchlist = [],
    blacklist;

chrome.runtime.onInstalled.addListener(function() {
	alert('Extension under alpha developement.\n\nAvailable options for nerds:\nlocalStorage.log != "" ⇒ enable logging (disabled by default)\nlocalStorage.closeBlankPopups != "" ⇒ block blank popup windows (enabled by default)');
	localStorage.closeBlankPopups = 1;
});

start();
