/**
 * @copyright 2019 Christoph Wurst <christoph@winzerhof-wurst.at>
 * @copyright Copyright (c) 2019 Gary Kim <gary@garykim.dev>
 *
 * @author Bartek Przybylski <bart.p.pl@gmail.com>
 * @author Christopher Schäpers <kondou@ts.unde.re>
 * @author Christoph Wurst <christoph@winzerhof-wurst.at>
 * @author Daniel Calviño Sánchez <danxuliu@gmail.com>
 * @author Daniel Kesselberg <mail@danielkesselberg.de>
 * @author Florian Schunk <florian.schunk@rwth-aachen.de>
 * @author Gary Kim <gary@garykim.dev>
 * @author Hendrik Leppelsack <hendrik@leppelsack.de>
 * @author Jan-Christoph Borchardt <hey@jancborchardt.net>
 * @author Joas Schilling <coding@schilljs.com>
 * @author John Molakvoæ <skjnldsv@protonmail.com>
 * @author Jörn Friedrich Dreyer <jfd@butonic.de>
 * @author Julius Härtl <jus@bitgrid.net>
 * @author Loïc Hermann <loic.hermann@sciam.fr>
 * @author Morris Jobke <hey@morrisjobke.de>
 * @author Olivier Paroz <github@oparoz.com>
 * @author Robin Appelman <robin@icewind.nl>
 * @author Roeland Jago Douma <roeland@famdouma.nl>
 * @author Sujith Haridasan <Sujith_Haridasan@mentor.com>
 * @author Thomas Citharel <nextcloud@tcit.fr>
 * @author Thomas Müller <thomas.mueller@tmit.eu>
 * @author Thomas Tanghus <thomas@tanghus.net>
 * @author Vincent Petry <vincent@nextcloud.com>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* eslint-disable */
import _ from 'underscore'
import $ from 'jquery'

import OC from './index.js'
import OCA from '../OCA/index.js'
import { isA11yActivation } from '../Util/a11y.js'

/**
 * this class to ease the usage of jquery dialogs
 */

const DialogsCustomConflict = {

	_fileexistsshownConflictPreDlg: false,
	/**
	 * Displays file exists dialog
	 * @param {object} data upload object
	 * @param {object} original file with name, size and mtime
	 * @param {object} replacement file with name, size and mtime
	 * @param {object} controller with onContinueCustom, moreDetails, onSkip, onReplace and onRename methods
	 * @returns {Promise} jquery promise that resolves after the dialog template was loaded
	 */
	fileexistsConflictPreDlg: function (data, original, replacement, controller) {
		var self = this
		var dialogDeferred = new $.Deferred()
		var dialogName = 'oc-dialog-fileexists-content'
		var dialogId = '#' + dialogName
		var conflictCount = OC.conflictsData.length;
		if (!this._fileexistsshownConflictPreDlg) {
			var filename = OC.conflictsData[0][0].name
			//why, what based on size of data
			var why = t('core', "Do you want to replace it with files you're moving?")
			var what = conflictCount==1?t('core', 'The file {filename} already exist in the location.', {filename:filename}):t('core', 'The files already exist in the location.')
			// create dialog
			this._fileexistsshownConflictPreDlg = true
			$.when(this._getFileExistsTemplateConflictPreDlg()).then(function ($tmpl) {
				var title = conflictCount==1?t('core', 'File conflict'):t('core', '{conflictCount} File conflicts', {conflictCount:conflictCount})
				var $dlg = $tmpl.octemplate({
					dialog_name: dialogName,
					title: title,
					type: 'fileexists',

					allnewfiles: t('core', 'New Files'),
					allexistingfiles: t('core', 'Already existing files'),

					why: why,
					what: what
				})

				$('body').append($dlg)

				var buttonlist = [{
					text: t('core', 'Cancel'),
					classes: 'cancel oc-conflict-pre-dlg-button',
					click: function () {
						if (typeof controller.onCancel !== 'undefined') {
							controller.onCancel(data)
						}
						$(dialogId).ocdialogconflictpredlg('close')
						OC.conflictsData = null
					}
				},
				{
					text: conflictCount==1?t('core', 'Keep both files'):t('core', 'Keep both files for all'),
					classes: 'cancel oc-conflict-pre-dlg-button',
					click: function () {
						if (typeof controller.onContinueConflictPreDlg !== 'undefined') {
							controller.onContinueConflictPreDlg(true, true)
						}
						$(dialogId).ocdialogconflictpredlg('close')
					}
				},
				{
					text: conflictCount==1?t('core', 'Replace file'):t('core', 'Replace all files'),
					classes: 'cancel oc-conflict-pre-dlg-button oc-conflict-pre-dlg-replace-button',
					click: function () {
						if (typeof controller.onContinue !== 'undefined') {
							controller.onContinueConflictPreDlg(false, true)
						}
					 	$(dialogId).ocdialogconflictpredlg('close')
					}
				},
				]

				$(dialogId).ocdialogconflictpredlg({
					width: 288,
					closeOnEscape: true,
					modal: true,
					buttons: buttonlist,
					closeButton: null,
					close: function () {
						self._fileexistsshownConflictPreDlg = false
						try {
							$(this).ocdialogconflictpredlg('destroy').remove()
						} catch (e) {
							// ignore
						}
					}
				})

				$(dialogId).css('height', 'auto')

				//close ocdialogconflictpredlg

				$(".close-conflict-pre-dlg").on('click', function () {
					$(dialogId).ocdialogconflictpredlg('close')
					OC.conflictsData = null
				})

				dialogDeferred.resolve()
			})
				.fail(function () {
					dialogDeferred.reject()
					alert(t('core', 'Error loading file exists template'))
				})
		}
		return dialogDeferred.promise()
	},

	_getFileExistsTemplateConflictPreDlg: function () {
		var defer = $.Deferred()
		if (!this.$fileexistsTemplateConflictPreDlg) {
			var self = this
			$.get(OC.filePath('files', 'templates', 'fileexists-conflict-pre-dlg.html'), function (tmpl) {
				self.$fileexistsTemplateConflictPreDlg = $(tmpl)
				defer.resolve(self.$fileexistsTemplateConflictPreDlg)
			})
				.fail(function () {
					defer.reject()
				})
		} else {
			defer.resolve(this.$fileexistsTemplateConflictPreDlg)
		}
		return defer.promise()
	},	

}
export default DialogsCustomConflict
