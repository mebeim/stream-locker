/**
 * This file is part of the Stream Locker browser extension.
 * Copyright (c) 2017-19 Marco Bonelli.
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

function setCaretAtEnd(el) {
	let range = document.createRange(),
	    sel = window.getSelection()

	el.focus()

	range.selectNodeContents(el)
	range.collapse(false)
	sel.removeAllRanges()
	sel.addRange(range)
}

function getOptions() {
	return new Promise((resolve, _) => {
		chrome.storage.local.get('options', storage => {
			options = storage.options
			options.blacklist.map(s => s.hostname).forEach(hostnamesSet.add.bind(hostnamesSet))
			resolve()
		})
	})
}

function animateSavePopup() {
	savePopup.classList.add('active')
	clearTimeout(savePopupTimeout)
	savePopupTimeout = setTimeout(() => savePopup.classList.remove('active'), 1000)
}

function saveAll() {
	chrome.storage.local.set({options}, () => {
		animateSavePopup()
	})
}

function queueSave() {
	clearTimeout(saveTimeout)
	saveTimeout = setTimeout(saveAll, 500)
}

function fixHostname(h) {
	// Look, I'm not your babysitter, just learn what an hostname is.
	return h.replace(/\s/g, '')
}

function addBlacklistedSite() {
	if (currentlyEditing != null)
		saveBlacklistedSite(currentlyEditing)

	let bc = document.getElementById('blacklist-container')

	options.blacklist.push({hostname: '', enabled: true})

	this.$nextTick(() => {
		bc.scrollTop = bc.scrollHeight
		editBlacklistedSite(options.blacklist.length - 1, null, true)
	})
}

function removeBlacklistedSite(i, hostname) {
	if (currentlyEditing != null)
		saveBlacklistedSite(currentlyEditing)

	options.blacklist.splice(i, 1)
	hostnamesSet.delete(hostname)
	queueSave()
}

function editBlacklistedSite(i, el, isNew) {
	if (!el)
		el = document.querySelectorAll('#blacklist tr .hostname .edit')[i]

	if (el.textContent == 'Edit' && currentlyEditing != null)
		saveBlacklistedSite(currentlyEditing, null, el)
	currentlyEditing = i

	let hostname = el.parentElement.querySelector('.editable')

	if (el.textContent == 'Edit') {
		if (isNew)
			hostname.textContent = ''

		el.textContent = 'Save'
		hostname.setAttribute('contenteditable', true)
		setCaretAtEnd(hostname)
	} else if (el.textContent == 'Save') {
		this.saveBlacklistedSite(i, hostname, el)
	}
}

function saveBlacklistedSite(i, el, btn) {
	if (!el)
		el = document.querySelectorAll('#blacklist tr .hostname .editable')[i]
	el.removeAttribute('contenteditable')
	el.blur()

	if (!btn)
		btn = el.parentElement.querySelector('.edit')
	btn.textContent = 'Edit'

	let newHostname = fixHostname(el.textContent),
	    oldHostname = options.blacklist[i].hostname

	if (newHostname && !hostnamesSet.has(newHostname)) {
		if (newHostname != oldHostname) {
			options.blacklist[i].hostname = newHostname
			el.textContent = newHostname

			hostnamesSet.delete(oldHostname)
			hostnamesSet.add(newHostname)

			queueSave()
		}
	} else {
		if (oldHostname == '')
			options.blacklist.splice(i, 1)
		else
			el.textContent = oldHostname
	}

	currentlyEditing = null
}

function start() {
	new Vue({
		el: '#container',
		data: {
			options,
			extManifest: Object.freeze(chrome.runtime.getManifest()),
		},
		methods: {
			addBlacklistedSite,
			removeBlacklistedSite,
			editBlacklistedSite,
			saveBlacklistedSite,
			queueSave
		}
	})
}

const hostnamesSet = new Set(),
      savePopup = document.getElementById('save-popup')

let options = null,
    saveTimeout = null,
    savePopupTimeout = null,
    currentlyEditing = null

getOptions().then(start)
