sap.ui.define([
	"transener/equipoevaluador/services/oDataService"
], function(oDataService) {
	"use strict";

	return {

		LoadSearch: function(filter, onSuccessCallback, onErrorCallback) {
			var filters = [];
			/*
			filters.push(new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter("Nombre", sap.ui.model.FilterOperator.EQ, filter),
					new sap.ui.model.Filter("Apellido", sap.ui.model.FilterOperator.EQ, filter),
					new sap.ui.model.Filter("Legajo", sap.ui.model.FilterOperator.EQ, filter)
				],
				and: false
			}));
			*/
			filters.push(new sap.ui.model.Filter("Nombre", sap.ui.model.FilterOperator.EQ, filter));
			filters.push(new sap.ui.model.Filter("Apellido", sap.ui.model.FilterOperator.EQ, filter));
			filters.push(new sap.ui.model.Filter("Legajo", sap.ui.model.FilterOperator.EQ, filter));
			
			var odataModel = oDataService.getModel();
			odataModel.read("/PersonalInternoMtoSet", {
				filters: filters,
				success: onSuccessCallback,
				error: onErrorCallback
			});
		}
	};
});