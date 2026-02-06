sap.ui.define([
	//libs
	"sap/m/MessageToast",
	"sap/m/MessageBox",
], function(MessageToast, MessageBox) {
	"use strict";

	return {

		showMessageToast: function(i18nMessage) {
			var m = i18nMessage;
			sap.m.MessageToast.show(m);
		},

		showAlert: function(i18nTitle, i18nMessage, fnOk, parameters) {
			var m = i18nMessage;
			var dialogAlert = new sap.m.Dialog({
				type: sap.m.DialogType.Message,
				title: i18nTitle,
				content: [
					new sap.m.Text({
						text: m
					}),
					new sap.m.FlexBox({
						justifyContent: sap.m.FlexJustifyContent.End,
						items: [
							new sap.m.Button({
								icon: "sap-icon://accept",
								press: function() {
									dialogAlert.close();
									dialogAlert.destroy();
									if (fnOk) {
										fnOk();
									}
								}
							})
						]
					})
				]
			}).addStyleClass("dialogCustom");
			dialogAlert.open();
		},

		showConfirm: function(i18nTitle, i18nMessage, fnOk) {
			var m = i18nMessage;
			var dialogConfirm = new sap.m.Dialog({
				title: i18nTitle,
				type: sap.m.DialogType.Message,
				buttons: [
					new sap.m.Button({
						icon: "sap-icon://accept",
						press: function() {
							dialogConfirm.close();
							dialogConfirm.destroy();
							if (fnOk) {
								fnOk();
							}
						}
					}),
					new sap.m.Button({
						icon: "sap-icon://decline",
						press: function() {
							dialogConfirm.close();
							dialogConfirm.destroy();
						}
					})
				],
				content: [
					new sap.m.Text({
						text: m
					})
				]
			}).addStyleClass("dialogCustom");
			dialogConfirm.open();
		}

		
	};
});