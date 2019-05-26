/**
 * This file is part of the Stream Locker browser extension.
 * Copyright (c) 2019 Marco Bonelli.
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
	return new URL(url).hostname
}

function getOptions() {
	return new Promise(resolve => {
		chrome.storage.local.get('options', storage => {
			options = storage.options
			resolve()
		})
	})
}

function getInfo() {
	return new Promise(resolve => {
		chrome.tabs.query({active: true, currentWindow: true}, tabs => {
			info = {currentTab: tabs[0]}
			info.hostname = extractHostname(info.currentTab.url)

			// TODO: Might be slow for big blacklists, blacklist needs to be optimized.
			info.blacklistEntry = options.blacklist.find(x => x.hostname == info.hostname)

			resolve()
		})
	})
}

function saveAll() {
	// Thank Firefox for this monstrosity.
	chrome.storage.local.set({options: JSON.parse(JSON.stringify(options))})
}

function addToBlacklist() {
	if (!info.blacklistEntry) { // Don't add twice.
		info.blacklistEntry = {hostname: info.hostname, enabled: true}

		options.blacklist.push(info.blacklistEntry)
		saveAll()
	}
}

function removeFromBlacklist() {
	if (info.blacklistEntry) { // Don't remove twice.
		let victim = info.blacklistEntry
		info.blacklistEntry = null

		if (victim)
			options.blacklist.splice(options.blacklist.indexOf(victim), 1)

		saveAll()
	}
}

function start() {
	new Vue({
		el: '#container',
		data: {
			options,
			info,
			extManifest: Object.freeze(chrome.runtime.getManifest()),
		},
		methods: {
			saveAll,
			addToBlacklist,
			removeFromBlacklist
		}
	})
}

let options     = null,
    info        = null,
    saveTimeout = null

getOptions().then(getInfo).then(start)
