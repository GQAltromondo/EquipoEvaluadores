sap.ui.define([], function () {
	"use strict";
	return {

		getModel: function () {
			if (!this._model) {
				debugger;
                var appModel =sap.ui.getCore().getModel("appCurrentInfo")
				var mBaseUrl = appModel.getProperty("/appUrl")
				var url = mBaseUrl + "/destinations/SAP_Gateway/sap/opu/odata/sap/Z_SCP_HABILITACIONES_SRV/";
				this._model = new sap.ui.model.odata.v2.ODataModel(url, {
					useBatch: false
				});
			}
			return this._model;
		},

        getModelOp: function () {
			if (!this._model) {
				debugger;
				 var appModel =sap.ui.getCore().getModel("appCurrentInfo")
				var mBaseUrl = appModel.getProperty("/appUrl")
				var url = mBaseUrl + "/destinations/SAP_Gateway/sap/opu/odata/sap/Z_SCP_OPERACIONES_SRV/";
				this._model = new sap.ui.model.odata.v2.ODataModel(url, {
					useBatch: false
				});
			}
			return this._model;
		}
	};
});

