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
	return new URL(url).hostname
}

function checkAllTabs() {
	chrome.tabs.query({}, tabs => tabs.forEach(tab => checkTab(tab.id, {url: tab.url}, tab)))
}

function loadDefaultOptions() {
	return new Promise((resolve, reject) => {
		fetch('/resources/json/defaultOptions.json').then(resp => {
			if (resp.ok && resp.status == 200) {
				resp.json().then(resolve, reject)
			} else {
				log(`Unable to retrieve defalt options! Response status code: ${resp.status}.`, 'crimson')
				reject()
			}
		}).catch(reject)
	})
}

function loadStorage() {
	return new Promise(resolve  => {
		chrome.storage.local.get(null, storage => {
			loadDefaultOptions().then(defaultOptions => {
				if (!storage.options)
					log('No options found in storage, using defaults.')

				let merged = Object.assign({}, defaultOptions, storage.options)
				merged.global = Object.assign({}, defaultOptions.global, storage.options && storage.options.global)
				merged.advanced = Object.assign({}, defaultOptions.advanced, storage.options && storage.options.advanced)

				chrome.storage.local.set({options: merged}, () => resolve(merged))
			})
		})
	})
}

function parseOptions(options) {
	for (let k of Object.keys(options.global))
		globalOptions[k] = options.global[k]

	for (let k of Object.keys(options.advanced))
		advancedOptions[k] = options.advanced[k]

	blacklist.clear()

	options.blacklist.forEach(site => {
		if (globalOptions.enabled  && (site.enabled === undefined || site.enabled)) {
			blacklist.set(site.hostname, {
				blockPopups: site.blockPopups !== undefined ? site.blockPopups : globalOptions.blockPopups,
				captureVideo: site.captureVideo !== undefined ? site.captureVideo : globalOptions.captureVideo
			})
		}
	})

	if (globalOptions.enabled)
		chrome.browserAction.setIcon({path: ICON_ENABLED})
	else
		chrome.browserAction.setIcon({path: ICON_DISABLED})
}

function checkMedia(media) {
	return new Promise(resolve => {
		let testPlayer = document.createElement('video')

		testPlayer.addEventListener('canplay', () => resolve(testPlayer.duration >= advancedOptions.minimumVideoDuration * 60))
		testPlayer.addEventListener('error', () => resolve(false, 'unsupported'))
		setTimeout(() => resolve(false, 'timed out'), 60000)

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
			log(`Launched player (Content-Type: ${media.contentType}) [tab #${tab.id} (${tab.index+1}): ${tab.url}]`, 'limegreen')
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
		log(`Blocked popup from tab #${details.sourceTabId}.`, 'orange')
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
				checkMedia(media).then((ok, reason) => {
					if (ok)
						startPlayer(media)
					else if (reason)
						log(`Cannot play media, ${reason} [tab #${details.tabId} (${tab.index+1})]: ${details.url}`, 'crimson')
				})
		})
	}
}

function checkTab(tabId, info, tab) {
	let hostname = extractHostname(tab.url)

	if (blacklist.has(hostname)) {
		if (info.url && !tabWatchlist.has(tabId)) {
			log(`Tab #${tabId} (${tab.index+1}) loaded blacklisted hostname: ${hostname}.`)

			chrome.webRequest.onHeadersReceived.addListener(checkRequest, {
				tabId: tabId,
				urls : WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders'])

			tabWatchlist.add(tabId)
			log(`Tab #${tabId} added to watchlist.`)

			if (blacklist.get(hostname).blockPopups) {
				popupWatchlist.add(tabId)
				log(`Tab #${tabId} added to popup watchlist.`)
			}
		}

		chrome.browserAction.setTitle({tabId, title: 'Stream Locker (blacklisted site)'})
		chrome.browserAction.setBadgeText({tabId, text: '\u2713'})
		chrome.browserAction.setBadgeBackgroundColor({tabId, color: '#009900'})
	} else {
		if (tabWatchlist.has(tabId)) {
			chrome.webRequest.onHeadersReceived.removeListener(checkRequest, {
				tabId: tabId,
				urls : WEBREQUEST_FILTER_URLS,
				types: WEBREQUEST_FILTER_TYPES
			}, ['responseHeaders'])

			tabWatchlist.delete(tabId)
			popupWatchlist.delete(tabId)

			log(`Tab #${tabId} removed from watchlist(s).`)
		}

		chrome.browserAction.setTitle({tabId, title: 'Stream Locker'})
		chrome.browserAction.setBadgeText({tabId, text: ''})
	}
}

function unwatchTab(tabId) {
	tabWatchlist.delete(tabId)
	popupWatchlist.delete(tabId)
}

function handleStorageChange(changes, area) {
	if (area == 'local') {
		if ('options' in changes)
			// TODO: maybe optimize this?
			parseOptions(changes.options.newValue)
			checkAllTabs()
	}
}

function handleInstall(details) {
	if (details.reason == 'install') {
		JUST_INSTALLED = true

		if (JUST_STARTED)
			chrome.tabs.create({url: '/src/options/options.html'})
	}

	if (details.reason == 'update') {
		log('Extension updated!')

		if (compareVersions(details.previousVersion, '1.0.1')) {
			/**
			 * Version <= 1.0.1 fix: "default" value was still present for sites,
			 * meaning options.blacklist['some-site'].enabled was undefined by default.
			 * This breaks the options page of version >= 1.0.2 since the default
			 * value is not contemplated anymore for this option.
			 */

			log('Fixing options due to update from old version (<= 1.0.1).')

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
	chrome.storage.onChanged.addListener(handleStorageChange)
	checkAllTabs()

	if (JUST_INSTALLED)
		chrome.tabs.create({url: '/src/options/options.html'})

	JUST_STARTED = true
}

const WEBREQUEST_FILTER_URLS  = ['<all_urls>'],
      WEBREQUEST_FILTER_TYPES = ['media'],
      BAD_CONTENT_TYPE_EXP    = /^video\/(x\-)?flv$/i

const ICON_ENABLED = {
	16: '../../resources/images/icons/16.png',
	19: '../../resources/images/icons/19.png',
	38: '../../resources/images/icons/38.png',
	64: '../../resources/images/icons/64.png',
	128: '../../resources/images/icons/128.png'
}

const ICON_DISABLED = {
	16: '../../resources/images/icons/bw16.png',
	19: '../../resources/images/icons/bw19.png',
	38: '../../resources/images/icons/bw38.png',
	64: '../../resources/images/icons/bw64.png',
	128: '../../resources/images/icons/bw128.png'
}

const tabWatchlist            = new Set(),
      popupWatchlist          = new Set(),
      blacklist               = new Map(),
      globalOptions           = new Object(),
      advancedOptions         = new Object()

let JUST_INSTALLED = false,
    JUST_STARTED   = false

chrome.runtime.onInstalled.addListener(handleInstall)
loadStorage().then(parseOptions).then(start)
