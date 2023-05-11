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
	<li :class="isEmailShareType ? 'email-share-link sharing-entry sharing-entry__link' : 'link-share-link sharing-entry sharing-entry__link'">
		<NcAvatar :is-no-user="true"
			:icon-class="isEmailShareType ? 'avatar-link-share icon-mail-white' : 'avatar-link-share icon-public-white'"
			class="sharing-entry__avatar" />
		<div class="sharing-entry__desc">
			<div v-if="!share.canEdit">
				<h5 :title="title">
					{{ title }}
				</h5>

			</div>

			<div id="app">
				<template v-if="share">
					<template v-if="share.canEdit">
						<!-- folder -->
						<template v-if="isFolder && fileHasCreatePermission && config.isPublicUploadEnabled">
							<CustomSelect
								:title="title"
								:options="getFolderOptions"
								:default="sharePermissions"
								@setSelectedOption="togglePermissions($event);"
								class="select" />
						</template>

						<!-- file -->
						<template v-else>
							<CustomSelect
								:title="title"
								:isDisable="true"
								:options="getFileOptions"
								:default="sharePermissions"
								@setSelectedOption="togglePermissions($event);"
								class="select" />
						</template>
					</template>
				</template>
			</div>
		</div>

		<!-- clipboard -->
		<NcActions v-if="share && !isEmailShareType && share.token"
			ref="copyButton"
			class="sharing-entry__copy">
			<NcActionLink :href="shareLink"
				target="_blank"
				:title="copyLinkTooltip"
				:aria-label="copyLinkTooltip"
				:icon="copied && copySuccess ? 'icon-checkmark-color' : 'icon-clippy'"
				@click.stop.prevent="copyLink" />
		</NcActions>

		<!-- pending actions -->
		<NcActions v-if="!pending && (pendingPassword || pendingExpirationDate)"
			class="sharing-entry__actions"
			:aria-label="actionsTooltip"
			menu-align="right"
			:open.sync="open"
			@close="onNewLinkShare">
			<!-- pending data menu -->
			<NcActionText v-if="errors.pending"
				icon="icon-error"
				:class="{ error: errors.pending}">
				{{ errors.pending }}
			</NcActionText>
			<NcActionText v-else icon="icon-info">
				{{ t('files_sharing', 'Please enter the following required information before creating the share') }}
			</NcActionText>

			<!-- password -->
			<NcActionText v-if="pendingPassword" icon="icon-password">
				{{ t('files_sharing', 'Password protection (enforced)') }}
			</NcActionText>
			<NcActionCheckbox v-else-if="config.enableLinkPasswordByDefault"
				:checked.sync="isPasswordProtected"
				:disabled="config.enforcePasswordForPublicLink || saving"
				class="share-link-password-checkbox"
				@uncheck="onPasswordDisable">
				{{ t('files_sharing', 'Password protection') }}
			</NcActionCheckbox>

			<NcActionInput v-if="pendingPassword || share.password"
				class="share-link-password"
				:value.sync="share.password"
				:disabled="saving"
				:required="config.enableLinkPasswordByDefault || config.enforcePasswordForPublicLink"
				:minlength="isPasswordPolicyEnabled && config.passwordPolicy.minLength"
				icon=""
				autocomplete="new-password"
				@submit="onNewLinkShare">
				{{ t('files_sharing', 'Enter a password') }}
			</NcActionInput>

			<!-- expiration date -->
			<NcActionText v-if="pendingExpirationDate" icon="icon-calendar-dark">
				{{ t('files_sharing', 'Expiration date (enforced)') }}
			</NcActionText>
			<NcActionInput v-if="pendingExpirationDate"
				class="share-link-expire-date"
				:disabled="saving"
				:is-native-picker="true"
				:hide-label="true"
				:first-day-of-week="firstDay"
				:value="new Date(share.expireDate)"
				type="date"
				:min="dateTomorrow"
				:max="dateMaxEnforced"
				@input="onExpirationChange">
				<!-- let's not submit when picked, the user
					might want to still edit or copy the password -->
				{{ t('files_sharing', 'Enter a date') }}
			</NcActionInput>

			<NcActionButton icon="icon-checkmark" @click.prevent.stop="onNewLinkShare">
				{{ t('files_sharing', 'Create share') }}
			</NcActionButton>
			<NcActionButton icon="icon-close" @click.prevent.stop="onCancel">
				{{ t('files_sharing', 'Cancel') }}
			</NcActionButton>
		</NcActions>

		<!-- actions -->
		<NcActions v-else-if="!loading"
			class="sharing-entry__actions"
			:aria-label="actionsTooltip"
			menu-align="right"
			:open.sync="open"
			@close="onMenuClose">
			<template v-if="share">
				<!-- external sharing via url (social...) -->
				<NcActionLink v-for="({icon, url, name}, index) in externalActions"
					:key="index"
					:href="url(shareLink)"
					:icon="icon"
					target="_blank">
					{{ name }}
				</NcActionLink>

				<NcActionLink v-if="share.canEdit"
					icon="icon-settings"
					:disabled="saving"
					@click.prevent="editPermissions">
					{{ t('files_sharing', 'Advanced permission') }}
				</NcActionLink>
				<NcActionLink v-if="share.canEdit && isEmailShareType"
					icon="icon-mail"
					:disabled="saving"
					@click.prevent="editNotes">
					{{ t('files_sharing', 'Send new mail') }}
				</NcActionLink>

				<NcActionButton v-if="share.canDelete"
					icon="icon-close"
					:disabled="saving"
					@click.prevent="onDelete">
					{{ t('files_sharing', 'Unshare') }}
				</NcActionButton>
				<!-- <NcActionButton v-if="!isEmailShareType && canReshare"
					class="new-share-link"
					icon="icon-add"
					@click.prevent.stop="onNewLinkShare">
					{{ t('files_sharing', 'Add another link') }}
				</NcActionButton> -->
			</template>

		<!-- loading indicator to replace the menu -->
		<div v-else class="icon-loading-small sharing-entry__loading" />
	</li>
</template>

<script>
import { generateUrl } from '@nextcloud/router'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { Type as ShareTypes } from '@nextcloud/sharing'
import Vue from 'vue'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcActionCheckbox from '@nextcloud/vue/dist/Components/NcActionCheckbox.js'
import NcActionInput from '@nextcloud/vue/dist/Components/NcActionInput.js'
import NcActionLink from '@nextcloud/vue/dist/Components/NcActionLink.js'
import NcActionText from '@nextcloud/vue/dist/Components/NcActionText.js'
import NcActionSeparator from '@nextcloud/vue/dist/Components/NcActionSeparator.js'
import NcActionTextEditable from '@nextcloud/vue/dist/Components/NcActionTextEditable.js'
import NcActions from '@nextcloud/vue/dist/Components/NcActions.js'
import NcAvatar from '@nextcloud/vue/dist/Components/NcAvatar.js'

import GeneratePassword from '../utils/GeneratePassword.js'
import Share from '../models/Share.js'
import SharesMixin from '../mixins/SharesMixin.js'
import CustomSelect from './CustomSelect'

export default {
	name: 'SharingEntryLink',

	components: {
		NcActions,
		NcActionButton,
		NcActionCheckbox,
		NcActionInput,
		NcActionLink,
		NcActionText,
		NcActionTextEditable,
		NcActionSeparator,
		NcAvatar,
		CustomSelect

	},

	mixins: [SharesMixin],

	props: {
		canReshare: {
			type: Boolean,
			default: true,
		},
		index: {
			type: Number,
			default: null,
		},
	},

	data() {
		return {
			copySuccess: true,
			copied: false,

			// Are we waiting for password/expiration date
			pending: false,

			publicUploadRWValue: OC.PERMISSION_UPDATE | OC.PERMISSION_CREATE | OC.PERMISSION_READ | OC.PERMISSION_DELETE,
			publicUploadRValue: OC.PERMISSION_READ,
			publicUploadWValue: OC.PERMISSION_CREATE,
			publicUploadEValue: OC.PERMISSION_UPDATE | OC.PERMISSION_READ,
			ExternalLinkActions: OCA.Sharing.ExternalLinkActions.state,

		}
	},

	computed: {

		/**
		 * Return the current share permissions
		 * We always ignore the SHARE permission as this is used for the
		 * federated sharing.
		 * @returns {number}
		 */
		sharePermissions() {
			return this.share.permissions & ~OC.PERMISSION_SHARE
		},
		/**
		 * Generate a unique random id for this SharingEntryLink only
		 * @returns {string}
		 */
		randomId() {
			return Math.random().toString(27).substr(2)
		},

		/**
		 * Link share label
		 *
		 * @returns {string}
		 */
		title() {
			// if we have a valid existing share (not pending)
			if (this.share && this.share.id) {
				if (!this.isShareOwner && this.share.ownerDisplayName) {
					if (this.isEmailShareType) {
						return t('files_sharing', '{shareWith} by {initiator}', {
							shareWith: this.share.shareWith,
							initiator: this.share.ownerDisplayName,
						})
					}
					return t('files_sharing', 'Shared via link by {initiator}', {
						initiator: this.share.ownerDisplayName,
					})
				}
				if (this.share.label && this.share.label.trim() !== '') {
					if (this.isEmailShareType) {
						return t('files_sharing', 'Mail share ({label})', {
							label: this.share.label.trim(),
						})
					}
					return t('files_sharing', 'Link "{label}"', {
						label: this.share.label.trim(),
					})
				}
				if (this.isEmailShareType) {
					return this.share.shareWith
				}
			}
			if (this.index > 1) {
				return t('files_sharing', 'Link to file', { index: this.index })
			}
			if (this.fileInfo.type === 'dir') {
				return t('files_sharing', 'Link to folder')
			} else {
				return t('files_sharing', 'Link to file')
			}
		},

		/**
		 * Show the email on a second line if a label is set for mail shares
		 *
		 *  @returns {string}
		 */
		subtitle() {
			if (this.isEmailShareType
				&& this.title !== this.share.shareWith) {
				return this.share.shareWith
			}
			return null
		},

		

		/**
		 * Is the current share password protected ?
		 *
		 * @returns {boolean}
		 */
		isPasswordProtected: {
			get() {
				return this.config.enforcePasswordForPublicLink
					|| !!this.share.password
			},
			async set(enabled) {
				// TODO: directly save after generation to make sure the share is always protected
				Vue.set(this.share, 'password', enabled ? await GeneratePassword() : '')
				Vue.set(this.share, 'newPassword', this.share.password)
			},
		},

		
		/**
		 * Is the current share an email share ?
		 *
		 * @return {boolean}
		 */
		isEmailShareType() {
			return this.share
				? this.share.type === this.SHARE_TYPES.SHARE_TYPE_EMAIL
				: false
		},

		/**
		 * Pending data.
		 * If the share still doesn't have an id, it is not synced
		 * Therefore this is still not valid and requires user input
		 *
		 * @return {boolean}
		 */
		pendingPassword() {
			return this.config.enforcePasswordForPublicLink && this.share && !this.share.id
		},
		pendingExpirationDate() {
			return this.config.isDefaultExpireDateEnforced && this.share && !this.share.id
		},

		// if newPassword exists, but is empty, it means
		// the user deleted the original password
		hasUnsavedPassword() {
			return this.share.newPassword !== undefined
		},

		/**
		 * Is the current share a folder ?
		 * TODO: move to a proper FileInfo model?
		 * @returns {boolean}
		 */
		isFolder() {
			return this.fileInfo.type === 'dir'
		},
		/**
		 * Does the current file/folder have create permissions
		 * TODO: move to a proper FileInfo model?
		 * @returns {boolean}
		 */
		fileHasCreatePermission() {
			return !!(this.fileInfo.permissions & OC.PERMISSION_CREATE)
		},


		/**
		 * Return the public share link
		 *
		 * @return {string}
		 */
		shareLink() {
			return window.location.protocol + '//' + window.location.host + generateUrl('/s/') + this.share.token
		},

		/**
		 * Tooltip message for actions button
		 *
		 * @return {string}
		 */
		actionsTooltip() {
			return t('files_sharing', 'Actions for "{title}"', { title: this.title })
		},

		/**
		 * Tooltip message for copy button
		 *
		 * @return {string}
		 */
		copyLinkTooltip() {
			if (this.copied) {
				if (this.copySuccess) {
					return ''
				}
				return t('files_sharing', 'Cannot copy, please copy the link manually')
			}
			return t('files_sharing', 'Copy public link of "{title}" to clipboard', { title: this.title })
		},

		/**
		 * External additionnai actions for the menu
		 *
		 * External aditionnal actions for the menu
		 * @returns {Array}
		 */
		externalActions() {
			return this.ExternalLinkActions.actions
		},

		isPasswordPolicyEnabled() {
			return typeof this.config.passwordPolicy === 'object'
		},

		getFolderOptions() {
			const options = {}
			options[0] = { key: this.publicUploadRValue, value: t('files_sharing', 'Read only') }
			options[1] = { key: this.publicUploadRWValue, value: t('files_sharing', 'Read, write and upload') }
			options[2] = { key: this.publicUploadWValue, value: t('files_sharing', 'File drop (upload only)') }
			return options
		},
		getFileOptions() {
			const options = {}
			options[0] = { key: this.publicUploadRValue, value: t('files_sharing', 'Read only') }
			options[1] = { key: this.publicUploadEValue, value: t('files_sharing', 'Read and write') }
			return options
		},
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
				share_type: ShareTypes.SHARE_TYPE_LINK,
			}
			if (this.config.isDefaultExpireDateEnforced) {
				// default is empty string if not set
				// expiration is the share object key, not expireDate
				shareDefaults.expiration = this.formatDateToString(this.config.defaultExpirationDate)
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
						try {
							await this.pushNewLinkShare(this.share, true)
						} catch (e) {
							this.pending = false
							console.error(e)
							return false
						}
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

				this.loading = true
				this.errors = {}

				const path = (this.fileInfo.path + '/' + this.fileInfo.name).replace('//', '/')
				const options = {
					path,
					shareType: ShareTypes.SHARE_TYPE_LINK,
					password: share.password,
					expireDate: share.expireDate,
					attributes: JSON.stringify(this.fileInfo.shareAttributes),
					// we do not allow setting the publicUpload
					// before the share creation.
					// Todo: We also need to fix the createShare method in
					// lib/Controller/ShareAPIController.php to allow file drop
					// (currently not supported on create, only update)
				}

				console.debug('Creating link share with options', options)
				const newShare = await this.createShare(options)

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
						this.$emit('add:share', newShare, resolve)
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
				showSuccess(t('sharing', 'Link share created'))

			} catch (data) {
				const message = data?.response?.data?.ocs?.meta?.message
				if (!message) {
					showError(t('sharing', 'Error while creating the share'))
					console.error(data)
					return
				}

				if (message.match(/password/i)) {
					this.onSyncError('password', message)
				} else if (message.match(/date/i)) {
					this.onSyncError('expireDate', message)
				} else {
					this.onSyncError('pending', message)
				}
				throw data
			} finally {
				this.loading = false
			}
		},


		togglePermissions(option) {
			const permissions = parseInt(option, 10)
			this.share.permissions = permissions
			this.queueUpdate('permissions')

			if (permissions === OC.PERMISSION_CREATE) {
					this.share.hideDownload = false
					this.queueUpdate('hideDownload')
			}
		},
		async copyLink() {
			try {
				await navigator.clipboard.writeText(this.shareLink)
				showSuccess(t('files_sharing', 'Link copied'))
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
		 * Uncheck password protection
		 * We need this method because @update:checked
		 * is ran simultaneously as @uncheck, so we
		 * cannot ensure data is up-to-date
		 */
		onPasswordDisable() {
			this.share.password = ''

			// reset password state after sync
			this.$delete(this.share, 'newPassword')

			// only update if valid share.
			if (this.share.id) {
				this.queueUpdate('password')
			}
		},

		/**
		 * Menu have been closed or password has been submitted.
		 * The only property that does not get
		 * synced automatically is the password
		 * So let's check if we have an unsaved
		 * password.
		 * expireDate is saved on datepicker pick
		 * or close.
		 */
		onPasswordSubmit() {
			if (this.hasUnsavedPassword) {
				this.share.password = this.share.newPassword.trim()
				this.queueUpdate('password')
			}
		},

		/**
		 * Save potential changed data on menu close
		 */
		onMenuClose() {
			this.onPasswordSubmit()
			this.onNoteSubmit()
		},

		/**
		 * Cancel the share creation
		 * Used in the pending popover
		 */
		onCancel() {
			// this.share already exists at this point,
			// but is incomplete as not pushed to server
			// YET. We can safely delete the share :)
			this.$emit('remove:share', this.share)
		},
		editPermissions() {
			this.$store.commit('addFromInput', false)
			this.$store.commit('addShare', this.share)
			this.$store.commit('addCurrentTab', 'permissions')
		},
		editNotes() {
			this.$store.commit('addFromInput', false)
			this.$store.commit('addShare', this.share)
			this.$store.commit('addCurrentTab', 'notes')
		},
	},
}
</script>

<style lang="scss" scoped>
.sharing-entry {
	display: flex;
	align-items: center;
	min-height: 44px;
	&__desc {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 8px;
		line-height: 1.2em;
		overflow: hidden;

		p {
			color: var(--color-text-maxcontrast);
		}
	}
	&__title {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	&:not(.sharing-entry--share) &__actions {
		.new-share-link {
			border-top: 1px solid var(--color-border);
		}
	}

	::v-deep .avatar-link-share {
		background-color: var(--color-primary);
	}

	.sharing-entry__action--public-upload {
		border-bottom: 1px solid var(--color-border);
	}

	&__loading {
		width: 44px;
		height: 44px;
		margin: 0;
		padding: 14px;
		margin-left: auto;
	}

	// put menus to the left
	// but only the first one
	.action-item {
		margin-left: auto;
		~ .action-item,
		~ .sharing-entry__loading {
			margin-left: 0;
		}
	}

	.icon-checkmark-color {
		opacity: 1;
	}
}
</style>
