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

function log() {
	let color, stuff, what

	if (localStorage.log) {
		switch (arguments.length) {
			case 3:
				color = arguments[2],
				stuff = arguments[1],
				what = arguments[0]
				break

			case 2:
				if (typeof(arguments[1]) != 'string')
					stuff = arguments[1]
				else
					color = arguments[1]

				what = arguments[0]
				break

			case 1:
				what = arguments[0]
				break

			default:
				return console.log.apply(console, Array.prototype.concat.apply([`${d} ${LOG_PROMPT}`], arguments))
		}

		if (stuff) {
			return console.log(`%c ${what}`, `color: ${(color || '')}`, stuff)
		} else if (/(string|boolean|number)/.test(typeof(what))) {
			return console.log(`%c ${what}`, `color: ${(color || '')}`)
		} else {
			return console.log(what)
		}
	}
}
