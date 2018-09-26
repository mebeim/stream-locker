/**
 * This file is part of the Stream Locker browser extension.
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

'use strict'

function compareVersions(v1, v2) {
	let v1s = v1.split('.').map(x => parseInt(x)),
		v2s = v2.split('.').map(x => parseInt(x))

	if (v1s.length != v2s.length) {
		if (v1s.length > v2s.length) {
			for (let i = 0; i < v1s.length - v2s.length; i++)
				v2s.push(0)
		} else {
			for (let i = 0; i < v2s.length - v1s.length; i++)
				v1s.push(0)
		}
	}

	for (let i = 0; i < v1s.length; i++)
		if (v1s[i] > v2s[i])
			return false

	return true
}

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
			loadDefaultOptions().then(defaultOptions => {
				if (storage.options) {
					resolve(Object.assign(storage.options, defaultOptions))
				} else {
					_log('No options found in storage, using defaults.')
					chrome.storage.local.set({options: defaultOptions}, () => resolve(defaultOptions))
				}
			})
		})
	})
}

function parseOptions(options) {
	for (let k of Object.keys(options.global))
		globalOptions[k] = options.global[k]

	blacklist.clear()

	options.blacklist.forEach(site => {
		if (globalOptions.enabled  && (site.enabled === undefined || site.enabled)) {
			blacklist.set(site.hostname, {
				blockPopups: site.blockPopups !== undefined ? site.blockPopups : globalOptions.blockPopups,
				captureVideo: site.captureVideo !== undefined ? site.captureVideo : globalOptions.captureVideo
			})
		}
	})

	// Scan all tabs whenever options change or are loaded:
	chrome.tabs.query({}, tabs => tabs.forEach(tab => checkTab(tab.id, {url: tab.url}, tab)))
}

function checkMedia(media) {
	return new Promise((resolve, _) => {
		let testPlayer = document.createElement('video')

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

	if (site && site.captureVideo) {
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

			if (!BAD_CONTENT_TYPE_EXP.test(contentType.value))
				checkMedia(media).then(startPlayer);
		})
	}
}

function checkTab(tabId, info, tab) {
	if (!info.url)
		return

	let hostname = extractHostname(tab.url)

	if (blacklist.has(hostname)) {
		if (!tabWatchlist.has(tabId)) {
			_log(`Tab #${tabId} (${tab.index+1}) loaded blacklisted hostname: ${hostname}.`)

			chrome.webRequest.onHeadersReceived.addListener(checkRequest, {
				tabId: tabId,
				urls : WEBREQUEST_FILTER_URLS,
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
				urls : WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders'])

			tabWatchlist.delete(tabId)
			popupWatchlist.delete(tabId)

			chrome.pageAction.hide(tabId)

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

function handleStorageChange(changes, area) {
	if (area == 'local') {
		if ('options' in changes)
			// TODO: maybe optimize this?
			parseOptions(changes.options.newValue)
	}
}

function handleInstall(details) {
	if (details.reason == 'install')
		chrome.tabs.create({url: '/src/options/options.html'})

	if (details.reason == 'update') {
		_log('Extension updated!')

		if (compareVersions(details.previousVersion, '1.0.1')) {
			/**
			 * Version <= 1.0.1 fix: "default" value was still present for sites,
			 * meaning options.blacklist['some-site'].enabled was undefined by default.
			 * This breaks the options page of version >= 1.0.2 since the default
			 * value is not contemplated anymore for this option.
			 */

			_log('Fixing options due to update from old version (<= 1.0.1).')

			loadStorage().then(options => {
				options.blacklist.forEach(site => {
					if (site.enabled === undefined)
						site.enabled = true
				})

				chrome.storage.local.set({options})
			})
		}
	}
}

function start() {
	chrome.tabs.onUpdated.addListener(checkTab)
	chrome.tabs.onRemoved.addListener(unwatchTab)
	chrome.webNavigation.onCreatedNavigationTarget.addListener(blockPopups)
	chrome.runtime.onMessage.addListener(handleMessage)
	chrome.storage.onChanged.addListener(handleStorageChange)
}

const WEBREQUEST_FILTER_URLS  = ['*://*/*'],
      WEBREQUEST_FILTER_TYPES = ['media'],
      BAD_CONTENT_TYPE_EXP    = /^video\/(x\-)?flv$/i,
      tabWatchlist            = new Set(),
      popupWatchlist          = new Set(),
      blacklist               = new Map(),
      globalOptions           = new Object()

chrome.runtime.onInstalled.addListener(handleInstall)
loadStorage().then(parseOptions).then(start)
