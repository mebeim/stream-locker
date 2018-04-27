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

function extractHostname(url) {
	var partial = url.substring(url.indexOf('://') + 3),
	    colon = partial.indexOf(':'),
	    slash = partial.indexOf('/'),
	    len = Math.max(colon, slash);

	if (len == -1) len = partial.length;
	return partial.substr(0, len);
}

function loadBlacklist() {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();

		xhr.addEventListener('readystatechange', function() {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					blacklist = new Set(xhr.responseText.split('\n').filter(Boolean));
					resolve();
				} else {
					_log('Unable to retrieve blacklist! XHR response code: ' + xhr.status + '.', 'crimson');
					reject();
				}
			}
		});

		xhr.open('GET', 'blacklist.txt', true);
		xhr.send();
	});
}

function checkMedia(media) {
	return new Promise((resolve, reject) => {
		var testPlayer = document.createElement('video');

		testPlayer.addEventListener('error', reject);
		testPlayer.addEventListener('canplay', () => resolve(media));
		testPlayer.src = media.url;
	});
}

function startPlayer(media) {
	chrome.tabs.update(media.tab.id, {
		url: '/player/player.html?' +
		'&src=' + encodeURIComponent(media.url) +
		'&mime=' + media.contentType +
		'&title=' + media.pageTitle
	});

	_log('Launched player (Content-Type: ' + media.contentType + ') [tab #' + media.tab.id + ' (' + (media.tab.index+1) + '): ' + media.tab.url + ']', 'limegreen');
}

function checkRequest(details) {
	var contentType = details.responseHeaders.find(h => h.name.toLowerCase() == 'content-type');

	if (contentType) {
		chrome.tabs.get(details.tabId, function(tab) {
			let media = {
				url: details.url,
				contentType: contentType.value,
				pageTitle: tab.title,
				tab: tab
			};

			if (goodContentTypePattern.test(contentType.value)) {
				// Supported Content-Type, launch the player and cancel the request.
				startPlayer(media);
				return {cancel: true};
			}

			if (badContentTypePattern.test(contentType.value)) {
				// Unsupported Content-Type.
				_log("Can't launch player: bad Content-Type: " + contentType.value + ' [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'crimson');
				return;
			}

			// Unknown Content-Type, needs "manual" check.
			checkMedia(media).then(startPlayer, err => {
				_log("Can't lauhcn player: media cannot be played (Content-Type: " + contentType.value + ') [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'crimson');
			});

			return;
		});
	}
}

function checkTab(tabId, info, tab) {
	if (blacklist.has(extractHostname(tab.url))) {
		if (!watchedTabs.has(tabId)) {
			_log('Tab #' + tabId + ' (' + (tab.index+1) + ') loaded blacklisted URL: ' + tab.url);

			chrome.webRequest.onHeadersReceived.addListener(checkRequest, {
				tabId: tabId,
				urls: WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders']);

			watchedTabs.add(tabId);
			_log('Tab #' + tabId + ' added to watchlist');

			chrome.pageAction.show(tabId);
		}
	} else {
		if (watchedTabs.has(tabId)) {
			chrome.webRequest.onHeadersReceived.removeListener(checkRequest, {
				tabId: tabId,
				urls: WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders']);

			watchedTabs.delete(tabId);
			_log('Tab #' + tabId + ' removed from watchlist');

			chrome.pageAction.hide(tabId);
		}
	}
}

function listenMessages(request, sender, sendResponse) {
	if (request === "is_blacklisted")
		sendResponse(blacklist.has(extractHostname(sender.tab.url)));
}

function start() {
	chrome.runtime.onMessage.addListener(listenMessages);
	chrome.tabs.onUpdated.addListener(checkTab);
	chrome.tabs.onRemoved.addListener(id => watchedTabs.delete(id));
}

// Is checking extensions the right way? Is xhr needed?
const WEBREQUEST_FILTER_URLS  = ['*://*/*.mkv*', '*://*/*.mp4*', '*://*/*.ogv*', '*://*/*.webm*'],
      WEBREQUEST_FILTER_TYPES =  ['object', 'media', 'xmlhttprequest', 'other'];

var	contentTypePattern     = /^(application\/octet\-stream|video\/.*)$/i,
    goodContentTypePattern = /^video\/(mp4|webm|ogg)$/i,
    badContentTypePattern  = /^video\/(x\-)?flv$/i,
    watchedTabs            = new Set(),
    blacklist;

loadBlacklist().then(start);
