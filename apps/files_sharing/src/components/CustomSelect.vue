@@ -0,0 +1,173 @@
<!--
  - @copyright Copyright (c) 2021 Yogesh Shejwadkar <yogesh.shejwadkar@t-systems.com>
  -
  - @author Yogesh Shejwadkar <yogesh.shejwadkar@t-systems.com>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<div class="custom-select"
		:tabindex="tabindex"
		@blur="open = false">
		<div @click="open = isDisable ? open : !open" :class="isDisable ? 'disabledRow' : null">
			<h5>{{ title }}</h5>
			<div class="selected" :class="{ open: open }">
				{{ selected.value }}
				<span class="sort-indicator icon-triangle-s"></span>
			</div>
		</div>
		<div class="items" :class="{ selectHide: !open }">
			<div
				:class="option.key == selected.key ? 'selectedItem' : null"
				v-for="(option, i) of options"
				:key="i"
				@click="
					selected = option;
					open = false;
					$emit('input', option.key);
					setCurrentSelectedOption(option.key);
				">
				<span class="icon-select-check"></span>
				{{ option.value }}
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		options: {
			type: Object,
			required: true,
		},
		default: {
			type: Number,
			required: false,
			default: 0,
		},
		tabindex: {
			type: Number,
			required: false,
			default: 0,
		},
		title: {
			type: String,
			required: false,
			default: null,
		},
		isDisable: {
			type: Boolean,
			default: false,
		}
	},
	data() {
		return {
			selected: this.getDefault(this.default),
			open: false,
		}
	},
	mounted() {
		this.$emit('input', this.selected)
	},
	methods: {
		setCurrentSelectedOption(option) {
			console.info('in setCurrentSelectedOption-', option)
			this.$emit('setSelectedOption', option)
		},
		getDefault(defaultOption) {
			let defaultOpt = null
			if (defaultOption) {
				for (let i = 0; i < Object.keys(this.options).length; i++) {
				// this.options.each(function() {
					if (this.options[i].key === defaultOption) {
						defaultOpt = this.options[i]
					}
				}
			} else if (Object.keys(this.options).length > 0) {
				defaultOpt = this.options[0]
			}
			return defaultOpt
		},
	}
}
</script>

<style scoped>
.custom-select {
	position: relative;
	width: 100%;
	text-align: left;
	outline: none;
	height: 90px;
	line-height: 47px;
}
.custom-select .selected {
	background-color: #fff;
	border-radius: 6px;
	border: 1px solid #666666;
	padding-left: 1em;
	cursor: pointer;
	user-select: none;
}
.custom-select .selected.open {
	border: 1px solid #ad8225;
	border-radius: 6px 6px 0px 0px;
}
/* .custom-select .selected:after {
	position: absolute;
	content: "";
	top: 22px;
	right: 1em;
	width: 0;
	height: 0;
	border: 5px solid transparent;
	border-color: #0a0a0a transparent transparent transparent;
} */
.custom-select .items {
	border-radius: 0px 0px 6px 6px;
	overflow: hidden;
	border-right: 1px solid #ad8225;
	border-left: 1px solid #ad8225;
	border-bottom: 1px solid #ad8225;
	position: absolute;
	background-color: #fff;
	left: 0;
	right: 0;
	z-index: 1;
}
.custom-select .items div {
	padding-left: 1em;
	cursor: pointer;
	user-select: none;
}
.custom-select .items div:hover {
	background-color: #ad8225;
}
.selectHide {
	display: none;
}
</style>