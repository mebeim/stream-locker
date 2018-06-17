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

"use strict"

function getOptions() {
	return new Promise((resolve, _) => {
		chrome.storage.local.get('options', storage => {
			options = storage.options
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
	chrome.storage.local.set({options})
	console.log('Options saved.')
	animateSavePopup()
}

function queueSave() {
	clearTimeout(saveTimeout)
	saveTimeout = setTimeout(saveAll, 500)
}

function fixHostname(h) {
	// Look, I'm not your babysitter, just learn what an hostname is.
	return h.replace(/\s/g, '')
}

function removeBlacklistedSite(i) {
	options.blacklist.splice(i, 1)
	queueSave()
}

function editBlacklistedSite(i, el) {
	let hostname = el.parentElement.querySelector('.editable')

	if (el.textContent == 'Edit') {
		el.textContent = 'Save';
		hostname.setAttribute('contenteditable', true);
		hostname.focus()
	} else if (el.textContent == 'Save') {
		this.saveBlacklistedSite(i, hostname, el)
	}
}

function saveBlacklistedSite(i, el, btn) {
	el.setAttribute('contenteditable', false)
	el.blur()

	if (!btn)
		btn = el.parentElement.querySelector('.edit')
	btn.textContent = 'Edit';

	let newHostname = fixHostname(el.textContent)

	if (newHostname) {
		options.blacklist[i].hostname = newHostname
		el.textContent = newHostname
		queueSave()
	} else {
		el.textContent = options.blacklist[i].hostname
	}
}

function start() {
	// Custom "checkbox" which also has a default state (i.e. undefined).
	Vue.component('default-checkbox', {
		props: {
			value: {},
			values: {
				default: () => ['YES', 'NO', 'Default']
			}
		},
		template: `
			<div class="default-checkbox"
				:value="value"
				:class="{checked: value === true, default: value === undefined}"
				@click="$emit('input', getNext())"
			>
				{{values[selected]}}
			</div>
		`,
		created: function () {
			this.states = [true, false, undefined]
			this.selected = this.states.indexOf(this.value)
		},
		methods: {
			getNext: function() {
				this.selected = (this.selected + 1) % 3
				return this.states[this.selected]
			}
		}
	})

	new Vue({
		el: '#container',
		data: {
			options,
			extManifest: Object.freeze(chrome.runtime.getManifest()),
		},
		methods: {
			removeBlacklistedSite,
			editBlacklistedSite,
			saveBlacklistedSite,
			queueSave
		}
	})
}

let options = null,
	saveTimeout = null,
	savePopupTimeout = null,
	savePopup = document.getElementById('save-popup')

getOptions().then(start)
