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

/**
 * Custom "checkbox" which can halso have a default value (i.e. undefined).
 */
Vue.component('fancy-checkbox', {
	props: {
		value: {},
		useDefault: {
			default: false
		},
		states: {
			default: function() {
				return this.useDefault ? ['Default', 'YES', 'NO'] : ['YES', 'NO']
			}
		}
	},
	template: `
		<div class="fancy-checkbox"
			:value="value"
			:class="{checked: value === true, default: value === undefined}"
			@click="$emit('input', getNext())"
		>{{map[value]}}</div>`,
	created: function () {
		if (this.useDefault)
			this.values = [undefined, true, false]
		else
			this.values = [true, false]

		this.map = {}

		for (let i = 0; i < this.values.length; i++)
			this.map[this.values[i]] = this.states[i]
	},
	methods: {
		getNext: function() {
			let i = (this.values.indexOf(this.value) + 1) % this.values.length
			return this.values[i]
		}
	}
})
