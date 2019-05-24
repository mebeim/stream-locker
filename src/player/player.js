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

Object.defineProperties(Number.prototype, {
	limit: {
		value: function (a, b) {
			let res = this
			if (typeof a == 'number' && res < a) res = a
			if (typeof b == 'number' && res > b) res = b
			return res
		}
	}
})

function getQueryStringParameters() {
	let res = {}

	if (~window.location.href.indexOf('?')) {
		let qs = window.location.href.split('?')[1].split('&').map((el) => el.split('='))

		for (let i = 0; i < qs.length; i++)
			res[qs[i][0]] = decodeURIComponent(qs[i][1])
	}

	return res
}

function showVolumeIndicator() {
	clearTimeout(volumeIndicatorHideTimeoutID)

	volumeIndicator.classList.add('visible')
	volumeIndicator.textContent = `Volume: ${Math.round(player.volume * 100)}%`

	volumeIndicatorHideTimeoutID = setTimeout(() => {
		volumeIndicator.classList.remove('visible')
	}, 1500)
}

function toggleFullScreen() {
	if (CHROME) {
		if (document.webkitIsFullScreen)
			document.webkitExitFullscreen()
		else
			player.webkitRequestFullScreen()
	} else {
		if (document.mozFullScreen)
			document.mozCancelFullScreen()
		else
			player.mozRequestFullScreen()
	}
}

function keyboardToggleFullScreen(e) {
	if (e.code == 'KeyF')
		toggleFullScreen()
}

function keyboardTimeControl(e) {
	switch (e.code) {
		case 'ArrowLeft':
			if (CHROME) player.currentTime = (player.currentTime - 10).limit(0, player.duration)
			break
		case 'ArrowRight':
			if (CHROME) player.currentTime = (player.currentTime + 10).limit(0, player.duration)
			break
		case 'ArrowDown':
			player.currentTime = (player.currentTime - 30).limit(0, player.duration)
			break
		case 'ArrowUp':
			player.currentTime = (player.currentTime + 30).limit(0, player.duration)
			break
	}
}

function keyboardVolumeControl(e) {
	switch (e.key) {
		case '+':
			player.volume = (player.volume + 0.05).limit(0, 1)
			showVolumeIndicator()
			break
		case '-':
			player.volume = (player.volume - 0.05).limit(0, 1)
			showVolumeIndicator()
			break
	}
}

function wheelVolumeControl(e) {
	if (e.deltaY) {
		player.volume = (player.volume - Math.sign(e.deltaY) * 0.05).limit(0, 1)
		showVolumeIndicator()
	}
}

function saveVolume() {
	localStorage.volume = player.volume
}

function hideMouse() {
	clearTimeout(mouseHideTimeoutID)

	document.body.style.cursor = 'default'

	mouseHideTimeoutID = setTimeout(() => {
		document.body.style.cursor = 'none !important'
	}, 3000)
}


const CHROME = navigator.userAgent.toLowerCase().includes('chrome'),
      player = document.getElementById('player'),
      volumeIndicator = document.getElementById('volume-indicator'),
      queryParams = getQueryStringParameters()

let mouseHideTimeoutID,
    volumeIndicatorHideTimeoutID

document.title = queryParams.title
player.type    = queryParams.contentType
player.src     = queryParams.src
player.volume  = parseFloat(localStorage.volume) || 0.5

chrome.tabs.getCurrent(tab => {
	chrome.browserAction.setTitle({tabId: tab.id, title: 'Stream Locker (playing)'})
})

window.addEventListener('mousemove', hideMouse)
window.addEventListener('keydown', keyboardTimeControl)
window.addEventListener('keydown', keyboardVolumeControl)
window.addEventListener('keypress', keyboardToggleFullScreen)
player.addEventListener('dblclick', toggleFullScreen)
player.addEventListener('wheel', wheelVolumeControl)
player.addEventListener('volumechange', saveVolume)
