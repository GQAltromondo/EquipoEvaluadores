sap.ui.define([
	"transener/equipoevaluador/services/oDataService"
], function(oDataServices) {
	"use strict";

	return {

		LoadRegiones : function(empresa, onSuccessCallback, onErrorCallback) {	
			var filters = [];
			filters.push(new sap.ui.model.Filter("Empresa", sap.ui.model.FilterOperator.EQ, empresa));
			var odataModel = oDataServices.getModelOp();
			odataModel.read("/RegionesSet", {		
				filters: filters,
				success: onSuccessCallback,
				error: onErrorCallback
			});
		}
	};
});