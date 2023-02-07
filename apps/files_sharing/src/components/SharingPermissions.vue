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
	<ul class="sharing-permissions">
		<!-- for email and link share -->
		<template v-if="isExteranlShare">
			<label class="permissions">
				{{ t('files_sharing', 'Permissions') }}
			</label>
			<!-- folder -->
			<template v-if="isFolder && fileHasCreatePermission && config.isPublicUploadEnabled">
				<ActionRadio :checked="sharePermissions === publicUploadRValue"
					:value="publicUploadRValue"
					:name="randomId"
					:disabled="saving"
					@change="addPermissions">
					{{ t('files_sharing', 'Read only') }}
				</ActionRadio>
				<ActionRadio :checked="sharePermissions === publicUploadRWValue"
					:value="publicUploadRWValue"
					:disabled="saving"
					:name="randomId"
					@change="addPermissions">
					{{ t('files_sharing', 'Read, write and upload') }}
				</ActionRadio>
				<ActionRadio :checked="sharePermissions === publicUploadWValue"
					:value="publicUploadWValue"
					:disabled="saving"
					:name="randomId"
					class="sharing-entry__action--public-upload"
					@change="addPermissions">
					{{ t('files_sharing', 'File drop (upload only)') }}
				</ActionRadio>
				<div class="filedrop-message">
					{{ t('files_sharing', 'With File drop, only uploading is allowed. Only you can see files and folders that have been uploaded.') }}
				</div>
			</template>

			<!-- file -->
			<template v-else>
				<ActionRadio :checked="sharePermissions === publicUploadRValue"
					:value="publicUploadRValue"
					:name="randomId"
					:disabled="isAllowed"
					@change="addPermissions">
					{{ t('files_sharing', 'Read only') }}
				</ActionRadio>
				<div
					class="readonly-message">
					{{ t('files_sharing', 'There are no editing functions for files shared with non-MagentaCLOUD users.') }}
				</div>

				<ActionRadio :checked="sharePermissions === publicUploadEValue"
					:value="publicUploadEValue"
					:disabled="isAllowed"
					:name="randomId"
					@change="addPermissions">
					{{ t('files_sharing', 'Read and write') }}
				</ActionRadio>
			</template>

			<div class="advanced-settings">
				<label @click="showAdLink = !showAdLink">
					{{ t('files_sharing', 'Advanced') }}<span v-bind:class="['sort-indicator',{ 'icon-triangle-s':showAdLink},{'icon-triangle-n':!showAdLink}]"></span>
				</label>
				<div v-show="showAdLink">
					<input
						v-if="isLinkShare"
						ref='label'
						:placeholder="shareLabelPlaceholder"
						:class="{ error: errors.label }"
						:disabled="saving"
						v-model="shareLabel" />

					<ActionCheckbox :checked.sync="share.hideDownload"
						:disabled="saving || sharePermissions === publicUploadWValue"
						@change="addHideDownload">
						{{ t('files_sharing', 'Hide download') }}
					</ActionCheckbox>

					<!-- password -->
					<ActionCheckbox :checked.sync="isPasswordProtected"
						:disabled="config.enforcePasswordForPublicLink || saving"
						class="share-link-password-checkbox"
						@uncheck="onPasswordDisable">
						{{ config.enforcePasswordForPublicLink
							? t('files_sharing', 'Password protection (enforced)')
							: t('files_sharing', 'Password protect') }}
					</ActionCheckbox>
					<ActionInput v-if="isPasswordProtected"
						ref="password"
						icon=""
						:disabled="saving"
						:required="config.enforcePasswordForPublicLink"
						:value="hasUnsavedPassword ? share.newPassword : '***************'"
						autocomplete="new-password"
						@update:value="onPasswordChange"
						:type="hasUnsavedPassword ? 'text': 'password'">
						{{ t('files_sharing', 'Enter a password') }}
					</ActionInput>
					<div v-if="isPasswordProtected"
						class="password-message">
						{{ t('files_sharing', 'The password is not sent with the email to maintain confidentiality.') }}
					</div>

					<!-- password protected by Talk -->
					<ActionCheckbox v-if="isPasswordProtectedByTalkAvailable"
						:checked.sync="share.sendPasswordByTalk"
						:disabled="!canTogglePasswordProtectedByTalkAvailable || saving"
						class="share-link-password-talk-checkbox"
						@change="addPasswordProtectedByTalkChange">
						{{ t('files_sharing', 'Video verification') }}
					</ActionCheckbox>

					<!-- expiration date -->
					<ActionCheckbox
						v-if="canHaveExpirationDate"
						:checked.sync="hasExpirationDate">
						{{ config.isDefaultInternalExpireDateEnforced
							? t('files_sharing', 'Expiration date enforced')
							: t('files_sharing', 'Set expiration date') }}
					</ActionCheckbox>
					<ActionInput v-if="hasExpirationDate"
						ref="expireDate"
						:disabled="saving"
						:lang="lang"
						:value="share.expireDate || this.config.defaultInternalExpirationDateString"
						value-type="format"
						icon="icon-calendar-dark"
						type="date"
						@update:value="addExpirationDate">
						{{ t('files_sharing', 'Enter a date') }}
					</ActionInput>
					<div v-if="isLinkShare && !isFolder">
						<ExternalShareAction v-for="action in externalLinkActions"
							:id="action.id"
							:key="action.id"
							:action="action"
							:file-info="fileInfo"
							:share="share" />
					</div>
				</div>
			</div>
		</template>
		<template v-else>
			<label class="permissions">
				{{ t('files_sharing', 'Permissions') }}
			</label>
			<!-- folder -->
			<template v-if="isFolder && config.isPublicUploadEnabled">
				<ActionRadio :checked="sharePermissions === publicUploadRValue"
					:value="publicUploadRValue"
					:name="randomId"
					@change="addPermissions"
					:disabled="saving">
					{{ t('files_sharing', 'Read only') }}
				</ActionRadio>

				<ActionRadio :checked="sharePermissions === publicUploadRWValue"
					:value="publicUploadRWValue"
					:disabled="saving"
					@change="addPermissions"
					:name="randomId">
					{{ t('files_sharing', 'Read, write and upload') }}
				</ActionRadio>
			</template>
			<!-- file -->
			<template v-else>
				<ActionRadio :checked="sharePermissions === publicUploadRValue"
					:value="publicUploadRValue"
					:name="randomId"
					@change="addPermissions"
					:disabled="saving">
					{{ t('files_sharing', 'Read only') }}
				</ActionRadio>

				<ActionRadio :checked="sharePermissions === publicUploadEValue"
					:value="publicUploadEValue"
					:disabled="saving"
					@change="addPermissions"
					:name="randomId">
					{{ t('files_sharing', 'Read and write') }}
				</ActionRadio>
			</template>

			<div class="advanced-settings">
				<label @click="show = !show">
					{{ t('files_sharing', 'Advanced') }}<span v-bind:class="['sort-indicator',{ 'icon-triangle-s':showAdLink},{'icon-triangle-n':!showAdLink}]"></span>
				</label>
				<div v-show="show">
					<!-- reshare permission -->
					<ActionCheckbox
						v-if="config.isResharingAllowed"
						ref="canReshare"
						:checked.sync="canReshare"
						:value="permissionsShare"
						:disabled="saving || !canSetReshare">
						{{ t('files_sharing', 'Allow resharing') }}
					</ActionCheckbox>

					<!-- expiration date -->
					<ActionCheckbox
						v-if="canHaveExpirationDate"
						:checked.sync="hasExpirationDate">
						{{ config.isDefaultInternalExpireDateEnforced
							? t('files_sharing', 'Expiration date enforced')
							: t('files_sharing', 'Set expiration date') }}
					</ActionCheckbox>
					<ActionInput v-if="hasExpirationDate"
						ref="expireDate"
						:disabled="saving"
						:first-day-of-week="firstDay"
						:lang="lang"
						:value="share.expireDate || this.config.defaultInternalExpirationDateString"
						value-type="format"
						icon="icon-calendar-dark"
						type="date"
						@update:value="addExpirationDate">
						{{ t('files_sharing', 'Enter a date') }}
					</ActionInput>
				</div>
			</div>
		</template>

		<button class="status-buttons__select"
			:name="randomId"
			:disabled="saving"
			@click="cancelSharing">
			{{ t('files_sharing', 'Cancel') }}
		</button>
		<template v-if="share.id > 0">
			<button class="status-buttons__primary primary"
				:name="randomId"
				:disabled="saving"
				@click="confirmSharing">
				{{ t('files_sharing', 'Confirm') }}
			</button>
		</template>
		<template v-else>
			<button class="status-buttons__primary primary"
				:name="randomId"
				:disabled="saving"
				@click="nextSharing">
				{{ t('files_sharing', 'Next') }}
			</button>
		</template>
	</ul>
</template>

<script>
import ActionRadio from '@nextcloud/vue/dist/Components/ActionRadio'
import ActionCheckbox from '@nextcloud/vue/dist/Components/ActionCheckbox'
import ActionInput from '@nextcloud/vue/dist/Components/ActionInput'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip'

import SharesMixin from '../mixins/SharesMixin'
import ShareTypes from '../mixins/ShareTypes'
import GeneratePassword from '../utils/GeneratePassword'
import Vue from 'vue'
import { mapGetters } from 'vuex'
import ShareRequests from '../mixins/ShareRequests'
import ExternalShareAction from './ExternalShareAction'

export default {
	name: 'SharingPermissions',

	components: {
		ActionRadio,
		ActionCheckbox,
		ActionInput,
		ExternalShareAction,
	},

	directives: {
		Tooltip,
	},

	mixins: [SharesMixin, ShareTypes, ShareRequests],

	data() {
		return {
			permissionsEdit: OC.PERMISSION_UPDATE,
			permissionsCreate: OC.PERMISSION_CREATE,
			permissionsDelete: OC.PERMISSION_DELETE,
			permissionsRead: OC.PERMISSION_READ,
			permissionsShare: OC.PERMISSION_SHARE,

			publicUploadRWValue: OC.PERMISSION_UPDATE | OC.PERMISSION_CREATE | OC.PERMISSION_READ | OC.PERMISSION_DELETE,
			publicUploadRValue: OC.PERMISSION_READ,
			publicUploadWValue: OC.PERMISSION_CREATE,
			publicUploadEValue: OC.PERMISSION_UPDATE | OC.PERMISSION_READ,
			show: true,
			showAdLink: true,
			sendPasswordByTalk: null,
			hideDownload: null,
			isAllowed:true,
			allowExtensions:["text/markdown","text/plain","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.openxmlformats-officedocument.presentationml.presentation"],
			shareLabel: this.share.newLabel || this.share.label || '',
			ExternalShareActions: OCA.Sharing.ExternalShareActions.state,
		}
	},
	beforeMount() {
		
		console.log("file extension : "+this.fileInfo.mimetype)
		if(this.allowExtensions.includes( this.fileInfo.mimetype)){
			this.isAllowed=false
		}
		console.log("is disabled : " + this.isAllowed)
	},

	computed: {
		...mapGetters({
			fromInput: 'getFromInput',
			optionValues: 'getOption'
		}),
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
		 * Generate a unique random id for this SharingPermissions only
		 * This allows ActionRadios to have the same name prop
		 * but not to impact others SharingPermissions
		 * @returns {string}
		 */
		randomId() {
			return Math.random().toString(27).substr(2)
		},

		canHaveExpirationDate() {
			return !this.isRemoteShare
		},

		/**
		 * Can the sharer set whether the sharee can reshare the file ?
		 *
		 * @returns {boolean}
		 */
		canSetReshare() {
			// If the owner revoked the permission after the resharer granted it
			// the share still has the permission, and the resharer is still
			// allowed to revoke it too (but not to grant it again).
			return (this.fileInfo.sharePermissions & OC.PERMISSION_SHARE) || this.canReshare
		},

		/**
		 * Can the sharee reshare the file ?
		 */
		canReshare: {
			get() {
				return this.share.hasSharePermission
			},
			set(checked) {
				this.updatePermissions({ isReshareChecked: checked, otherPermissions: this.sharePermissions })
			},
		},

		// if newPassword exists, but is empty, it means
		// the user deleted the original password
		hasUnsavedPassword() {
			return this.share.newPassword !== undefined
		},

		/**
		 * Is the current share a folder ?
		 * @returns {boolean}
		 */
		isFolder() {
			return this.fileInfo.type === 'dir'
		},

		/**
		 * Does the current share have an expiration date
		 * @returns {boolean}
		 */
		hasExpirationDate: {
			get() {
				return this.config.isDefaultInternalExpireDateEnforced || !!this.share.expireDate
			},
			set(enabled) {
				this.share.expireDate = enabled
					? (this.config.defaultInternalExpirationDateString !== ''
						? this.config.defaultInternalExpirationDateString
						: ' ')
					: ''
			},
		},

		/**
		 * Is the current share password protected ?
		 * @returns {boolean}
		 */
		isPasswordProtected: {
			get() {
				return this.config.enforcePasswordForPublicLink || !!this.share.password
			},
			async set(enabled) {
				// TODO: directly save after generation to make sure the share is always protected
				Vue.set(this.share, 'password', enabled ? await GeneratePassword() : '')
				Vue.set(this.share, 'newPassword', this.share.password)
			},
		},

		/**
		 * Does the current file/folder have create permissions
		 * TODO: move to a proper FileInfo model?
		 * @returns {boolean}
		 */
		fileHasCreatePermission() {
			return !!(this.fileInfo.permissions & OC.PERMISSION_CREATE)
		},

		isExteranlShare() {
			if (this.fromInput) {
				return Boolean(this.SHARE_TYPES.SHARE_TYPE_EMAIL === this.optionValues.shareType
				|| this.SHARE_TYPES.SHARE_TYPE_LINK === this.optionValues.shareType)
			} else {
				return Boolean(this.SHARE_TYPES.SHARE_TYPE_EMAIL === this.share.type
				|| this.SHARE_TYPES.SHARE_TYPE_LINK === this.share.type)
			}
		},

		externalLinkActions() {
			// filter only the registered actions for said link
			return this.ExternalShareActions.actions
				.filter(action => action.shareType.includes(OC.Share.SHARE_TYPE_LINK))
			// || action.shareType.includes(OC.Share.SHARE_TYPE_EMAIL))
		},

		isLinkShare() {
			return this.SHARE_TYPES.SHARE_TYPE_LINK === this.share.type
		},

		shareLabelPlaceholder() {
			return t('files_sharing', 'Share label')
		},
	},

	methods: {
		/**
		 * Update newPassword values
		 * of share. If password is set but not newPassword
		 * then the user did not changed the password
		 * If both co-exists, the password have changed and
		 * we show it in plain text.
		 * Then on submit (or menu close), we sync it.
		 * @param {string} password the changed password
		 */
		onPasswordChange(password) {
			console.debug('new password', password)
			this.$set(this.share, 'newPassword', password)
		},

		onPasswordDisable() {
			this.share.password = ''
			// reset password state after sync
			this.$delete(this.share, 'newPassword')
		},
		addPasswordProtectedByTalkChange(event) {
			this.share.sendPasswordByTalk = event.target.checked
		},

		addHideDownload(event) {
			this.share.hideDownload = event.target.checked
		},

		addExpirationDate(date) {
			// format to YYYY-MM-DD
			const value = moment(date).format('YYYY-MM-DD')
			this.share.expireDate = value
		},

		/**
		 * On permissions change
		 * @param {Event} event js event
		 */
		updatePermissions({ isReshareChecked = this.canReshare, otherPermissions = 0 } = {}) {
			// calc permissions if checked
			const permissions = 0
				| otherPermissions
				// | (isWrite ? isWrite : 0)
				// | (isReadOnly ? isReadOnly : 0)
				// | (isUpdateOnly ? isUpdateOnly : 0)
				| (isReshareChecked ? this.permissionsShare : 0)

			this.share.permissions = permissions
		},

		addPermissions(event) {
			let permissions = 0
			if (this.isExteranlShare) {
				permissions = parseInt(event.target.value, 10)
				if (permissions === OC.PERMISSION_CREATE) {
					this.share.hideDownload = false
				}
				this.share.permissions = permissions
			} else {
				permissions = parseInt(event.target.value, 10)
				| (this.canReshare ? this.permissionsShare : 0)
				this.share.permissions = permissions
			}
		},

		cancelSharing() {
			this.$store.commit('addCurrentTab', 'default')
		},

		nextSharing() {
			console.debug('next sharing', this.share)
			this.$store.commit('addShare', this.share)
			this.$store.commit('addCurrentTab', 'notes')
		},

		confirmSharing() {
			this.loading = true

			this.share.label = this.shareLabel.trim()

			if (this.share.sendPasswordByTalk) {
				this.sendPasswordByTalk = this.share.sendPasswordByTalk.toString()
			}

			if (this.share.hideDownload) {
				this.hideDownload = this.share.hideDownload.toString()
			} else {
				this.hideDownload = 'false'
			}

			if (this.share.newPassword !== undefined) {
				this.share.password = this.share.newPassword.trim()
			}

			this.updateShare(this.share.id, {
				permissions: this.share.permissions,
				hideDownload: this.hideDownload,
				password: this.share.password,
				expireDate: this.share.expireDate,
				label: this.share.label,
				sendPasswordByTalk: this.sendPasswordByTalk,
			})
			// this.$emit('add:share', this.share)
			this.loading = true
			this.$store.commit('addCurrentTab', 'default')
		},

		/**
		 * Is it possible to protect the password by Talk?
		 * @returns {boolean}
		 */
		isPasswordProtectedByTalkAvailable() {
			return this.isPasswordProtected && this.isTalkEnabled
		},

		canTogglePasswordProtectedByTalkAvailable() {
			if (!this.isPasswordProtected) {
				// Makes no sense
				return false
			} else if (this.isEmailShareType && !this.hasUnsavedPassword) {
				// For email shares we need a new password in order to enable or
				// disable
				return false
			}

			// Anything else should be fine
			return true
		},
	},
}
</script>
<style lang="scss">
.action-input__label {
	display: none !important;
}
.password-message {
	margin-left: 43px;
}
.readonly-message {
	margin-left: 43px;
}
.filedrop-message {
	margin-left: 43px;
}
</style>
