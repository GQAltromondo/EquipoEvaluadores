sap.ui.define([
	"transener/equipoevaluador/services/oDataService"
], function(oDataService) {
	"use strict";

	return {

		LoadSearch: function(filter, onSuccessCallback, onErrorCallback) {
			var filters = [];
			
			// Si hay un filtro, crear filtros de búsqueda
			if (filter) {
				var oFilter = new sap.ui.model.Filter({
					filters: [
						new sap.ui.model.Filter("Nombre", sap.ui.model.FilterOperator.Contains, filter),
						new sap.ui.model.Filter("Apellido", sap.ui.model.FilterOperator.Contains, filter),
						new sap.ui.model.Filter("Legajo", sap.ui.model.FilterOperator.Contains, filter)
					],
					and: false
				});
				filters.push(oFilter);
			}
			
			var odataModel = oDataService.getModel();
			odataModel.read("/PersonalInternoMtoSet", {
				filters: filters,
				success: onSuccessCallback,
				error: onErrorCallback
			});
		}
	};
});