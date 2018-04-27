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

"use strict";

var LOG_PROMPT = '>>>';

function _getTimestamp() {
	var d = new Date();
		d = [d.getHours(), d.getMinutes(), d.getSeconds()],
		d = `${d[0] > 9 ? d[0] : '0' + d[0]}:${d[1] > 9 ? d[1] : '0' + d[1]}:${d[2] > 9 ? d[2] : '0' + d[2]}`;
	return d;
}

window.onerror = function _log_err(desc, page, line, chr) {
	if (localStorage.log) {
		console.log(`%c ${_getTimestamp()} ${LOG_PROMPT} ERROR: "${desc}" in ${page.split('/').reverse()[0]}:${line}:${chr}`, 'color: #FF2929');
		return true;
	}
}

function _log() {
	var d;

	if (localStorage.log) {
		d = _getTimestamp();

		switch (arguments.length) {
			case 3:
				var color = arguments[2],
				    stuff = arguments[1],
				    what = arguments[0];
				break;

			case 2:
				if (typeof(arguments[1]) != 'string')
					var stuff = arguments[1];
				else
					var color = arguments[1];

				what = arguments[0];
				break;

			case 1:
				var what = arguments[0];
				break;

			default:
				return console.log.apply(console, Array.prototype.concat.apply([`${d} ${LOG_PROMPT}`], arguments));
		}

		if (stuff) {
			return console.log(`%c ${d} ${LOG_PROMPT} ${what}`, `color: ${(color || '')}`, stuff);
		} else if (/(string|boolean|number)/.test(typeof(what))) {
			return console.log(`%c ${d} ${LOG_PROMPT} ${what}`, `color: ${(color || '')}`);
		} else {
			return console.log(`%c ${d} ${LOG_PROMPT}`, `color: ${(color || '')}`, what);
		}
	}
}
