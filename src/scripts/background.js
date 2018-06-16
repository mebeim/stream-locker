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

"use strict"

function extractHostname(url) {
	let partial = url.substring(url.indexOf('://') + 3),
	    colon = partial.indexOf(':'),
	    slash = partial.indexOf('/'),
	    len = Math.max(colon, slash)

	if (len == -1)
		return partial
	return partial.substr(0, len)
}

function loadDefaultOptions() {
	return new Promise((resolve, reject) => {
		_log('No options found, loading default.')

		fetch('/resources/json/defaultOptions.json').then(resp => {
			if (resp.ok && resp.status == 200) {
				resp.json().then(resolve, reject)
			} else {
				_log(`Unable to retrieve defalt options! Response status code: ${resp.status}.`, 'crimson')
				reject()
			}
		}).catch(reject)
	})
}

function loadStorage() {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(null, storage => {
			if (storage.options)
				resolve(storage.options)
			else
				loadDefaultOptions().then(options => chrome.storage.local.set({options}, () => resolve(options)))
		})
	})
}

function parseOptions(options) {
	for (let k of Object.keys(options.global))
		globalOptions[k] = options.global[k]

	blacklist.clear()

	options.blacklist.forEach(site => {
		if ((site.enabled !== undefined && site.enabled) || globalOptions.enabled) {
			blacklist.set(site.hostname, {
				blockPopups: site.blockPopups !== undefined ? site.blockPopups : globalOptions.blockPopups,
				playerInNewTab: site.playerInNewTab !== undefined ? site.playerInNewTab : globalOptions.playerInNewTab
			})
		}
	})
}

function checkMedia(media) {
	return new Promise((resolve, reject) => {
		let testPlayer = document.createElement('video')

		testPlayer.addEventListener('error', reject)
		testPlayer.addEventListener('canplay', () => resolve(media))
		testPlayer.src = media.url
	})
}

function startPlayer(media) {
	let site = blacklist.get(extractHostname(media.tab.url)),
	    url = '/src/player/player.html?'
	        + 'src=' + encodeURIComponent(media.url)
	        + '&mime=' + media.contentType
			+ '&title=' + media.pageTitle

	// TODO: create a cache with expiration of 500ms and check it before launching the player.

	if (site && site.playerInNewTab) {
		chrome.tabs.create({url}, tab => {
			_log(`Launched player in new tab (Content-Type: ${media.contentType}) [tab #${tab.id} (${tab.index+1}): ${tab.url}]`, 'limegreen')
		})
	} else {
		chrome.tabs.update(media.tab.id, {url}, tab => {
			_log(`Launched player (Content-Type: ${media.contentType}) [tab #${tab.id} (${tab.index+1}): ${tab.url}]`, 'limegreen')
		})
	}
}

/**
 * Finally solved!
 * https://stackoverflow.com/questions/46407042
 */
function blockPopups(details) {
	if (popupWatchlist.has(details.sourceTabId)) {
		chrome.tabs.remove(details.tabId)
		_log(`Blocked popup from tab #${details.tabId}.`, 'orange')
	}
}

function checkRequest(details) {
	let contentType = details.responseHeaders.find(h => h.name.toLowerCase() == 'content-type')

	if (contentType) {
		chrome.tabs.get(details.tabId, function(tab) {
			let media = {
				url: details.url,
				contentType: contentType.value,
				pageTitle: tab.title,
				tab: tab
			}

			if (goodContentTypePattern.test(contentType.value)) {
				// Supported Content-Type, launch the player and cancel the request.
				startPlayer(media)
				return {cancel: true}
			}

			if (badContentTypePattern.test(contentType.value)) {
				// Unsupported Content-Type.
				_log(`Can't launch player: bad Content-Type: ${contentType.value} [tab #${tab.id} (${tab.index+1}): ${tab.url}]`, 'crimson')
				return
			}

			// Unknown Content-Type, needs "manual" check.
			checkMedia(media).then(startPlayer, err => {
				_log(`Can't lauhcn player: media cannot be played (Content-Type: ${contentType.value}) [tab #${tab.id} (${tab.index+1}): ${tab.url}]`, 'crimson')
			})

			return
		})
	}
}

function checkTab(tabId, info, tab) {
	let hostname = extractHostname(tab.url)

	if (blacklist.has(hostname)) {
		if (!tabWatchlist.has(tabId)) {
			_log(`Tab #${tabId} (${tab.index+1}) loaded blacklisted hostname: ${hostname}.`)

			chrome.webRequest.onHeadersReceived.addListener(checkRequest, {
				tabId: tabId,
				urls: WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders'])

			tabWatchlist.add(tabId)
			_log(`Tab #${tabId} added to watchlist.`)

			if (blacklist.get(hostname).blockPopups) {
				popupWatchlist.add(tabId)
				_log(`Tab #${tabId} added to popup watchlist.`)
			}
		}

		chrome.pageAction.show(tabId)
		chrome.pageAction.setTitle({tabId: tabId, title: 'Stream Locker: this site is blacklisted.'})
	} else {
		if (tabWatchlist.has(tabId)) {
			chrome.webRequest.onHeadersReceived.removeListener(checkRequest, {
				tabId: tabId,
				urls: WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders'])

			tabWatchlist.delete(tabId)
			popupWatchlist.delete(tabId)

			_log(`Tab #${tabId} removed from watchlist(s).`)
		}
	}
}

function unwatchTab(tabId) {
	tabWatchlist.delete(tabId)
	popupWatchlist.delete(tabId)
}

function handleMessage(request, sender, respond) {
	switch (request.message) {
		case 'popup info':
			// TODO
			respond('something')
	}
}

function start() {
	chrome.tabs.onUpdated.addListener(checkTab)
	chrome.tabs.onRemoved.addListener(unwatchTab)
	chrome.webNavigation.onCreatedNavigationTarget.addListener(blockPopups)
	chrome.runtime.onMessage.addListener(handleMessage)

	// TODO: Watch for storage changes.
}

// Is checking extensions the right way? Is xhr needed?
const WEBREQUEST_FILTER_URLS  = ['*://*/*.mkv*', '*://*/*.mp4*', '*://*/*.ogv*', '*://*/*.webm*'],
      WEBREQUEST_FILTER_TYPES = ['object', 'media', 'xmlhttprequest', 'other'],
      contentTypePattern      = /^(application\/octet\-stream|video\/.*)$/i,
      goodContentTypePattern  = /^video\/(mp4|webm|ogg)$/i,
      badContentTypePattern   = /^video\/(x\-)?flv$/i,
      tabWatchlist            = new Set(),
      popupWatchlist          = new Set(),
      blacklist               = new Map(),
      globalOptions           = new Object()

loadStorage().then(parseOptions).then(start)
