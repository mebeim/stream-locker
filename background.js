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

function getBlacklist() {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();

		xhr.addEventListener('readystatechange', function() {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					blacklist = xhr.responseText.split('\n');
					resolve();
				} else {
					_log('Unable to retrieve blacklist! XHR response code: ' + xhr.status + '.', 'crimson');
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

function handleRequests(details) {
	if (~details.tabId) {
		chrome.tabs.get(details.tabId, function(tab) {
			for (address of blacklist) {
				if (~tab.url.indexOf(address) && details.responseHeaders) {
					for (header of details.responseHeaders) {
						if (header.name == 'Content-Type' && contentTypePattern.test(header.value)) {
							let media = {
								url: details.url,
								contentType: header.value,
								pageTitle: tab.title,
								tab: tab
							};

							if (goodContentTypePattern.test(media.contentType)) {
								// Supported Content-Type, launch the player and cancel request.
								startPlayer(media);
								return {cancel: true};
							}

							if (badContentTypePattern.test(media.contentType)) {
								// Unsupported Content-Type.
								_log("Can't launch player: bad Content-Type: " + media.contentType + ' [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'crimson');
								return;
							}
							
							// Unknown Content-Type, needs "manual" check.
							checkMedia(media).then(startPlayer, err => {
								_log("Can't lauhcn player: media cannot be played (Content-Type: " + media.contentType + ') [tab #' + tab.id + ' (' + (tab.index+1) + '): ' + tab.url + ']', 'crimson');
							});
							
							return;
						}
					}

					break;
				}
			}
		});
	}
}

function start() {
	chrome.webRequest.onHeadersReceived.addListener(handleRequests, {
		urls: [ // Is checking extensions the right way?
			'*://*/*.mkv*',
			'*://*/*.mp4*',
			'*://*/*.ogv*',
			'*://*/*.webm*'
		],
		types: [
			'object',
			'media', 
			'xmlhttprequest', // Is this needed?
			'other'
		]
	}, ['blocking', 'responseHeaders']);
}

var	contentTypePattern = /^(application\/octet\-stream|video\/.*)$/i,
    goodContentTypePattern = /^video\/(mp4|webm|ogg)$/i,
    badContentTypePattern = /^video\/(x\-)?flv$/i,
	windowWatchlist = [],
    blacklist;

chrome.runtime.onInstalled.addListener(function() {
	//alert('Extension under alpha developement.\n\nAvailable options for nerds:\nlocalStorage.log != "" ⇒ enable logging (disabled by default)\nlocalStorage.closeBlankPopups != "" ⇒ block blank popup windows (enabled by default)');
	//localStorage.closeBlankPopups = 1;
});

getBlacklist().then(start);
