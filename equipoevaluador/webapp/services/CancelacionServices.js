sap.ui.define([
	"transener/equipoevaluador/services/oDataService"
], function(oDataServices) {
	"use strict";

	return {

		CancelarHabilitacion : function(data) {			
			var odataModel = oDataServices.getModel();
			odataModel.create("/CancelarHabilitacionSet", data);
		}
	};
});