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

Object.defineProperties(Number.prototype, {
	limit: {
		value: function (a, b) {
			var res = this
			if (typeof a == "number" && res < a) res = a
			if (typeof b == "number" && res > b) res = b
			return res
		}
	}
})

function getQueryStringParameters() {
	var qs, res = {}

	if (~window.location.href.indexOf('?')) {
		qs = window.location.href.split('?')[1].split('&').map((el) => el.split('='))

		for (let i = 0; i < qs.length; i++)
			res[qs[i][0]] = decodeURIComponent(qs[i][1])
	}

	return res
}

var player		= document.getElementById('player'),
	queryParams	= getQueryStringParameters(),
	mouseHideTimeoutID

chrome.tabs.getCurrent(tab => {
	chrome.pageAction.show(tab.id)
	chrome.pageAction.setTitle({tabId: tab.id, title: 'Stream Locker: playing...'})
})

document.title = queryParams.title
player.type = queryParams.contentType
player.src = queryParams.src
player.volume = parseFloat(localStorage.volume) || 0.5

document.documentElement.addEventListener('keypress', e => {
	switch (e.code) {
		case "Space":
			if (player.paused) player.play()
			else player.pause()
			break
		case "KeyF":
			if (document.webkitIsFullScreen) document.webkitExitFullscreen()
			else player.webkitRequestFullScreen()
			break
	}
})

document.documentElement.addEventListener('keydown', e => {
	switch (e.code) {
		case "ArrowLeft":
			player.currentTime = (player.currentTime - 10).limit(0, player.duration)
			break
		case "ArrowRight":
			player.currentTime = (player.currentTime + 10).limit(0, player.duration)
			break
		case "ArrowDown":
			player.currentTime = (player.currentTime - 30).limit(0, player.duration)
			break
		case "ArrowUp":
			player.currentTime = (player.currentTime + 30).limit(0, player.duration)
			break
	}
})

document.documentElement.addEventListener('keydown', e => {
	switch (e.key) {
		case "+":
			player.volume = (player.volume + 0.05).limit(0, 1)
			break
		case "-":
			player.volume = (player.volume - 0.05).limit(0, 1)
			break
	}
})

player.addEventListener('click', e => {
	if (player.paused) player.play()
	else player.pause()
})

player.addEventListener('dblclick', e => {
	if (document.webkitIsFullScreen) {
		document.webkitExitFullscreen()
	} else {
		player.webkitRequestFullScreen()
	}
})

player.addEventListener('mousewheel', e => {
	if (e.wheelDelta) {
		player.volume = (player.volume + Math.sign(e.wheelDelta) * 0.05).limit(0, 1)
	}
})

player.addEventListener('volumechange', e => {
	localStorage.volume = player.volume
})

document.documentElement.addEventListener('mousemove', e => {
	document.body.style.cursor = 'default'
	clearTimeout(mouseHideTimeoutID)
	mouseHideTimeoutID = setTimeout(() => {
		document.body.style.cursor = 'none'
	}, 3000)
})
