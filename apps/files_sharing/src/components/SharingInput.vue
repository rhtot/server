<!--
  - @copyright Copyright (c) 2019 John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @author John Molakvoæ <skjnldsv@protonmail.com>
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
	<div class="sharing-search">
		<label for="sharing-search-input">{{ t('files_sharing', 'Search for share recipients') }}</label>
		<NcSelect ref="select"
			id="sharing-search-input"
			class="sharing-search__input"
			:disabled="!canReshare"
			:loading="loading"
			:filterable="false"
			:placeholder="inputPlaceholder"
			:clear-search-on-blur="() => false"
			:user-select="true"
			:options="options"
			v-model="value"
			@open="handleOpen"
			@search="asyncFind"
			@option:selected="addShare">
			<template #no-options="{ search }">
				{{ search ? noResultText : t('files_sharing', 'No recommendations. Start typing.') }}
			</template>
		</NcSelect>
		<!-- Create new share -->
		<button v-if="canReshare"
			class="add-new-link-btn"
			@click.prevent.stop="onNewLinkShare">
			{{ t('files_sharing', 'Add link') }}
		</button>
	</div>
</template>

<script>
import { generateOcsUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import { emit } from '@nextcloud/event-bus'
import axios from '@nextcloud/axios'
import debounce from 'debounce'
import NcSelect from '@nextcloud/vue/dist/Components/NcSelect.js'

import Config from '../services/ConfigService.js'
import GeneratePassword from '../utils/GeneratePassword.js'
import Share from '../models/Share.js'
import ShareRequests from '../mixins/ShareRequests.js'
import ShareTypes from '../mixins/ShareTypes.js'

export default {
	name: 'SharingInput',

	components: {
		NcSelect,
	},

	mixins: [ShareTypes, ShareRequests],

	props: {
		shares: {
			type: Array,
			default: () => [],
			required: true,
		},
		linkShares: {
			type: Array,
			default: () => [],
			required: true,
		},
		fileInfo: {
			type: Object,
			default: () => {},
			required: true,
		},
		reshare: {
			type: Share,
			default: null,
		},
		canReshare: {
			type: Boolean,
			required: true,
		},
	},

	data() {
		return {
			config: new Config(),
			loading: false,
			query: '',
			recommendations: [],
			ShareSearch: OCA.Sharing.ShareSearch.state,
			suggestions: [],
			value: null,
		}
	},

	computed: {
		/**
		 * Implement ShareSearch
		 * allows external appas to inject new
		 * results into the autocomplete dropdown
		 * Used for the guests app
		 *
		 * @return {Array}
		 */
		externalResults() {
			return this.ShareSearch.results
		},
		inputPlaceholder() {
			const allowRemoteSharing = this.config.isRemoteShareAllowed

			if (!this.canReshare) {
				return t('files_sharing', 'Resharing is not allowed')
			}
			// We can always search with email addresses for users too
			if (!allowRemoteSharing) {
				return t('files_sharing', 'Name or email …')
			}

			return t('files_sharing', 'Name, email, or Federated Cloud ID …')
		},

		isValidQuery() {
			return this.query && this.query.trim() !== '' && this.query.length > this.config.minSearchStringLength
		},

		options() {
			if (this.isValidQuery) {
				return this.suggestions
			}
			return this.recommendations
		},

		noResultText() {
			if (this.loading) {
				return t('files_sharing', 'Searching …')
			}
			return t('files_sharing', 'No elements found.')
		},
	},

	mounted() {
		this.getRecommendations()

		this.$root.$on('getRecommendations', data => {
			this.getRecommendations()
		})
	},

	methods: {

		/**
		 * Create a new share link and append it to the list
		 */
		async onNewLinkShare() {
			// do not run again if already loading
			if (this.loading) {
				return
			}
			const shareDefaults = {
				share_type: OC.Share.SHARE_TYPE_LINK,
			}
			if (this.config.isDefaultExpireDateEnforced) {
				// default is empty string if not set
				// expiration is the share object key, not expireDate
				shareDefaults.expiration = this.config.defaultExpirationDateString
			}
			if (this.config.enableLinkPasswordByDefault) {
				shareDefaults.password = await GeneratePassword()
			}
			// do not push yet if we need a password or an expiration date: show pending menu
			if (this.config.enforcePasswordForPublicLink || this.config.isDefaultExpireDateEnforced) {
				this.pending = true
				// if a share already exists, pushing it
				if (this.share && !this.share.id) {
					// if the share is valid, create it on the server
					if (this.checkShare(this.share)) {
						await this.pushNewLinkShare(this.share, true)
						return true
					} else {
						this.open = true
						OC.Notification.showTemporary(t('files_sharing', 'Error, please enter proper password and/or expiration date'))
						return false
					}
				}
				// ELSE, show the pending popovermenu
				// if password enforced, pre-fill with random one
				if (this.config.enforcePasswordForPublicLink) {
					shareDefaults.password = await GeneratePassword()
				}
				// create share & close menu
				const share = new Share(shareDefaults)
				const component = await new Promise(resolve => {
					this.$emit('add:share', share, resolve)
				})
				// open the menu on the
				// freshly created share component
				this.open = false
				this.pending = false
				component.open = true
			// Nothing is enforced, creating share directly
			} else {
				const share = new Share(shareDefaults)
				await this.pushNewLinkShare(share)
			}
		},
		/**
		 * Push a new link share to the server
		 * And update or append to the list
		 * accordingly
		 *
		 * @param {Share} share the new share
		 * @param {boolean} [update=false] do we update the current share ?
		 */
		async pushNewLinkShare(share, update) {
			try {
				// do nothing if we're already pending creation
				if (this.loading) {
					return true
				}
				// this.loading = true
				this.errors = {}
				const path = (this.fileInfo.path + '/' + this.fileInfo.name).replace('//', '/')
				const newShare = await this.createShare({
					path,
					shareType: OC.Share.SHARE_TYPE_LINK,
					password: share.password,
					expireDate: share.expireDate,
					// we do not allow setting the publicUpload
					// before the share creation.
					// Todo: We also need to fix the createShare method in
					// lib/Controller/ShareAPIController.php to allow file drop
					// (currently not supported on create, only update)
				})
				this.open = false
				console.debug('Link share created', newShare)
				// if share already exists, copy link directly on next tick
				let component
				if (update) {
					component = await new Promise(resolve => {
						this.$emit('update:share', newShare, resolve)
					})
				} else {
					// adding new share to the array and copying link to clipboard
					// using promise so that we can copy link in the same click function
					// and avoid firefox copy permissions issue
					component = await new Promise(resolve => {
						this.addShare(newShare, resolve)
						// this.$emit('add:share', newShare, resolve)
					})
				}
				// Execute the copy link method
				// freshly created share component
				// ! somehow does not works on firefox !
				if (!this.config.enforcePasswordForPublicLink) {
					// Only copy the link when the password was not forced,
					// otherwise the user needs to copy/paste the password before finishing the share.
					component.copyLink()
				}
			} catch ({ response }) {
				// const message = response.data.ocs.meta.message
				// if (message.match(/password/i)) {
				// 	this.onSyncError('password', message)
				// } else if (message.match(/date/i)) {
				// 	this.onSyncError('expireDate', message)
				// } else {
				// 	this.onSyncError('pending', message)
				// }
			} finally {
				this.loading = false
			}
		},
		async copyLink() {
			try {
				await this.$copyText(this.shareLink)
				// focus and show the tooltip
				this.$refs.copyButton.$el.focus()
				this.copySuccess = true
				this.copied = true
			} catch (error) {
				this.copySuccess = false
				this.copied = true
				console.error(error)
			} finally {
				setTimeout(() => {
					this.copySuccess = false
					this.copied = false
				}, 4000)
			}
		},
		/**
		 * Add a new share into the link shares list
		 * and return the newly created share component
		 *
		 * @param {Share} share the share to add to the array
		 * @param {Function} resolve a function to run after the share is added and its component initialized
		 */
		addShare(share, resolve) {
			this.linkShares.unshift(share)
			this.awaitForShare(share, resolve)
		},
		/**
		 * Await for next tick and render after the list updated
		 * Then resolve with the matched vue component of the
		 * provided share object
		 *
		 * @param {Share} share newly created share
		 * @param {Function} resolve a function to execute after
		 */
		awaitForShare(share, resolve) {
			this.$nextTick(() => {
				const newShare = this.$children.find(component => component.share === share)
				if (newShare) {
					resolve(newShare)
				}
			})
		},

		handleOpen() {
			// Fix dropdown not opening when viewer is open, see https://github.com/nextcloud/viewer/pull/1319
			emit('viewer:trapElements:changed', this.$refs.select.$el)
		},

		async asyncFind(query) {
			// save current query to check if we display
			// recommendations or search results
			this.query = query.trim()
			if (this.isValidQuery) {
				// start loading now to have proper ux feedback
				// during the debounce
				this.loading = true
				await this.debounceGetSuggestions(query)
			}
		},

		/**
		 * Get suggestions
		 *
		 * @param {string} search the search query
		 * @param {boolean} [lookup=false] search on lookup server
		 */
		async getSuggestions(search, lookup = false) {
			this.loading = true

			if (OC.getCapabilities().files_sharing.sharee.query_lookup_default === true) {
				lookup = true
			}

			const shareType = [
				this.SHARE_TYPES.SHARE_TYPE_USER,
				this.SHARE_TYPES.SHARE_TYPE_GROUP,
				this.SHARE_TYPES.SHARE_TYPE_REMOTE,
				this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP,
				this.SHARE_TYPES.SHARE_TYPE_CIRCLE,
				this.SHARE_TYPES.SHARE_TYPE_ROOM,
				this.SHARE_TYPES.SHARE_TYPE_GUEST,
				this.SHARE_TYPES.SHARE_TYPE_DECK,
				this.SHARE_TYPES.SHARE_TYPE_SCIENCEMESH,
			]

			if (OC.getCapabilities().files_sharing.public.enabled === true) {
				shareType.push(this.SHARE_TYPES.SHARE_TYPE_EMAIL)
			}

			let request = null
			try {
				request = await axios.get(generateOcsUrl('apps/files_sharing/api/v1/sharees'), {
					params: {
						format: 'json',
						itemType: this.fileInfo.type === 'dir' ? 'folder' : 'file',
						search,
						lookup,
						perPage: this.config.maxAutocompleteResults,
						shareType,
					},
				})
			} catch (error) {
				console.error('Error fetching suggestions', error)
				return
			}

			const data = request.data.ocs.data
			const exact = request.data.ocs.data.exact
			data.exact = [] // removing exact from general results

			// flatten array of arrays
			const rawExactSuggestions = Object.values(exact).reduce((arr, elem) => arr.concat(elem), [])
			const rawSuggestions = Object.values(data).reduce((arr, elem) => arr.concat(elem), [])

			// remove invalid data and format to user-select layout
			const exactSuggestions = this.filterOutExistingShares(rawExactSuggestions)
				.map(share => this.formatForMultiselect(share))
				// sort by type so we can get user&groups first...
				.sort((a, b) => a.shareType - b.shareType)
			const suggestions = this.filterOutExistingShares(rawSuggestions)
				.map(share => this.formatForMultiselect(share))
				// sort by type so we can get user&groups first...
				.sort((a, b) => a.shareType - b.shareType)

			// lookup clickable entry
			// show if enabled and not already requested
			const lookupEntry = []
			if (data.lookupEnabled && !lookup) {
				lookupEntry.push({
					id: 'global-lookup',
					isNoUser: true,
					displayName: t('files_sharing', 'Search globally'),
					lookup: true,
				})
			}

			// if there is a condition specified, filter it
			const externalResults = this.externalResults.filter(result => !result.condition || result.condition(this))

			const allSuggestions = exactSuggestions.concat(suggestions).concat(externalResults).concat(lookupEntry)

			// Count occurrences of display names in order to provide a distinguishable description if needed
			const nameCounts = allSuggestions.reduce((nameCounts, result) => {
				if (!result.displayName) {
					return nameCounts
				}
				if (!nameCounts[result.displayName]) {
					nameCounts[result.displayName] = 0
				}
				nameCounts[result.displayName]++
				return nameCounts
			}, {})

			this.suggestions = allSuggestions.map(item => {
				// Make sure that items with duplicate displayName get the shareWith applied as a description
				if (nameCounts[item.displayName] > 1 && !item.desc) {
					return { ...item, desc: item.shareWithDisplayNameUnique }
				}
				return item
			})

			this.loading = false
			console.info('suggestions', this.suggestions)
		},

		/**
		 * Debounce getSuggestions
		 *
		 * @param {...*} args the arguments
		 */
		debounceGetSuggestions: debounce(function(...args) {
			this.getSuggestions(...args)
		}, 300),

		/**
		 * Get the sharing recommendations
		 */
		async getRecommendations() {
			this.loading = true

			let request = null
			try {
				request = await axios.get(generateOcsUrl('apps/files_sharing/api/v1/sharees_recommended'), {
					params: {
						format: 'json',
						itemType: this.fileInfo.type,
					},
				})
			} catch (error) {
				console.error('Error fetching recommendations', error)
				return
			}

			// Add external results from the OCA.Sharing.ShareSearch api
			const externalResults = this.externalResults.filter(result => !result.condition || result.condition(this))

			// flatten array of arrays
			const rawRecommendations = Object.values(request.data.ocs.data.exact)
				.reduce((arr, elem) => arr.concat(elem), [])

			// remove invalid data and format to user-select layout
			this.recommendations = this.filterOutExistingShares(rawRecommendations)
				.map(share => this.formatForMultiselect(share))
				.concat(externalResults)

			this.loading = false
			console.info('recommendations', this.recommendations)
		},

		/**
		 * Filter out existing shares from
		 * the provided shares search results
		 *
		 * @param {object[]} shares the array of shares object
		 * @return {object[]}
		 */
		filterOutExistingShares(shares) {
			return shares.reduce((arr, share) => {
				// only check proper objects
				if (typeof share !== 'object') {
					return arr
				}
				try {
					if (share.value.shareType === this.SHARE_TYPES.SHARE_TYPE_USER) {
						// filter out current user
						if (share.value.shareWith === getCurrentUser().uid) {
							return arr
						}

						// filter out the owner of the share
						if (this.reshare && share.value.shareWith === this.reshare.owner) {
							return arr
						}
					}

					// filter out existing mail shares
					if (share.value.shareType === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
						const emails = this.linkShares.map(elem => elem.shareWith)
						if (emails.indexOf(share.value.shareWith.trim()) !== -1) {
							return arr
						}
					} else { // filter out existing shares
						// creating an object of uid => type
						const sharesObj = this.shares.reduce((obj, elem) => {
							obj[elem.shareWith] = elem.type
							return obj
						}, {})

						// if shareWith is the same and the share type too, ignore it
						const key = share.value.shareWith.trim()
						if (key in sharesObj
							&& sharesObj[key] === share.value.shareType) {
							return arr
						}
					}

					// ALL GOOD
					// let's add the suggestion
					arr.push(share)
				} catch {
					return arr
				}
				return arr
			}, [])
		},

		/**
		 * Get the icon based on the share type
		 *
		 * @param {number} type the share type
		 * @return {string} the icon class
		 */
		shareTypeToIcon(type) {
			switch (type) {
			case this.SHARE_TYPES.SHARE_TYPE_GUEST:
				// default is a user, other icons are here to differentiate
				// themselves from it, so let's not display the user icon
				// case this.SHARE_TYPES.SHARE_TYPE_REMOTE:
				// case this.SHARE_TYPES.SHARE_TYPE_USER:
				return {
					icon: 'icon-user',
					iconTitle: t('files_sharing', 'Guest'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP:
			case this.SHARE_TYPES.SHARE_TYPE_GROUP:
				return {
					icon: 'icon-group',
					iconTitle: t('files_sharing', 'Group'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_EMAIL:
				return {
					icon: 'icon-mail',
					iconTitle: t('files_sharing', 'Email'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_CIRCLE:
				return {
					icon: 'icon-circle',
					iconTitle: t('files_sharing', 'Circle'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_ROOM:
				return {
					icon: 'icon-room',
					iconTitle: t('files_sharing', 'Talk conversation'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_DECK:
				return {
					icon: 'icon-deck',
					iconTitle: t('files_sharing', 'Deck board'),
				}
			case this.SHARE_TYPES.SHARE_TYPE_SCIENCEMESH:
				return {
					icon: 'icon-sciencemesh',
					iconTitle: t('files_sharing', 'ScienceMesh'),
				}
			default:
				return {}
			}
		},

		/**
		 * Format shares for the multiselect options
		 *
		 * @param {object} result select entry item
		 * @return {object}
		 */
		formatForMultiselect(result) {
			let subtitle
			if (result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_USER && this.config.shouldAlwaysShowUnique) {
				subtitle = result.shareWithDisplayNameUnique ?? ''
			} else if ((result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_REMOTE
					|| result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_REMOTE_GROUP
			) && result.value.server) {
				subtitle = t('files_sharing', 'on {server}', { server: result.value.server })
			} else if (result.value.shareType === this.SHARE_TYPES.SHARE_TYPE_EMAIL) {
				subtitle = result.value.shareWith
			} else {
				subtitle = result.shareWithDescription ?? ''
			}

			return {
				id: `${result.value.shareType}-${result.value.shareWith}`,
				shareWith: result.value.shareWith,
				shareType: result.value.shareType,
				user: result.uuid || result.value.shareWith,
				isNoUser: result.value.shareType !== this.SHARE_TYPES.SHARE_TYPE_USER,
				displayName: result.name || result.label,
				subtitle,
				shareWithDisplayNameUnique: result.shareWithDisplayNameUnique || '',
				...this.shareTypeToIcon(result.value.shareType),
			}
		},
		async showPermissions(value) {
			// this.$root.$emit('optionValues', value)
			this.$store.commit('addOption', value)
			this.$store.commit('addFromInput', true)
			const newShare = new Share({})
			newShare.permissions = OC.PERMISSION_READ
			newShare.expireDate = ''
			newShare.password = ''
			this.$store.commit('addShare', newShare)
			this.$store.commit('addCurrentTab', 'permissions')
		},		
	},
}
</script>

<style lang="scss">
.sharing-search {
	display: flex;
	flex-direction: column;
	margin-bottom: 4px;

	label[for="sharing-search-input"] {
		margin-bottom: 2px;
	}

	&__input {
		width: 100%;
		margin: 10px 0;
	}
}

.vs__dropdown-menu {
	// properly style the lookup entry
	span[lookup] {
		.avatardiv {
			background-image: var(--icon-search-white);
			background-repeat: no-repeat;
			background-position: center;
			background-color: var(--color-text-maxcontrast) !important;
			div {
				display: none;
			}
		}
	}
}
</style>
